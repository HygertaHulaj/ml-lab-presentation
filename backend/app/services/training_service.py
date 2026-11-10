"""Training orchestration: persists experiments/runs, runs training in a bounded thread pool so
the event loop is never blocked, keeps fitted models in an in-memory LRU cache, and
re-trains deterministically (same data, config and seed) if a cached model is gone.

Fitted models are never pickled to disk, so no untrusted serialized model is ever loaded.
A JSON "model card" (summary only) is written to storage for record keeping.
"""
from __future__ import annotations

import asyncio
import json
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.database import sessionmaker
from ..core.exceptions import AppError, NotFoundError
from ..models.entities import Experiment, TrainingRun
from ..schemas.api import ExperimentCreate
from . import dataset_service, training_engine
from .training_engine import TrainedModel, TrainingConfig

_settings = get_settings()
_executor = ThreadPoolExecutor(max_workers=_settings.max_concurrent_trainings, thread_name_prefix="train")
_semaphore: asyncio.Semaphore | None = None
_cache: OrderedDict[str, TrainedModel] = OrderedDict()
_tasks: set[asyncio.Task] = set()


def _sem() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(_settings.max_concurrent_trainings)
    return _semaphore


def _cache_put(run_id: str, model: TrainedModel) -> None:
    _cache[run_id] = model
    _cache.move_to_end(run_id)
    while len(_cache) > _settings.model_cache_size:
        _cache.popitem(last=False)


def config_from(exp: Experiment) -> TrainingConfig:
    hp = dict(exp.hyperparameters or {})
    pos = hp.pop("_positive_label", None)
    return TrainingConfig(algorithm=exp.algorithm, task=exp.task, target=exp.target_column,
                          features=list(exp.feature_columns), hyperparameters=hp, test_size=exp.test_size,
                          random_seed=exp.random_seed, positive_label=pos)


async def create_experiment(session: AsyncSession, data: ExperimentCreate) -> Experiment:
    ds = await dataset_service.get_dataset(session, data.dataset_id)
    cols = {c["name"]: c for c in ds.column_metadata}
    unknown = [c for c in [data.target_column, *data.feature_columns] if c not in cols]
    if unknown:
        raise AppError(f"Unknown column(s) for dataset '{ds.name}': {unknown}")
    task = data.task
    if task is None:
        tcol = cols[data.target_column]
        task = "classification" if tcol["kind"] == "categorical" or tcol["unique"] <= 2 else "regression"
    hp = dict(data.hyperparameters)
    if data.positive_label is not None:
        hp["_positive_label"] = data.positive_label
    exp = Experiment(dataset_id=ds.id, name=data.name or f"{data.algorithm} → {data.target_column}",
                     algorithm=data.algorithm, task=task, target_column=data.target_column,
                     feature_columns=data.feature_columns, hyperparameters=hp, test_size=data.test_size,
                     random_seed=data.random_seed, status="CREATED")
    session.add(exp)
    await session.commit()
    await session.refresh(exp)
    return exp


async def get_experiment(session: AsyncSession, exp_id: str) -> Experiment:
    exp = await session.get(Experiment, exp_id)
    if exp is None:
        raise NotFoundError(f"Experiment '{exp_id}' not found.")
    return exp


async def list_experiments(session: AsyncSession, limit: int = 50) -> list[Experiment]:
    res = await session.execute(select(Experiment).order_by(Experiment.created_at.desc()).limit(limit))
    return list(res.scalars())


async def get_run(session: AsyncSession, run_id: str) -> TrainingRun:
    run = await session.get(TrainingRun, run_id)
    if run is None:
        raise NotFoundError(f"Training run '{run_id}' not found.")
    return run


async def start_training(session: AsyncSession, exp: Experiment, *, wait: bool) -> TrainingRun:
    run = TrainingRun(experiment_id=exp.id, status="PENDING", progress=0.0)
    session.add(run)
    exp.status = "TRAINING"
    await session.commit()
    await session.refresh(run)
    ds = await dataset_service.get_dataset(session, exp.dataset_id)
    df = dataset_service.load_frame(ds)
    cfg = config_from(exp)
    coro = _execute(run.id, exp.id, df, cfg)
    if wait:
        await coro
        await session.refresh(run)
    else:
        task = asyncio.create_task(coro)
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
    return run


async def _execute(run_id: str, exp_id: str, df, cfg: TrainingConfig) -> None:
    sm = sessionmaker()
    async with _sem():
        async with sm() as s:
            run = await s.get(TrainingRun, run_id)
            run.status, run.progress = "RUNNING", 0.05
            await s.commit()
        loop = asyncio.get_running_loop()
        try:
            out = await asyncio.wait_for(loop.run_in_executor(_executor, training_engine.train, df, cfg),
                                         timeout=_settings.training_timeout_s)
        except Exception as exc:  # report every failure on the run instead of crashing
            msg = f"Training timed out after {_settings.training_timeout_s}s." if isinstance(exc, asyncio.TimeoutError) else str(exc)
            async with sm() as s:
                run = await s.get(TrainingRun, run_id)
                run.status, run.error, run.completed_at = "FAILED", msg, datetime.now(timezone.utc)
                exp = await s.get(Experiment, exp_id)
                exp.status = "FAILED"
                await s.commit()
            return
        _cache_put(run_id, out.model)
        card_key = _write_model_card(run_id, cfg, out.summary)
        async with sm() as s:
            run = await s.get(TrainingRun, run_id)
            run.status, run.progress = "COMPLETED", 1.0
            run.metrics, run.training_history, run.model_summary = _jsonable(out.metrics), _jsonable(out.history), _jsonable(out.summary)
            run.model_artifact_path, run.duration_ms = card_key, out.duration_ms
            run.completed_at = datetime.now(timezone.utc)
            exp = await s.get(Experiment, exp_id)
            exp.status = "COMPLETED"
            await s.commit()


def _jsonable(obj):
    """Round-trip through JSON so NaN/inf become null and numpy types become Python types."""
    import math

    def clean(o):
        if isinstance(o, float):
            return None if (math.isnan(o) or math.isinf(o)) else o
        if isinstance(o, dict):
            return {str(k): clean(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [clean(v) for v in o]
        if hasattr(o, "item"):
            return clean(o.item())
        return o
    return clean(obj)


def _write_model_card(run_id: str, cfg: TrainingConfig, summary: dict) -> str:
    d = _settings.storage_dir / "models"
    d.mkdir(parents=True, exist_ok=True)
    card = {"run_id": run_id, "config": cfg.__dict__, "summary": _jsonable(summary),
            "note": "Summary only. Fitted models are kept in memory and re-trained deterministically when needed; no pickles are stored."}
    (d / f"{run_id}.json").write_text(json.dumps(card, indent=2, default=str), encoding="utf-8")
    return f"models/{run_id}.json"


async def get_model(session: AsyncSession, run: TrainingRun) -> TrainedModel:
    if run.status != "COMPLETED":
        raise AppError(f"Run is {run.status}; only completed runs can predict.")
    if run.id in _cache:
        _cache.move_to_end(run.id)
        return _cache[run.id]
    exp = await get_experiment(session, run.experiment_id)
    ds = await dataset_service.get_dataset(session, exp.dataset_id)
    df = dataset_service.load_frame(ds)
    out = await asyncio.get_running_loop().run_in_executor(_executor, training_engine.train, df, config_from(exp))
    _cache_put(run.id, out.model)
    return out.model


def experiment_dict(exp: Experiment) -> dict:
    return {"id": exp.id, "dataset_id": exp.dataset_id, "name": exp.name, "algorithm": exp.algorithm, "task": exp.task,
            "target_column": exp.target_column, "feature_columns": exp.feature_columns,
            "hyperparameters": {k: v for k, v in (exp.hyperparameters or {}).items() if not k.startswith("_")},
            "positive_label": (exp.hyperparameters or {}).get("_positive_label"),
            "test_size": exp.test_size, "random_seed": exp.random_seed, "status": exp.status, "created_at": exp.created_at}
