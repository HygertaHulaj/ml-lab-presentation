"""Persistence for the cinematic lessons: lessons, cached simulations, learner progress, saved experiments.

Dataset contents are never copied into the database; a simulation stores only its config and its trace.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base, JSONType


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    algorithm: Mapped[str] = mapped_column(String(50))
    version: Mapped[int] = mapped_column(Integer, default=1)
    manifest: Mapped[dict] = mapped_column(JSONType)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Simulation(Base):
    __tablename__ = "simulations"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    algorithm: Mapped[str] = mapped_column(String(50))
    config_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    config: Mapped[dict] = mapped_column(JSONType)
    trace: Mapped[dict] = mapped_column(JSONType)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("learner_id", "lesson_id", name="uq_progress_learner_lesson"),)
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    learner_id: Mapped[str] = mapped_column(String(64), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    scene_id: Mapped[str] = mapped_column(String(64))
    position: Mapped[float] = mapped_column(Float, default=0.0)
    mode: Mapped[str] = mapped_column(String(16), default="story")
    completed_scenes: Mapped[list] = mapped_column(JSONType, default=list)
    simulation_id: Mapped[str | None] = mapped_column(ForeignKey("simulations.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class SavedExperiment(Base):
    __tablename__ = "saved_experiments"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    learner_id: Mapped[str] = mapped_column(String(64), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    simulation_id: Mapped[str] = mapped_column(ForeignKey("simulations.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
