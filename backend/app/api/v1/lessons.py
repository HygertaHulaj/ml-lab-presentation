"""Cinematic-lesson API. Registered BEFORE routes.py so that GET /datasets/iris is not captured by GET /datasets/{id}."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_session
from ...schemas.lessons import KMeansRequest, ProgressIn, SaveExperimentIn, SimulationOut
from ...services import simulation_service as svc

Session = Depends(get_session)
router = APIRouter(tags=["lessons"])


@router.get("/datasets/iris", summary="The real Iris dataset (150 × 4); species only for later comparison")
async def iris():
    return svc.iris_payload()


def _sim_out(sim, cached: bool) -> dict:
    trace = dict(sim.trace)
    trace["summary"] = svc.summarize(trace)
    return {"id": sim.id, "algorithm": sim.algorithm, "config": sim.config, "cached": cached, "trace": trace,
            "created_at": sim.created_at}


@router.post("/simulations/kmeans", response_model=SimulationOut, status_code=201,
             summary="Run transparent K-Means and return the full execution trace (cached by configuration)")
async def kmeans(body: KMeansRequest, session: AsyncSession = Session):
    sim, cached = await svc.create_kmeans(session, body)
    return _sim_out(sim, cached)


@router.get("/simulations/{simulation_id}", response_model=SimulationOut)
async def get_simulation(simulation_id: str, session: AsyncSession = Session):
    return _sim_out(await svc.get_simulation(session, simulation_id), True)


@router.post("/simulations/{simulation_id}/save", status_code=201, summary="Save a simulation as a named experiment")
async def save(simulation_id: str, body: SaveExperimentIn, session: AsyncSession = Session):
    row = await svc.save_experiment(session, simulation_id, body)
    return {"id": row.id, "name": row.name, "simulation_id": row.simulation_id, "created_at": row.created_at}


@router.get("/saved-experiments", summary="A learner's saved experiments, for comparison")
async def saved(learner_id: str = Query(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"), session: AsyncSession = Session):
    return await svc.list_experiments(session, learner_id)


@router.get("/lessons/{lesson_id}", summary="Lesson manifest: objectives, scenes, narration, math, controls, exercises")
async def lesson(lesson_id: str, session: AsyncSession = Session):
    return await svc.get_lesson(session, lesson_id)


@router.post("/progress", summary="Store a learner's position in a lesson")
async def progress(body: ProgressIn, session: AsyncSession = Session):
    row = await svc.save_progress(session, body)
    return {"lesson_id": row.lesson_id, "scene_id": row.scene_id, "position": row.position, "mode": row.mode,
            "completed_scenes": row.completed_scenes, "simulation_id": row.simulation_id, "updated_at": row.updated_at}


@router.get("/progress", summary="Read a learner's position in a lesson")
async def read_progress(learner_id: str = Query(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
                        lesson_id: str = Query(min_length=1, max_length=64), session: AsyncSession = Session):
    row = await svc.get_progress(session, learner_id, lesson_id)
    if row is None:
        return None
    return {"lesson_id": row.lesson_id, "scene_id": row.scene_id, "position": row.position, "mode": row.mode,
            "completed_scenes": row.completed_scenes, "simulation_id": row.simulation_id, "updated_at": row.updated_at}


# ---------------------------------------------------------------- linear regression by gradient descent (Shah Ch. 8 lessons)
from functools import lru_cache as _lru_cache  # noqa: E402
import json as _json  # noqa: E402

from pydantic import BaseModel, Field  # noqa: E402


class CompareModel(BaseModel):
    label: str = Field(max_length=80)
    predictors: list[str] = Field(min_length=1, max_length=10)


class LinRegGDRequest(BaseModel):
    dataset: str = Field(max_length=64)
    predictors: list[str] = Field(min_length=1, max_length=10)
    response: str = Field(max_length=64)
    shown: list[str] | None = Field(default=None, max_length=2)
    learning_rate: float = Field(default=0.1, gt=0, le=5)
    iterations: int = Field(default=5000, ge=1, le=20000)
    label_column: str | None = None
    compare: list[CompareModel] | None = Field(default=None, max_length=6)
    complete_on: list[str] | None = Field(default=None, max_length=10)
    rank_single: list[str] | None = Field(default=None, max_length=10)


@_lru_cache(maxsize=64)
def _linreg_cached(key: str) -> dict:
    from ...datasets_registry import BUILTIN, load_builtin
    from ...ml.linreg_gd import linreg_gd_trace
    cfg = _json.loads(key)
    if cfg["dataset"] not in BUILTIN:
        raise ValueError(f"Unknown dataset '{cfg['dataset']}'.")
    df = load_builtin(cfg.pop("dataset"))
    return linreg_gd_trace(df, **cfg)


@router.post("/simulations/linreg-gd", summary="Linear regression found by gradient descent, recorded frame by frame (Shah Ch. 8 lessons)")
def linreg_gd(body: LinRegGDRequest):
    cfg = body.model_dump()
    key = _json.dumps(cfg, sort_keys=True)
    return {"algorithm": "linreg_gd", "config": cfg, "trace": _linreg_cached(key)}
