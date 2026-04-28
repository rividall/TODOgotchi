"""create workspaces and add workspace_id to users and porings

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-28
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_workspaces_id", "workspaces", ["id"])

    op.create_table(
        "user_workspaces",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "workspace_id",
            sa.Integer(),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "workspace_id",
            sa.Integer(),
            sa.ForeignKey("workspaces.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_users_workspace_id", "users", ["workspace_id"])

    op.add_column(
        "porings",
        sa.Column(
            "workspace_id",
            sa.Integer(),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_porings_workspace_id", "porings", ["workspace_id"])

    # Migrate existing data: create a default workspace and assign all
    # existing users and porings to it so nothing goes orphaned.
    conn = op.get_bind()
    user_count = conn.execute(sa.text("SELECT COUNT(*) FROM users")).scalar()
    if user_count and user_count > 0:
        result = conn.execute(
            sa.text("INSERT INTO workspaces (name) VALUES ('Default') RETURNING id")
        )
        workspace_id = result.scalar()
        conn.execute(
            sa.text("UPDATE users SET workspace_id = :wid"), {"wid": workspace_id}
        )
        conn.execute(
            sa.text(
                "INSERT INTO user_workspaces (user_id, workspace_id) "
                "SELECT id, :wid FROM users"
            ),
            {"wid": workspace_id},
        )
        conn.execute(
            sa.text("UPDATE porings SET workspace_id = :wid"), {"wid": workspace_id}
        )


def downgrade() -> None:
    op.drop_index("ix_porings_workspace_id", table_name="porings")
    op.drop_column("porings", "workspace_id")
    op.drop_index("ix_users_workspace_id", table_name="users")
    op.drop_column("users", "workspace_id")
    op.drop_table("user_workspaces")
    op.drop_index("ix_workspaces_id", table_name="workspaces")
    op.drop_table("workspaces")
