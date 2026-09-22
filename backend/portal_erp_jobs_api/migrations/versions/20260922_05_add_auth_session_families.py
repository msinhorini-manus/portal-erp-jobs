"""add rotating authentication session families

Revision ID: 20260922_05
Revises: 20260922_04
Create Date: 2026-09-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260922_05"
down_revision: Union[str, None] = "20260922_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("password_changed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "auth_session_families",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("family_id", sa.String(length=36), nullable=False),
        sa.Column("current_refresh_jti", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
        sa.Column("ip_prefix", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
    )
    op.create_index(
        "ix_auth_session_families_user_id",
        "auth_session_families",
        ["user_id"],
    )
    op.create_index(
        "ix_auth_session_families_site_id",
        "auth_session_families",
        ["site_id"],
    )
    op.create_index(
        "ix_auth_session_families_family_id",
        "auth_session_families",
        ["family_id"],
        unique=True,
    )
    op.create_index(
        "ix_auth_session_families_user_active",
        "auth_session_families",
        ["user_id", "revoked_at"],
    )
    op.create_index(
        "ix_auth_session_families_site_expires",
        "auth_session_families",
        ["site_id", "expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_auth_session_families_site_expires", table_name="auth_session_families")
    op.drop_index("ix_auth_session_families_user_active", table_name="auth_session_families")
    op.drop_index("ix_auth_session_families_family_id", table_name="auth_session_families")
    op.drop_index("ix_auth_session_families_site_id", table_name="auth_session_families")
    op.drop_index("ix_auth_session_families_user_id", table_name="auth_session_families")
    op.drop_table("auth_session_families")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("password_changed_at")
