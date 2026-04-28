"""create labels and porings_labels tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "labels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "name", name="uq_labels_user_name"),
    )
    op.create_index("ix_labels_id", "labels", ["id"])
    op.create_index("ix_labels_user_id", "labels", ["user_id"])

    op.create_table(
        "porings_labels",
        sa.Column(
            "poring_id",
            sa.Integer(),
            sa.ForeignKey("porings.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "label_id",
            sa.Integer(),
            sa.ForeignKey("labels.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("porings_labels")
    op.drop_index("ix_labels_user_id", table_name="labels")
    op.drop_index("ix_labels_id", table_name="labels")
    op.drop_table("labels")
