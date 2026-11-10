"""Common structure for textbook exercises.

`origin` distinguishes official textbook items ("textbook") from items the app adds
("supplementary"). Similar problems are always supplementary and labelled as such.
Every numeric answer in `solve()` is computed at call time from data or counts.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Question:
    id: str
    prompt: str
    answer: Any = None            # filled statically (conceptual) or by solve() (computed)
    explanation: str = ""


@dataclass
class SimilarProblem:
    prompt: str
    answer: str
    explanation: str
    origin: str = "supplementary"


@dataclass
class Exercise:
    id: str
    book: str                     # "DS4A" | "HoIDS"
    chapter: int
    exercise_number: str          # e.g. "AC 3" or "TiY 8.1"
    title: str
    category: str
    source_page: str
    kind: str                     # "conceptual" | "computational" | "training"
    description: str
    required_dataset: str | None
    concepts: list[str]
    understand: str
    questions: list[Question]
    interpretation: str
    common_mistakes: list[str]
    python_code: str
    similar: list[SimilarProblem]
    parameters: dict = field(default_factory=dict)   # interactive inputs and their defaults
    solver: Callable[[dict], dict] | None = None
    origin: str = "textbook"
    notes: list[str] = field(default_factory=list)   # discrepancies, errata, data notes

    def summary(self) -> dict:
        return {k: getattr(self, k) for k in (
            "id", "book", "chapter", "exercise_number", "title", "category", "source_page",
            "kind", "required_dataset", "origin")}

    def detail(self) -> dict:
        d = self.summary()
        d.update(
            description=self.description, concepts=self.concepts, understand=self.understand,
            questions=[q.__dict__ for q in self.questions], interpretation=self.interpretation,
            common_mistakes=self.common_mistakes, python_code=self.python_code,
            parameters=self.parameters, notes=self.notes,
        )
        return d

    def solve(self, params: dict | None = None) -> dict:
        params = {**self.parameters, **(params or {})}
        if self.solver is None:
            return {"exercise_id": self.id, "parameters": params,
                    "answers": [{"id": q.id, "prompt": q.prompt, "answer": q.answer,
                                 "explanation": q.explanation} for q in self.questions],
                    "steps": [], "computed": False}
        out = self.solver(params)
        out.setdefault("exercise_id", self.id)
        out.setdefault("parameters", params)
        out["computed"] = True
        return out
