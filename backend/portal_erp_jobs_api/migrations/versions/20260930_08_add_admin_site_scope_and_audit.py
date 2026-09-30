"""add admin regional scope and audit events

Revision ID: 20260930_08
Revises: 20260929_07
Create Date: 2026-09-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260930_08"
down_revision: Union[str, None] = "20260929_07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    br_id = bind.execute(sa.text("SELECT id FROM sites WHERE code = 'BR' LIMIT 1")).scalar()
    if br_id is None:
        raise RuntimeError("Site BR is required before assigning existing administrators")
    active_super_admin_ids = [
        row[0]
        for row in bind.execute(sa.text(
            """
            SELECT a.id
            FROM admins a
            JOIN users u ON u.id = a.user_id
            WHERE a.role = 'super_admin' AND u.is_active = 1
            ORDER BY a.id
            """
        )).fetchall()
    ]
    if len(active_super_admin_ids) > 1:
        raise RuntimeError(
            "Multiple active legacy super_admin records require an explicit platform-admin selection before migration"
        )

    with op.batch_alter_table("admins") as batch_op:
        batch_op.add_column(
            sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default=sa.false())
        )

    if active_super_admin_ids:
        bind.execute(
            sa.text("UPDATE admins SET is_platform_admin = 1 WHERE id = :admin_id"),
            {"admin_id": active_super_admin_ids[0]},
        )

    op.create_table(
        "admin_sites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(["admin_id"], ["admins.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("admin_id", "site_id", name="uq_admin_sites_admin_site"),
    )
    op.create_index("ix_admin_sites_admin_id", "admin_sites", ["admin_id"])
    op.create_index("ix_admin_sites_site_id", "admin_sites", ["site_id"])
    op.create_index("ix_admin_sites_site_active", "admin_sites", ["site_id", "is_active"])

    op.create_table(
        "admin_audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("actor_admin_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("target_type", sa.String(length=80), nullable=False),
        sa.Column("target_id", sa.String(length=80), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("ip_prefix", sa.String(length=64), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(["actor_admin_id"], ["admins.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_events_site_id", "admin_audit_events", ["site_id"])
    op.create_index("ix_admin_audit_events_actor_admin_id", "admin_audit_events", ["actor_admin_id"])
    op.create_index("ix_admin_audit_events_site_created", "admin_audit_events", ["site_id", "created_at"])
    op.create_index("ix_admin_audit_events_actor_created", "admin_audit_events", ["actor_admin_id", "created_at"])
    if bind.dialect.name == "sqlite":
        op.execute(
            """
            CREATE TRIGGER admin_audit_events_no_update
            BEFORE UPDATE ON admin_audit_events
            BEGIN
                SELECT RAISE(ABORT, 'admin_audit_events is append-only');
            END
            """
        )
        op.execute(
            """
            CREATE TRIGGER admin_audit_events_no_delete
            BEFORE DELETE ON admin_audit_events
            BEGIN
                SELECT RAISE(ABORT, 'admin_audit_events is append-only');
            END
            """
        )

    bind.execute(
        sa.text(
            """
            INSERT INTO admin_sites (admin_id, site_id, is_active, created_at, updated_at)
            SELECT a.id, :br_id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM admins a
            WHERE NOT EXISTS (
                SELECT 1 FROM admin_sites x
                WHERE x.admin_id = a.id AND x.site_id = :br_id
            )
            """
        ),
        {"br_id": br_id},
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS admin_audit_events_no_delete")
        op.execute("DROP TRIGGER IF EXISTS admin_audit_events_no_update")
    op.drop_index("ix_admin_audit_events_actor_created", table_name="admin_audit_events")
    op.drop_index("ix_admin_audit_events_site_created", table_name="admin_audit_events")
    op.drop_index("ix_admin_audit_events_actor_admin_id", table_name="admin_audit_events")
    op.drop_index("ix_admin_audit_events_site_id", table_name="admin_audit_events")
    op.drop_table("admin_audit_events")
    op.drop_index("ix_admin_sites_site_active", table_name="admin_sites")
    op.drop_index("ix_admin_sites_site_id", table_name="admin_sites")
    op.drop_index("ix_admin_sites_admin_id", table_name="admin_sites")
    op.drop_table("admin_sites")
    with op.batch_alter_table("admins") as batch_op:
        batch_op.drop_column("is_platform_admin")
