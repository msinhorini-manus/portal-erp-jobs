"""add company and candidate regional presence

Revision ID: 20260922_03
Revises: 20260922_02
Create Date: 2026-09-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260922_03"
down_revision: Union[str, None] = "20260922_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "company_sites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approval_reason", sa.Text(), nullable=True),
        sa.Column("is_member", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("max_active_jobs", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("display_name", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("company_size", sa.String(length=50), nullable=True),
        sa.Column("sector", sa.String(length=100), nullable=True),
        sa.Column("street_address", sa.String(length=200), nullable=True),
        sa.Column("city", sa.String(length=50), nullable=True),
        sa.Column("state", sa.String(length=50), nullable=True),
        sa.Column("country", sa.String(length=50), nullable=True),
        sa.Column("zip_code", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint("status IN ('pending','approved','rejected','suspended')", name="ck_company_sites_status"),
        sa.CheckConstraint("max_active_jobs >= 0", name="ck_company_sites_job_limit"),
        sa.ForeignKeyConstraint(["approved_by"], ["admins.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("company_id", "site_id", name="uq_company_sites_company_site"),
    )
    op.create_index("ix_company_sites_company_id", "company_sites", ["company_id"])
    op.create_index("ix_company_sites_site_id", "company_sites", ["site_id"])
    op.create_index("ix_company_sites_site_status_name", "company_sites", ["site_id", "status", "display_name"])

    op.create_table(
        "candidate_sites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_discoverable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_actively_looking", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("available_immediately", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("expected_salary", sa.Float(), nullable=True),
        sa.Column("salary_currency", sa.String(length=10), nullable=False, server_default="BRL"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("candidate_id", "site_id", name="uq_candidate_sites_candidate_site"),
    )
    op.create_index("ix_candidate_sites_candidate_id", "candidate_sites", ["candidate_id"])
    op.create_index("ix_candidate_sites_site_id", "candidate_sites", ["site_id"])
    op.create_index("ix_candidate_sites_discovery", "candidate_sites", ["site_id", "is_active", "is_discoverable"])

    connection = op.get_bind()
    br_id = connection.execute(sa.text("SELECT id FROM sites WHERE code = 'BR' LIMIT 1")).scalar_one()

    connection.execute(
        sa.text(
            """
            INSERT INTO company_sites (
                company_id, site_id, status, approved_at, approved_by, approval_reason,
                is_member, max_active_jobs, display_name, description, website, logo_url,
                company_size, sector, street_address, city, state, country, zip_code,
                created_at, updated_at
            )
            SELECT
                c.id,
                :br_id,
                CASE
                    WHEN EXISTS (SELECT 1 FROM jobs j WHERE j.company_id = c.id) THEN 'approved'
                    WHEN lower(coalesce(c.status, '')) = 'approved' THEN 'approved'
                    WHEN lower(coalesce(c.status, '')) = 'rejected' THEN 'rejected'
                    WHEN lower(coalesce(c.status, '')) = 'suspended' THEN 'suspended'
                    ELSE 'pending'
                END,
                CASE WHEN EXISTS (SELECT 1 FROM jobs j WHERE j.company_id = c.id) THEN coalesce(c.approved_at, CURRENT_TIMESTAMP) ELSE c.approved_at END,
                c.approved_by,
                c.rejection_reason,
                coalesce(c.is_member, 0),
                max(coalesce(c.max_active_jobs, 3), 0),
                c.company_name, c.description, c.website, c.logo_url, c.company_size,
                c.sector, c.street_address, c.city, c.state, c.country, c.zip_code,
                coalesce(c.created_at, CURRENT_TIMESTAMP), coalesce(c.updated_at, CURRENT_TIMESTAMP)
            FROM companies c
            """
        ),
        {"br_id": br_id},
    )

    connection.execute(
        sa.text(
            """
            UPDATE company_users
            SET role = 'owner', is_active = 1, invitation_accepted = 1
            WHERE EXISTS (
                SELECT 1 FROM companies c
                WHERE c.id = company_users.company_id
                  AND c.user_id = company_users.user_id
            )
            """
        )
    )
    connection.execute(
        sa.text(
            """
            INSERT INTO company_users (
                company_id, user_id, role, name, position, is_active,
                invitation_accepted, created_at, updated_at
            )
            SELECT c.id, c.user_id, 'owner', c.company_name, 'Owner', 1, 1,
                   coalesce(c.created_at, CURRENT_TIMESTAMP),
                   coalesce(c.updated_at, CURRENT_TIMESTAMP)
            FROM companies c
            WHERE NOT EXISTS (
                SELECT 1 FROM company_users cu
                WHERE cu.company_id = c.id AND cu.user_id = c.user_id
            )
            """
        )
    )

    connection.execute(
        sa.text(
            """
            INSERT INTO candidate_sites (
                candidate_id, site_id, is_active, is_discoverable, is_actively_looking,
                available_immediately, expected_salary, salary_currency, created_at, updated_at
            )
            SELECT
                c.id, :br_id, 1, 0, coalesce(c.is_actively_looking, 1),
                coalesce(c.available_immediately, 1), c.expected_salary,
                coalesce(c.salary_currency, 'BRL'), coalesce(c.created_at, CURRENT_TIMESTAMP),
                coalesce(c.updated_at, CURRENT_TIMESTAMP)
            FROM candidates c
            """
        ),
        {"br_id": br_id},
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_sites_discovery", table_name="candidate_sites")
    op.drop_index("ix_candidate_sites_site_id", table_name="candidate_sites")
    op.drop_index("ix_candidate_sites_candidate_id", table_name="candidate_sites")
    op.drop_table("candidate_sites")
    op.drop_index("ix_company_sites_site_status_name", table_name="company_sites")
    op.drop_index("ix_company_sites_site_id", table_name="company_sites")
    op.drop_index("ix_company_sites_company_id", table_name="company_sites")
    op.drop_table("company_sites")
