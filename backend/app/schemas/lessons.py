from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

IRIS_FEATURES = ("sepal_length_cm", "sepal_width_cm", "petal_length_cm", "petal_width_cm")


class KMeansRequest(BaseModel):
    dataset: Literal["iris"] = "iris"
    features: list[str] = Field(default_factory=lambda: ["sepal_length_cm", "sepal_width_cm"], min_length=1, max_length=4)
    k: int = Field(3, ge=1, le=10)
    init: Literal["k-means++", "random"] = "k-means++"
    seed: int = Field(7, ge=0, le=99_999)
    max_iter: int = Field(50, ge=1, le=300)
    tol: float = Field(1e-6, ge=0, le=10)
    standardize: bool = False

    @field_validator("features")
    @classmethod
    def _features(cls, v: list[str]) -> list[str]:
        bad = [f for f in v if f not in IRIS_FEATURES]
        if bad:
            raise ValueError(f"Unknown feature(s) {bad}. Choose from {list(IRIS_FEATURES)}.")
        if len(set(v)) != len(v):
            raise ValueError("Features must be distinct.")
        return v


class SimulationOut(BaseModel):
    id: str
    algorithm: str
    config: dict[str, Any]
    cached: bool
    trace: dict[str, Any]
    created_at: datetime


class ProgressIn(BaseModel):
    learner_id: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    lesson_id: str = Field(min_length=1, max_length=64)
    scene_id: str = Field(min_length=1, max_length=64)
    position: float = Field(ge=0, le=100_000)
    mode: Literal["story", "lab", "math"] = "story"
    completed_scenes: list[str] = Field(default_factory=list, max_length=50)
    simulation_id: str | None = None


class SaveExperimentIn(BaseModel):
    learner_id: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    lesson_id: str = "kmeans-iris"
    name: str = Field(min_length=1, max_length=120)
