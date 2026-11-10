"""Pydantic v2 request/response contracts. Numbers are returned as structured data, never HTML."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Algorithm = Literal["linear_regression", "logistic_regression", "decision_tree", "gradient_descent"]
Task = Literal["classification", "regression"]


# ----------------------------------------------------------------- datasets
class ColumnInfo(BaseModel):
    name: str
    dtype: str
    kind: Literal["numeric", "categorical"]
    missing: int
    unique: int
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    top_values: dict[str, int] | None = None


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    source: str
    description: str
    origin: str
    row_count: int
    column_metadata: list[ColumnInfo]
    created_at: datetime


class DatasetPreview(BaseModel):
    dataset_id: str
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int


# ----------------------------------------------------------------- experiments / training
class GradientDescentParams(BaseModel):
    learning_rate: float = Field(0.01, gt=0, le=10)
    iterations: int = Field(1000, ge=1, le=100_000)
    w0: float = Field(0.0, ge=-1e6, le=1e6)
    b0: float = Field(0.0, ge=-1e6, le=1e6)
    loss: Literal["mse", "half_mse"] = "mse"
    tolerance: float | None = Field(1e-9, ge=0, le=1)
    standardize_x: bool = False


class TreeParams(BaseModel):
    max_depth: int | None = Field(3, ge=1, le=30)
    min_samples_split: int = Field(2, ge=2, le=1000)
    min_samples_leaf: int = Field(1, ge=1, le=1000)
    criterion: Literal["gini", "entropy", "squared_error", "absolute_error"] | None = None


class LogisticParams(BaseModel):
    C: float = Field(1.0, ge=1e-4, le=1e4)
    threshold: float | None = Field(None, gt=0, lt=1)


class ExperimentCreate(BaseModel):
    dataset_id: str
    algorithm: Algorithm
    task: Task | None = None
    target_column: str = Field(min_length=1, max_length=200)
    feature_columns: list[str] = Field(min_length=1, max_length=100)
    hyperparameters: dict[str, Any] = Field(default_factory=dict)
    test_size: float = Field(0.2, ge=0.0, le=0.5)
    random_seed: int = Field(42, ge=0, le=2**31 - 1)
    positive_label: str | None = None
    name: str = Field("", max_length=200)

    @model_validator(mode="after")
    def _check(self):
        if self.test_size == 0 and self.algorithm != "gradient_descent":
            raise ValueError("test_size = 0 (train on all rows) is only allowed for gradient_descent; other models need a test split.")
        if 0 < self.test_size < 0.05:
            raise ValueError("test_size must be 0 or at least 0.05.")
        if self.algorithm == "gradient_descent":
            if len(self.feature_columns) != 1:
                raise ValueError("gradient_descent (ŷ = wx + b) uses exactly one feature column.")
            self.task = "regression"
            self.hyperparameters = GradientDescentParams(**self.hyperparameters).model_dump()
        elif self.algorithm == "linear_regression":
            if self.task == "classification":
                raise ValueError("linear_regression predicts a quantitative target; use logistic_regression or decision_tree for classification.")
            self.task = "regression"
        elif self.algorithm == "logistic_regression":
            if self.task == "regression":
                raise ValueError("logistic_regression is a classification method.")
            self.task = "classification"
            self.hyperparameters = LogisticParams(**self.hyperparameters).model_dump()
        elif self.algorithm == "decision_tree":
            self.hyperparameters = TreeParams(**self.hyperparameters).model_dump()
        if self.target_column in self.feature_columns:
            raise ValueError("The target column cannot also be a feature.")
        return self


class ExperimentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    dataset_id: str
    name: str
    algorithm: str
    task: str
    target_column: str
    feature_columns: list[str]
    hyperparameters: dict[str, Any]
    positive_label: str | None = None
    test_size: float
    random_seed: int
    status: str
    created_at: datetime


class TrainingStart(BaseModel):
    experiment_id: str | None = None
    experiment: ExperimentCreate | None = None

    @model_validator(mode="after")
    def _one(self):
        if (self.experiment_id is None) == (self.experiment is None):
            raise ValueError("Provide exactly one of experiment_id or experiment.")
        return self


class RunStatus(BaseModel):
    run_id: str
    experiment_id: str
    status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED"]
    progress: float
    error: str | None = None
    duration_ms: float | None = None
    created_at: datetime
    completed_at: datetime | None = None


class RunDetail(RunStatus):
    experiment: ExperimentOut
    metrics: dict[str, Any] | None = None
    model_summary: dict[str, Any] | None = None


# ----------------------------------------------------------------- predictions / evaluation
class PredictionRequest(BaseModel):
    run_id: str
    inputs: dict[str, Any] = Field(min_length=1)


class PredictionOut(BaseModel):
    id: str
    run_id: str
    prediction: Any
    probabilities: dict[str, float] | None = None
    explanation: dict[str, Any]


class ConfusionMatrixRequest(BaseModel):
    tp: int = Field(ge=0, le=10**9)
    fp: int = Field(ge=0, le=10**9)
    fn: int = Field(ge=0, le=10**9)
    tn: int = Field(ge=0, le=10**9)
    positive_label: str = "Positive"
    negative_label: str = "Negative"

    @model_validator(mode="after")
    def _nonempty(self):
        if self.tp + self.fp + self.fn + self.tn == 0:
            raise ValueError("At least one count must be greater than 0.")
        return self


# ----------------------------------------------------------------- exercises / practice
class ExerciseSummary(BaseModel):
    id: str
    book: str
    chapter: int
    exercise_number: str
    title: str
    category: str
    source_page: str
    kind: str
    required_dataset: str | None
    origin: str


class SolveRequest(BaseModel):
    parameters: dict[str, Any] = Field(default_factory=dict)
    dataset_id: str | None = None

    @field_validator("parameters")
    @classmethod
    def _no_private(cls, v):
        if any(str(k).startswith("_") for k in v):
            raise ValueError("Parameter names may not start with '_'.")
        return v


class PracticeCheck(BaseModel):
    problem_id: str = Field(min_length=1, max_length=200)
    answers: dict[str, Any]


class ComplexityLabRequest(BaseModel):
    dataset_id: str
    target_column: str
    feature_columns: list[str] = Field(min_length=1)
    task: Task | None = None
    depths: list[int] = Field(default_factory=lambda: list(range(1, 13)), min_length=1, max_length=30)
    test_size: float = Field(0.2, ge=0.05, le=0.5)
    random_seed: int = Field(42, ge=0, le=2**31 - 1)
    min_samples_split: int = Field(2, ge=2, le=1000)

    @field_validator("depths")
    @classmethod
    def _depths(cls, v):
        if any(d < 1 or d > 30 for d in v):
            raise ValueError("Depths must be between 1 and 30.")
        return sorted(set(v))
