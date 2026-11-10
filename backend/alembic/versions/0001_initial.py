"""initial schema: datasets, exercises, experiments, training_runs, predictions

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-04
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

JSONT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
TS = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.create_table(
        "datasets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("source", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("origin", sa.String(20), nullable=False),
        sa.Column("file_path", sa.String(300), nullable=False),
        sa.Column("row_count", sa.Integer, nullable=False),
        sa.Column("column_metadata", JSONT, nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_table(
        "exercises",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("book", sa.String(20), nullable=False),
        sa.Column("chapter", sa.Integer, nullable=False),
        sa.Column("exercise_number", sa.String(60), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("source_page", sa.String(40), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("required_dataset", sa.String(200), nullable=True),
        sa.Column("solution_reference", sa.String(200), nullable=False),
    )
    op.create_table(
        "experiments",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("dataset_id", sa.String(64), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("algorithm", sa.String(50), nullable=False),
        sa.Column("task", sa.String(20), nullable=False),
        sa.Column("target_column", sa.String(200), nullable=False),
        sa.Column("feature_columns", JSONT, nullable=False),
        sa.Column("hyperparameters", JSONT, nullable=False),
        sa.Column("test_size", sa.Float, nullable=False),
        sa.Column("random_seed", sa.Integer, nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_experiments_created_at", "experiments", ["created_at"])
    op.create_table(
        "training_runs",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("experiment_id", sa.String(64), sa.ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("progress", sa.Float, nullable=False),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("metrics", JSONT, nullable=True),
        sa.Column("training_history", JSONT, nullable=True),
        sa.Column("model_summary", JSONT, nullable=True),
        sa.Column("model_artifact_path", sa.String(300), nullable=True),
        sa.Column("duration_ms", sa.Float, nullable=True),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("completed_at", TS, nullable=True),
    )
    op.create_index("ix_training_runs_experiment_id", "training_runs", ["experiment_id"])
    op.create_table(
        "predictions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("training_run_id", sa.String(64), sa.ForeignKey("training_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("input_values", JSONT, nullable=False),
        sa.Column("predicted_value", JSONT, nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("predictions")
    op.drop_index("ix_training_runs_experiment_id", "training_runs")
    op.drop_table("training_runs")
    op.drop_index("ix_experiments_created_at", "experiments")
    op.drop_table("experiments")
    op.drop_table("exercises")
    op.drop_table("datasets")
