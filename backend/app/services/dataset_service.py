"""Dataset registration, safe CSV upload, and loading.

Security: only .csv uploads, size/row/column limits, files stored under a server-generated
name inside the storage directory (no user-controlled paths), parsed with pandas only
(no code execution), and storage keys - not absolute paths - are returned to clients.
"""
from __future__ import annotations

import io
import re
import uuid
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.exceptions import AppError, NotFoundError, PayloadTooLargeError
from ..datasets_registry import BUILTIN, load_builtin
from ..ml.preprocessing import column_metadata
from ..models.entities import Dataset

_SAFE_NAME = re.compile(r"[^A-Za-z0-9 _().,-]+")


def _uploads_dir() -> Path:
    d = get_settings().storage_dir / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


@lru_cache(maxsize=16)
def _load_builtin_cached(key: str) -> pd.DataFrame:
    return load_builtin(key)


def _path_for_key(storage_key: str) -> Path:
    # storage keys are "uploads/<32 hex>.csv"; anything else is rejected (no traversal)
    if not re.fullmatch(r"uploads/[0-9a-f]{32}\.csv", storage_key):
        raise AppError("Invalid storage key.")
    return get_settings().storage_dir / storage_key


def load_frame(ds: Dataset) -> pd.DataFrame:
    if ds.file_path.startswith("builtin:"):
        return _load_builtin_cached(ds.file_path.split(":", 1)[1]).copy()
    return pd.read_csv(_path_for_key(ds.file_path))


async def seed_builtin(session: AsyncSession) -> None:
    for key, info in BUILTIN.items():
        if await session.get(Dataset, key) is not None:
            continue
        df = _load_builtin_cached(key)
        session.add(Dataset(id=key, name=info["name"], source=info["source"], description=info["description"],
                            origin=info["origin"], file_path=f"builtin:{key}", row_count=len(df),
                            column_metadata=column_metadata(df)))
    await session.commit()


async def list_datasets(session: AsyncSession) -> list[Dataset]:
    res = await session.execute(select(Dataset).order_by(Dataset.origin.desc(), Dataset.created_at))
    return list(res.scalars())


async def get_dataset(session: AsyncSession, dataset_id: str) -> Dataset:
    ds = await session.get(Dataset, dataset_id)
    if ds is None:
        raise NotFoundError(f"Dataset '{dataset_id}' not found.")
    return ds


def parse_csv_bytes(raw: bytes, filename: str) -> pd.DataFrame:
    s = get_settings()
    if not filename.lower().endswith(".csv"):
        raise AppError("Only .csv files are accepted.")
    if len(raw) > s.max_upload_mb * 1024 * 1024:
        raise PayloadTooLargeError(f"File is larger than {s.max_upload_mb} MB.")
    if not raw.strip():
        raise AppError("The file is empty.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    try:
        df = pd.read_csv(io.StringIO(text), sep=None, engine="python", nrows=s.max_rows + 1)
    except Exception as exc:  # pandas raises many parser error types
        raise AppError(f"Could not parse the CSV: {exc}") from exc
    if len(df) > s.max_rows:
        raise PayloadTooLargeError(f"Too many rows (max {s.max_rows}).")
    if df.shape[1] > s.max_columns:
        raise PayloadTooLargeError(f"Too many columns (max {s.max_columns}).")
    if df.shape[1] < 2 or len(df) < 3:
        raise AppError("A dataset needs at least 2 columns and 3 rows.")
    df.columns = [str(c).strip() or f"column_{i}" for i, c in enumerate(df.columns)]
    if len(set(df.columns)) != len(df.columns):
        raise AppError("Column names must be unique.")
    # drop index-like unnamed columns written by some tools
    df = df.loc[:, [c for c in df.columns if not c.lower().startswith("unnamed:")]]
    df = df.replace([np.inf, -np.inf], np.nan)
    return df


async def create_upload(session: AsyncSession, raw: bytes, filename: str, name: str | None,
                        description: str = "", source: str = "") -> Dataset:
    df = parse_csv_bytes(raw, filename)
    ds_id = uuid.uuid4().hex
    key = f"uploads/{ds_id}.csv"
    df.to_csv(_uploads_dir() / f"{ds_id}.csv", index=False)
    clean = _SAFE_NAME.sub("", (name or Path(filename).stem))[:120] or "Uploaded dataset"
    ds = Dataset(id=ds_id, name=clean, source=_SAFE_NAME.sub("", source)[:300] or "User upload",
                 description=description[:1000], origin="upload", file_path=key, row_count=len(df),
                 column_metadata=column_metadata(df))
    session.add(ds)
    await session.commit()
    await session.refresh(ds)
    return ds


def preview(ds: Dataset, limit: int = 20, offset: int = 0) -> dict:
    df = load_frame(ds)
    part = df.iloc[offset: offset + limit]
    rows = part.astype(object).where(part.notna(), None).to_dict(orient="records")
    return {"dataset_id": ds.id, "columns": list(df.columns), "rows": rows, "total_rows": len(df)}
