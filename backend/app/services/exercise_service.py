from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import NotFoundError
from ..exercises.registry import all_exercises, get_exercise
from ..models.entities import Exercise as ExerciseRow
from . import dataset_service


def find(exercise_id: str):
    try:
        return get_exercise(exercise_id)
    except KeyError:
        raise NotFoundError(f"Exercise '{exercise_id}' not found.")


async def sync_catalogue(session: AsyncSession) -> None:
    """Mirror the exercise catalogue into the database (content stays in code)."""
    for e in all_exercises():
        row = await session.get(ExerciseRow, e.id)
        values = dict(book=e.book, chapter=e.chapter, exercise_number=e.exercise_number, title=e.title,
                      category=e.category, source_page=e.source_page, description=e.description,
                      required_dataset=e.required_dataset, solution_reference=f"app.exercises:{e.id}")
        if row is None:
            session.add(ExerciseRow(id=e.id, **values))
        else:
            for k, v in values.items():
                setattr(row, k, v)
    await session.commit()


async def solve(session: AsyncSession, exercise_id: str, parameters: dict, dataset_id: str | None) -> dict:
    ex = find(exercise_id)
    params = dict(parameters)
    if dataset_id:
        ds = await dataset_service.get_dataset(session, dataset_id)
        params["_frame"] = dataset_service.load_frame(ds)
        params["dataset_id"] = dataset_id
    result = await asyncio.get_running_loop().run_in_executor(None, ex.solve, params)
    result["parameters"] = {k: v for k, v in result.get("parameters", {}).items() if not str(k).startswith("_")}
    return result


def explanation(exercise_id: str) -> dict:
    ex = find(exercise_id)
    return {"exercise_id": ex.id, "concepts": ex.concepts, "understand": ex.understand,
            "interpretation": ex.interpretation, "common_mistakes": ex.common_mistakes, "notes": ex.notes,
            "python_code": ex.python_code}


def similar(exercise_id: str) -> list[dict]:
    return [s.__dict__ for s in find(exercise_id).similar]
