"""add persistent job lifecycle and featured flag

Revision ID: 20260922_06
Revises: 20260922_05
Create Date: 2026-09-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260922_06"
down_revision: Union[str, None] = "20260922_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ALLOWED = "'active','approved','pending','rejected','closed','inactive','archived'"


def upgrade() -> None:
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.add_column(
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active")
        )
        batch_op.add_column(
            sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false())
        )

    # Existing is_active is the source of truth for the initial lifecycle backfill.
    op.execute(
        sa.text(
            "UPDATE jobs SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END"
        )
    )

    with op.batch_alter_table("jobs") as batch_op:
        batch_op.create_check_constraint("ck_jobs_status", f"status IN ({_ALLOWED})")
        batch_op.alter_column("status", server_default=None)
        batch_op.alter_column("is_featured", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.drop_constraint("ck_jobs_status", type_="check")
        batch_op.drop_column("is_featured")
        batch_op.drop_column("status")
