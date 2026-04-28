"""create porings and xp_events tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    poring_status = sa.Enum("alive", "completed", name="poring_status")
    poring_action_type = sa.Enum(
        "shipped", "booked", "bought", "done", "abandoned", name="poring_action_type"
    )
    xp_event_type = sa.Enum(
        "description_edit",
        "checklist_added",
        "checklist_completed",
        "label_attached",
        name="xp_event_type",
    )

    op.create_table(
        "porings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", poring_status, nullable=False, server_default="alive"),
        sa.Column("action_type", poring_action_type, nullable=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint("xp >= 0", name="ck_porings_xp_nonneg"),
    )
    op.create_index("ix_porings_id", "porings", ["id"])
    op.create_index("ix_porings_user_id", "porings", ["user_id"])

    op.create_table(
        "xp_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "poring_id",
            sa.Integer(),
            sa.ForeignKey("porings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", xp_event_type, nullable=False),
        sa.Column("xp_gained", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_xp_events_id", "xp_events", ["id"])
    op.create_index("ix_xp_events_poring_id", "xp_events", ["poring_id"])


def downgrade() -> None:
    op.drop_index("ix_xp_events_poring_id", table_name="xp_events")
    op.drop_index("ix_xp_events_id", table_name="xp_events")
    op.drop_table("xp_events")
    op.drop_index("ix_porings_user_id", table_name="porings")
    op.drop_index("ix_porings_id", table_name="porings")
    op.drop_table("porings")
    sa.Enum(name="xp_event_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="poring_action_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="poring_status").drop(op.get_bind(), checkfirst=True)
