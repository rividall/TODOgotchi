"""scope labels to workspace instead of user

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-29
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add workspace_id (nullable for migration, we populate it below)
    op.add_column(
        "labels",
        sa.Column(
            "workspace_id",
            sa.Integer(),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_labels_workspace_id", "labels", ["workspace_id"])

    # Populate workspace_id from the label owner's workspace
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE labels SET workspace_id = users.workspace_id "
        "FROM users WHERE labels.user_id = users.id"
    ))

    # Drop old unique constraint and user_id FK
    op.drop_constraint("uq_labels_user_name", "labels", type_="unique")
    op.drop_index("ix_labels_user_id", table_name="labels")
    op.drop_column("labels", "user_id")

    # New unique constraint: one label name per workspace
    op.create_unique_constraint("uq_labels_workspace_name", "labels", ["workspace_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_labels_workspace_name", "labels", type_="unique")
    op.drop_index("ix_labels_workspace_id", table_name="labels")
    op.drop_column("labels", "workspace_id")
    # Note: user_id is not restored — full downgrade would require backup
