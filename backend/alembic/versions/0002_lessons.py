"""cinematic lessons: lessons, simulations, lesson_progress, saved_experiments

Revision ID: 0002_lessons
Revises: 0001_initial
Create Date: 2026-11-04
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_lessons"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

JSONT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
TS = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.create_table(
        "lessons",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("algorithm", sa.String(50), nullable=False),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("manifest", JSONT, nullable=False),
        sa.Column("updated_at", TS, nullable=False),
    )
    op.create_table(
        "simulations",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("algorithm", sa.String(50), nullable=False),
        sa.Column("config_hash", sa.String(64), nullable=False),
        sa.Column("config", JSONT, nullable=False),
        sa.Column("trace", JSONT, nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_simulations_config_hash", "simulations", ["config_hash"], unique=True)
    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("learner_id", sa.String(64), nullable=False),
        sa.Column("lesson_id", sa.String(64), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scene_id", sa.String(64), nullable=False),
        sa.Column("position", sa.Float, nullable=False),
        sa.Column("mode", sa.String(16), nullable=False),
        sa.Column("completed_scenes", JSONT, nullable=False),
        sa.Column("simulation_id", sa.String(64), sa.ForeignKey("simulations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", TS, nullable=False),
        sa.UniqueConstraint("learner_id", "lesson_id", name="uq_progress_learner_lesson"),
    )
    op.create_index("ix_lesson_progress_learner_id", "lesson_progress", ["learner_id"])
    op.create_table(
        "saved_experiments",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("learner_id", sa.String(64), nullable=False),
        sa.Column("lesson_id", sa.String(64), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("simulation_id", sa.String(64), sa.ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_saved_experiments_learner_id", "saved_experiments", ["learner_id"])


def downgrade() -> None:
    op.drop_index("ix_saved_experiments_learner_id", "saved_experiments")
    op.drop_table("saved_experiments")
    op.drop_index("ix_lesson_progress_learner_id", "lesson_progress")
    op.drop_table("lesson_progress")
    op.drop_index("ix_simulations_config_hash", "simulations")
    op.drop_table("simulations")
    op.drop_table("lessons")
