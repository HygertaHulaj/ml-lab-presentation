"""SQLAlchemy ORM entities. Large artifacts (CSV files, model cards) live on disk in the
controlled storage directory; the database stores only relative storage keys."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, JSONType


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    origin: Mapped[str] = mapped_column(String(20), default="upload")   # textbook | example | upload
    file_path: Mapped[str] = mapped_column(String(300))                 # storage key, never an absolute path
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_metadata: Mapped[list] = mapped_column(JSONType, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    experiments: Mapped[list[Experiment]] = relationship(back_populates="dataset")


class Exercise(Base):
    """Catalogue of textbook exercises (content and solvers live in app.exercises)."""
    __tablename__ = "exercises"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    book: Mapped[str] = mapped_column(String(20))
    chapter: Mapped[int] = mapped_column(Integer)
    exercise_number: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(100))
    source_page: Mapped[str] = mapped_column(String(40))
    description: Mapped[str] = mapped_column(Text)
    required_dataset: Mapped[str | None] = mapped_column(String(200), nullable=True)
    solution_reference: Mapped[str] = mapped_column(String(200))


class Experiment(Base):
    __tablename__ = "experiments"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200), default="")
    algorithm: Mapped[str] = mapped_column(String(50))
    task: Mapped[str] = mapped_column(String(20))
    target_column: Mapped[str] = mapped_column(String(200))
    feature_columns: Mapped[list] = mapped_column(JSONType)
    hyperparameters: Mapped[dict] = mapped_column(JSONType, default=dict)
    test_size: Mapped[float] = mapped_column(default=0.2)
    random_seed: Mapped[int] = mapped_column(Integer, default=42)
    status: Mapped[str] = mapped_column(String(20), default="CREATED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    dataset: Mapped[Dataset] = relationship(back_populates="experiments")
    runs: Mapped[list[TrainingRun]] = relationship(back_populates="experiment", cascade="all, delete-orphan")


class TrainingRun(Base):
    __tablename__ = "training_runs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    experiment_id: Mapped[str] = mapped_column(ForeignKey("experiments.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")   # PENDING RUNNING COMPLETED FAILED
    progress: Mapped[float] = mapped_column(default=0.0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    training_history: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    model_summary: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    model_artifact_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    duration_ms: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    experiment: Mapped[Experiment] = relationship(back_populates="runs")
    predictions: Mapped[list[Prediction]] = relationship(back_populates="run", cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    training_run_id: Mapped[str] = mapped_column(ForeignKey("training_runs.id", ondelete="CASCADE"))
    input_values: Mapped[dict] = mapped_column(JSONType)
    predicted_value: Mapped[dict] = mapped_column(JSONType)   # {"value": ..., "probabilities": ...}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    run: Mapped[TrainingRun] = relationship(back_populates="predictions")
