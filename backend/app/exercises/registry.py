"""Single source of truth for all exercises exposed by the API."""
from .base import Exercise
from .ds4a import computed, conceptual
from .hoids import chapter8, chapter8_problems

_ALL: list[Exercise] = [
    *sorted([*conceptual.EXERCISES, *computed.EXERCISES], key=lambda e: int(e.exercise_number.split()[-1])),
    *sorted([*chapter8.EXERCISES, *chapter8_problems.EXERCISES], key=lambda e: (e.exercise_number.split()[0], e.exercise_number)),
]
REGISTRY: dict[str, Exercise] = {e.id: e for e in _ALL}


def all_exercises() -> list[Exercise]:
    return list(_ALL)


def get_exercise(exercise_id: str) -> Exercise:
    return REGISTRY[exercise_id]
