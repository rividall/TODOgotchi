"""create checklist_items table

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "checklist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "poring_id",
            sa.Integer(),
            sa.ForeignKey("porings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.String(length=500), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_checklist_items_id", "checklist_items", ["id"])
    op.create_index("ix_checklist_items_poring_id", "checklist_items", ["poring_id"])


def downgrade() -> None:
    op.drop_index("ix_checklist_items_poring_id", table_name="checklist_items")
    op.drop_index("ix_checklist_items_id", table_name="checklist_items")
    op.drop_table("checklist_items")
