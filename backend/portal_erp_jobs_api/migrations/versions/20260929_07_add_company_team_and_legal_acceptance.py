"""add company team invitations, audit trail and legal acceptances

Revision ID: 20260929_07
Revises: 20260922_06
Create Date: 2026-09-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260929_07"
down_revision: Union[str, None] = "20260922_06"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    conflict = bind.execute(sa.text(
        """
        SELECT c.id
        FROM companies c
        JOIN company_users cu ON cu.user_id = c.user_id
        WHERE cu.is_active = 1 AND cu.company_id != c.id
        LIMIT 1
        """
    )).first()
    duplicate = bind.execute(sa.text(
        """
        SELECT user_id
        FROM company_users
        WHERE is_active = 1
        GROUP BY user_id
        HAVING COUNT(*) > 1
        LIMIT 1
        """
    )).first()
    if conflict or duplicate:
        raise RuntimeError("Conflito de vínculos empresariais ativos; corrija os dados antes da revisão 20260929_07")

    op.create_table(
        "company_invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("position", sa.String(length=100), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), nullable=False),
        sa.Column("accepted_by_user_id", sa.Integer(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("role IN ('owner','admin','hr','viewer')", name="ck_company_invitations_role"),
        sa.CheckConstraint("status IN ('pending','accepted','cancelled','expired')", name="ck_company_invitations_status"),
        sa.ForeignKeyConstraint(["accepted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_company_invitations_company_status", "company_invitations", ["company_id", "status"])
    op.create_index("ix_company_invitations_email", "company_invitations", ["email"])

    op.create_table(
        "company_audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("target_user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_company_audit_events_company_created", "company_audit_events", ["company_id", "created_at"])

    op.create_table(
        "legal_acceptances",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=20), nullable=False),
        sa.Column("document_version", sa.String(length=20), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=False),
        sa.Column("ip_prefix", sa.String(length=64), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
        sa.CheckConstraint("document_type IN ('terms','privacy')", name="ck_legal_acceptances_document_type"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "site_id", "document_type", "document_version", name="uq_legal_acceptance_user_site_document_version"),
    )
    op.create_index("ix_legal_acceptances_user_site", "legal_acceptances", ["user_id", "site_id"])
    op.execute(
        sa.text(
            """
            INSERT INTO company_users (
                company_id, user_id, role, name, position, phone,
                is_active, invited_by, invitation_accepted,
                invitation_token, invitation_expires, created_at, updated_at
            )
            SELECT
                c.id, c.user_id, 'owner', c.company_name, 'Owner', NULL,
                1, NULL, 1, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM companies c
            WHERE NOT EXISTS (
                SELECT 1 FROM company_users cu
                WHERE cu.company_id = c.id AND cu.user_id = c.user_id
            )
            """
        )
    )
    op.create_index(
        "uq_company_users_one_active_membership_per_user",
        "company_users",
        ["user_id"],
        unique=True,
        sqlite_where=sa.text("is_active = 1"),
    )
    op.execute(sa.text("UPDATE company_users SET invitation_token = NULL, invitation_expires = NULL"))


def downgrade() -> None:
    op.drop_index("uq_company_users_one_active_membership_per_user", table_name="company_users")
    op.drop_index("ix_legal_acceptances_user_site", table_name="legal_acceptances")
    op.drop_table("legal_acceptances")
    op.drop_index("ix_company_audit_events_company_created", table_name="company_audit_events")
    op.drop_table("company_audit_events")
    op.drop_index("ix_company_invitations_email", table_name="company_invitations")
    op.drop_index("ix_company_invitations_company_status", table_name="company_invitations")
    op.drop_table("company_invitations")
