"""REST API v1. Route handlers validate input and delegate to services; no ML code lives here."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import get_settings
from ...core.database import get_session, sessionmaker
from ...core.exceptions import AppError, NotFoundError, PayloadTooLargeError
from ...exercises.registry import all_exercises
from ...explainability import decision_tree_explainer, training_explainer
from ...models.entities import Prediction, TrainingRun
from ...schemas.api import (ComplexityLabRequest, ConfusionMatrixRequest, DatasetOut, DatasetPreview, ExerciseSummary,
                            ExperimentCreate, ExperimentOut, PracticeCheck, PredictionOut, PredictionRequest, RunDetail,
                            RunStatus, SolveRequest, TrainingStart)
from ...services import (dataset_service, evaluation_service, exercise_service, practice_service, training_engine,
                         training_service)

Session = Depends(get_session)

# ===================================================================== exercises
exercises = APIRouter(prefix="/exercises", tags=["exercises"])


@exercises.get("", response_model=list[ExerciseSummary], summary="List all textbook exercises")
async def list_exercises(book: str | None = None):
    return [e.summary() for e in all_exercises() if book is None or e.book.lower() == book.lower()]


@exercises.get("/{exercise_id}", summary="Exercise detail: question, explanation, code, parameters")
async def exercise_detail(exercise_id: str):
    return exercise_service.find(exercise_id).detail()


@exercises.post("/{exercise_id}/solve", summary="Solve the exercise (computed live for numerical/training exercises)")
async def solve_exercise(exercise_id: str, body: SolveRequest, session: AsyncSession = Session):
    return await exercise_service.solve(session, exercise_id, body.parameters, body.dataset_id)


@exercises.get("/{exercise_id}/explanation")
async def exercise_explanation(exercise_id: str):
    return exercise_service.explanation(exercise_id)


@exercises.get("/{exercise_id}/similar")
async def exercise_similar(exercise_id: str):
    return exercise_service.similar(exercise_id)


# ===================================================================== datasets
datasets = APIRouter(prefix="/datasets", tags=["datasets"])


@datasets.get("", response_model=list[DatasetOut])
async def list_datasets(session: AsyncSession = Session):
    return await dataset_service.list_datasets(session)


@datasets.post("/upload", response_model=DatasetOut, status_code=201,
               summary="Upload a CSV (max size/rows/columns enforced; parsed as data only)")
async def upload_dataset(file: UploadFile = File(...), name: str | None = Form(None), description: str = Form(""),
                         source: str = Form(""), session: AsyncSession = Session):
    limit = int(get_settings().max_upload_mb * 1024 * 1024)
    raw = await file.read(limit + 1)
    if len(raw) > limit:
        raise PayloadTooLargeError(f"File is larger than {get_settings().max_upload_mb} MB.")
    return await dataset_service.create_upload(session, raw, file.filename or "upload.csv", name, description, source)


@datasets.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(dataset_id: str, session: AsyncSession = Session):
    return await dataset_service.get_dataset(session, dataset_id)


@datasets.get("/{dataset_id}/preview", response_model=DatasetPreview)
async def preview_dataset(dataset_id: str, limit: int = Query(20, ge=1, le=500), offset: int = Query(0, ge=0),
                          session: AsyncSession = Session):
    return dataset_service.preview(await dataset_service.get_dataset(session, dataset_id), limit, offset)


@datasets.get("/{dataset_id}/columns")
async def dataset_columns(dataset_id: str, session: AsyncSession = Session):
    return (await dataset_service.get_dataset(session, dataset_id)).column_metadata


# ===================================================================== experiments
experiments = APIRouter(prefix="/experiments", tags=["experiments"])


@experiments.get("", response_model=list[ExperimentOut])
async def list_experiments(limit: int = Query(50, ge=1, le=500), session: AsyncSession = Session):
    return [training_service.experiment_dict(e) for e in await training_service.list_experiments(session, limit)]


@experiments.post("", response_model=ExperimentOut, status_code=201)
async def create_experiment(body: ExperimentCreate, session: AsyncSession = Session):
    return training_service.experiment_dict(await training_service.create_experiment(session, body))


@experiments.get("/{experiment_id}")
async def get_experiment(experiment_id: str, session: AsyncSession = Session):
    exp = await training_service.get_experiment(session, experiment_id)
    res = await session.execute(select(TrainingRun).where(TrainingRun.experiment_id == exp.id)
                                .order_by(TrainingRun.created_at.desc()))
    return {**training_service.experiment_dict(exp), "runs": [_status(r) for r in res.scalars()]}


# ===================================================================== training
training = APIRouter(prefix="/training", tags=["training"])


def _status(run: TrainingRun) -> dict:
    return {"run_id": run.id, "experiment_id": run.experiment_id, "status": run.status, "progress": run.progress,
            "error": run.error, "duration_ms": run.duration_ms, "created_at": run.created_at, "completed_at": run.completed_at}


@training.post("/start", response_model=RunStatus, status_code=202,
               summary="Start training. With wait=true the response is returned after training finishes.")
async def start_training(body: TrainingStart, wait: bool = Query(False), session: AsyncSession = Session):
    exp = (await training_service.get_experiment(session, body.experiment_id) if body.experiment_id
           else await training_service.create_experiment(session, body.experiment))
    run = await training_service.start_training(session, exp, wait=wait)
    return _status(run)


@training.get("/{run_id}/status", response_model=RunStatus)
async def training_status(run_id: str, session: AsyncSession = Session):
    return _status(await training_service.get_run(session, run_id))


@training.get("/{run_id}", response_model=RunDetail, summary="Run with metrics and model summary")
async def training_detail(run_id: str, session: AsyncSession = Session):
    run = await training_service.get_run(session, run_id)
    exp = await training_service.get_experiment(session, run.experiment_id)
    return {**_status(run), "experiment": training_service.experiment_dict(exp), "metrics": run.metrics,
            "model_summary": run.model_summary}


@training.get("/{run_id}/history")
async def training_history(run_id: str, session: AsyncSession = Session):
    run = await _completed(session, run_id)
    return run.training_history


@training.get("/{run_id}/metrics")
async def training_metrics(run_id: str, session: AsyncSession = Session):
    return (await _completed(session, run_id)).metrics


@training.websocket("/{run_id}/ws")
async def training_ws(websocket: WebSocket, run_id: str):
    """Pushes status changes until the run finishes (polling endpoint is the fallback)."""
    await websocket.accept()
    last = None
    try:
        for _ in range(int(get_settings().training_timeout_s * 4) + 40):
            async with sessionmaker()() as s:
                run = await s.get(TrainingRun, run_id)
                if run is None:
                    await websocket.send_json({"error": "not_found"})
                    break
                state = (run.status, run.progress)
                if state != last:
                    await websocket.send_json({"run_id": run_id, "status": run.status, "progress": run.progress, "error": run.error})
                    last = state
                if run.status in ("COMPLETED", "FAILED"):
                    break
            await asyncio.sleep(0.25)
    except WebSocketDisconnect:
        return
    await websocket.close()


async def _completed(session, run_id) -> TrainingRun:
    run = await training_service.get_run(session, run_id)
    if run.status != "COMPLETED":
        raise AppError(f"Run is {run.status}." + (f" Error: {run.error}" if run.error else ""))
    return run


# ===================================================================== predictions
predictions = APIRouter(prefix="/predictions", tags=["predictions"])


@predictions.post("", response_model=PredictionOut, status_code=201)
async def predict(body: PredictionRequest, session: AsyncSession = Session):
    run = await training_service.get_run(session, body.run_id)
    model = await training_service.get_model(session, run)
    out = training_engine.predict(model, body.inputs)
    out = training_service._jsonable(out)
    row = Prediction(training_run_id=run.id, input_values=training_service._jsonable(body.inputs),
                     predicted_value={"value": out["prediction"], "probabilities": out["probabilities"]})
    session.add(row)
    await session.commit()
    return {"id": row.id, "run_id": run.id, **out}


# ===================================================================== evaluation
evaluation = APIRouter(prefix="/evaluation", tags=["evaluation"])


@evaluation.post("/confusion-matrix", summary="Metrics from user-supplied TP/FP/FN/TN counts")
async def confusion_matrix(body: ConfusionMatrixRequest):
    return evaluation_service.confusion_matrix_metrics(body.tp, body.fp, body.fn, body.tn,
                                                       body.positive_label, body.negative_label)


@evaluation.post("/complexity", summary="Train decision trees of increasing depth; train vs test performance")
async def complexity_lab(body: ComplexityLabRequest, session: AsyncSession = Session):
    ds = await dataset_service.get_dataset(session, body.dataset_id)
    df = dataset_service.load_frame(ds)
    task = body.task
    if task is None:
        col = next((c for c in ds.column_metadata if c["name"] == body.target_column), None)
        if col is None:
            raise NotFoundError(f"Column '{body.target_column}' not found.")
        task = "classification" if col["kind"] == "categorical" or col["unique"] <= 2 else "regression"
    return await asyncio.get_running_loop().run_in_executor(
        None, lambda: evaluation_service.complexity_curve(df, body.feature_columns, body.target_column, task, body.depths,
                                                          test_size=body.test_size, seed=body.random_seed,
                                                          min_samples_split=body.min_samples_split))


@evaluation.get("/{run_id}")
async def run_evaluation(run_id: str, session: AsyncSession = Session):
    run = await _completed(session, run_id)
    return {"run_id": run.id, **(run.metrics or {})}


# ===================================================================== explanations
explanations = APIRouter(prefix="/explanations", tags=["explanations"])


@explanations.get("/{run_id}", summary="Plain-language explanation built from the run's recorded values")
async def explain(run_id: str, session: AsyncSession = Session):
    run = await _completed(session, run_id)
    exp = await training_service.get_experiment(session, run.experiment_id)
    return {"run_id": run.id, "formulas": run.model_summary.get("formulas"),
            **training_explainer.explain_run(training_service.experiment_dict(exp), run.metrics, run.model_summary,
                                             run.training_history)}


@explanations.get("/{run_id}/steps", summary="Recorded training steps (gradient descent iterations or tree splits)")
async def explain_steps(run_id: str, start: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=5000),
                        iteration_index: int | None = Query(None, ge=0), session: AsyncSession = Session):
    run = await _completed(session, run_id)
    h = run.training_history
    if h["type"] == "gradient_descent":
        if iteration_index is not None:
            try:
                return training_explainer.gradient_descent_iteration(h, iteration_index)
            except IndexError as e:
                raise AppError(str(e))
        return training_explainer.gradient_descent_steps(h, start, limit)
    if h["type"] == "tree_growth":
        return {"type": "tree_growth", "splits": decision_tree_explainer.explain_splits(run.model_summary["tree"])}
    return h


@explanations.get("/{run_id}/decision-rules")
async def decision_rules(run_id: str, session: AsyncSession = Session):
    run = await _completed(session, run_id)
    if run.model_summary.get("algorithm") != "decision_tree":
        raise AppError("Decision rules exist only for decision-tree runs.")
    return {"rules": run.model_summary["rules"], "tree": run.model_summary["tree"]}


# ===================================================================== practice
practice = APIRouter(prefix="/practice", tags=["practice"])


@practice.get("/categories")
async def practice_categories():
    return {"categories": practice_service.CATEGORIES, "difficulties": practice_service.DIFFICULTIES}


@practice.get("/{category}/new")
async def practice_new(category: str, difficulty: str = "beginner", seed: int | None = Query(None, ge=0, le=999_999_999)):
    import secrets
    seed = seed if seed is not None else secrets.randbelow(10**9)
    return practice_service.public(practice_service.generate(category, difficulty, seed))


@practice.post("/check")
async def practice_check(body: PracticeCheck):
    return practice_service.check(body.problem_id, body.answers)


ROUTERS = [exercises, datasets, experiments, training, predictions, evaluation, explanations, practice]
