"""Simulation orchestration: dataset → validated config → deterministic K-Means trace, cached by config hash."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from functools import lru_cache

import numpy as np
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import NotFoundError
from ..datasets_registry import load_builtin
from ..lessons.kmeans_iris import LESSON
from ..lessons.shah_ch8 import LESSONS as SHAH_LESSONS
from ..ml.kmeans import run_kmeans
from ..models.lessons import Lesson, LessonProgress, SavedExperiment, Simulation
from ..schemas.lessons import KMeansRequest, ProgressIn, SaveExperimentIn

log = logging.getLogger("mllab.simulations")
ENGINE_VERSION = "kmeans-trace-2"   # bump when the trace format or algorithm changes (invalidates the cache)
LESSONS = {LESSON["id"]: LESSON, **{m["id"]: m for m in SHAH_LESSONS}}


@lru_cache(maxsize=1)
def iris_frame():
    return load_builtin("iris")


def iris_payload() -> dict:
    df = iris_frame()
    feats = [c for c in df.columns if c != "species"]
    return {
        "id": "iris", "name": "Iris (Fisher, 1936)", "n": len(df), "features": feats, "units": "cm",
        "observations": df[feats].round(4).values.tolist(),
        "comparison_labels": df["species"].tolist(),
        "classes": sorted(df["species"].unique().tolist()),
        "note": "Species are provided only for the final comparison; K-Means never uses them.",
    }


def config_hash(cfg: KMeansRequest) -> str:
    raw = json.dumps({"engine": ENGINE_VERSION, **cfg.model_dump()}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def compute_kmeans(cfg: KMeansRequest) -> dict:
    df = iris_frame()
    X = df[cfg.features].to_numpy(float)
    scaling = None
    if cfg.standardize:
        mu, sd = X.mean(axis=0), X.std(axis=0)
        X = (X - mu) / sd
        scaling = {"method": "z-score", "means": mu.tolist(), "sds": sd.tolist()}
    trace = run_kmeans(X, cfg.k, init=cfg.init, seed=cfg.seed, max_iter=cfg.max_iter, tol=cfg.tol,
                       features=cfg.features).to_dict()
    trace["scaling"] = scaling
    trace["comparison_labels"] = df["species"].tolist()   # for the results scene only
    trace["classes"] = sorted(df["species"].unique().tolist())
    trace["engine_version"] = ENGINE_VERSION
    return trace


async def create_kmeans(session: AsyncSession, cfg: KMeansRequest) -> tuple[Simulation, bool]:
    h = config_hash(cfg)
    existing = (await session.execute(select(Simulation).where(Simulation.config_hash == h))).scalar_one_or_none()
    if existing is not None:
        return existing, True
    trace = await asyncio.get_running_loop().run_in_executor(None, compute_kmeans, cfg)
    sim = Simulation(algorithm="kmeans", config_hash=h, config=cfg.model_dump(), trace=trace)
    session.add(sim)
    try:
        await session.commit()
    except IntegrityError:          # the same config was stored concurrently
        await session.rollback()
        sim = (await session.execute(select(Simulation).where(Simulation.config_hash == h))).scalar_one()
        return sim, True
    await session.refresh(sim)
    log.info("kmeans simulation %s: k=%s features=%s iterations=%s stop=%s", sim.id, cfg.k, cfg.features,
             len(trace["iterations"]), trace["stop_reason"])
    return sim, False


async def get_simulation(session: AsyncSession, sim_id: str) -> Simulation:
    sim = await session.get(Simulation, sim_id)
    if sim is None:
        raise NotFoundError(f"Simulation '{sim_id}' not found.")
    return sim


async def sync_lessons(session: AsyncSession) -> None:
    for lid, manifest in LESSONS.items():
        row = await session.get(Lesson, lid)
        if row is None:
            session.add(Lesson(id=lid, title=manifest["title"], algorithm=manifest["algorithm"],
                               version=manifest["version"], manifest=manifest))
        elif row.version != manifest["version"] or row.manifest != manifest:
            row.title, row.version, row.manifest = manifest["title"], manifest["version"], manifest
    await session.commit()


async def get_lesson(session: AsyncSession, lesson_id: str) -> dict:
    row = await session.get(Lesson, lesson_id)
    if row is None:
        raise NotFoundError(f"Lesson '{lesson_id}' not found.")
    return row.manifest


async def save_progress(session: AsyncSession, p: ProgressIn) -> LessonProgress:
    await get_lesson(session, p.lesson_id)
    if p.simulation_id:
        await get_simulation(session, p.simulation_id)
    row = (await session.execute(select(LessonProgress).where(
        LessonProgress.learner_id == p.learner_id, LessonProgress.lesson_id == p.lesson_id))).scalar_one_or_none()
    if row is None:
        row = LessonProgress(learner_id=p.learner_id, lesson_id=p.lesson_id)
        session.add(row)
    row.scene_id, row.position, row.mode, row.simulation_id = p.scene_id, p.position, p.mode, p.simulation_id
    row.completed_scenes = sorted(set((row.completed_scenes or []) + p.completed_scenes))
    await session.commit()
    await session.refresh(row)
    return row


async def get_progress(session: AsyncSession, learner_id: str, lesson_id: str) -> LessonProgress | None:
    return (await session.execute(select(LessonProgress).where(
        LessonProgress.learner_id == learner_id, LessonProgress.lesson_id == lesson_id))).scalar_one_or_none()


async def save_experiment(session: AsyncSession, sim_id: str, body: SaveExperimentIn) -> SavedExperiment:
    await get_simulation(session, sim_id)
    await get_lesson(session, body.lesson_id)
    row = SavedExperiment(learner_id=body.learner_id, lesson_id=body.lesson_id, simulation_id=sim_id, name=body.name)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def list_experiments(session: AsyncSession, learner_id: str) -> list[dict]:
    rows = (await session.execute(select(SavedExperiment, Simulation).join(Simulation, Simulation.id == SavedExperiment.simulation_id)
                                  .where(SavedExperiment.learner_id == learner_id)
                                  .order_by(SavedExperiment.created_at.desc()))).all()
    return [{"id": e.id, "name": e.name, "simulation_id": s.id, "config": s.config,
             "final_inertia": s.trace["final_inertia"], "iterations": len(s.trace["iterations"]),
             "stop_reason": s.trace["stop_reason"], "created_at": e.created_at} for e, s in rows]


def summarize(trace: dict) -> dict:
    labels = np.asarray(trace["final_labels"])
    species = np.asarray(trace["comparison_labels"])
    table = {c: {int(j): int(np.sum((species == c) & (labels == j))) for j in range(trace["k"])} for c in trace["classes"]}
    return {"crosstab_species_by_cluster": table}
