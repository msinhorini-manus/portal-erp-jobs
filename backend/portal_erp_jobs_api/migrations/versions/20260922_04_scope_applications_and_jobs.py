"""scope applications and jobs to regional presence

Revision ID: 20260922_04
Revises: 20260922_03
Create Date: 2026-09-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260922_04"
down_revision: Union[str, None] = "20260922_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.create_unique_constraint("uq_jobs_id_site", ["id", "site_id"])
        batch_op.create_foreign_key(
            "fk_jobs_company_site",
            "company_sites",
            ["company_id", "site_id"],
            ["company_id", "site_id"],
            ondelete="RESTRICT",
        )

    with op.batch_alter_table("applications") as batch_op:
        batch_op.add_column(sa.Column("site_id", sa.Integer(), nullable=True))

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE applications
            SET site_id = (SELECT jobs.site_id FROM jobs WHERE jobs.id = applications.job_id)
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE applications
            SET status = CASE lower(coalesce(status, ''))
                WHEN 'reviewing' THEN 'reviewing'
                WHEN 'interview' THEN 'interview'
                WHEN 'accepted' THEN 'accepted'
                WHEN 'approved' THEN 'accepted'
                WHEN 'rejected' THEN 'rejected'
                WHEN 'withdrawn' THEN 'withdrawn'
                ELSE 'applied'
            END
            """
        )
    )

    with op.batch_alter_table("applications") as batch_op:
        batch_op.alter_column("site_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("status", existing_type=sa.String(length=20), nullable=False, server_default="applied")
        batch_op.create_check_constraint(
            "ck_applications_status",
            "status IN ('applied','reviewing','interview','accepted','rejected','withdrawn')",
        )
        batch_op.create_unique_constraint("uq_applications_id_site", ["id", "site_id"])
        batch_op.create_foreign_key("fk_applications_site", "sites", ["site_id"], ["id"], ondelete="RESTRICT")
        batch_op.create_foreign_key(
            "fk_applications_candidate_site",
            "candidate_sites",
            ["candidate_id", "site_id"],
            ["candidate_id", "site_id"],
            ondelete="RESTRICT",
        )
        batch_op.create_foreign_key(
            "fk_applications_job_site",
            "jobs",
            ["job_id", "site_id"],
            ["id", "site_id"],
            ondelete="RESTRICT",
        )
        batch_op.create_index("ix_applications_site_candidate_applied", ["site_id", "candidate_id", "applied_at"])
        batch_op.create_index("ix_applications_site_job_status", ["site_id", "job_id", "status", "applied_at"])

    op.create_table(
        "application_status_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_role", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("changed_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint(
            "from_status IS NULL OR from_status IN ('applied','reviewing','interview','accepted','rejected','withdrawn')",
            name="ck_application_events_from_status",
        ),
        sa.CheckConstraint(
            "to_status IN ('applied','reviewing','interview','accepted','rejected','withdrawn')",
            name="ck_application_events_to_status",
        ),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_application_status_events_application_id", "application_status_events", ["application_id"])

    connection.execute(
        sa.text(
            """
            INSERT INTO application_status_events (
                application_id, from_status, to_status, actor_user_id, actor_role, reason, changed_at
            )
            SELECT id, NULL, status, NULL, 'migration', 'Onda 2 regional backfill',
                   coalesce(applied_at, CURRENT_TIMESTAMP)
            FROM applications
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_application_status_events_application_id", table_name="application_status_events")
    op.drop_table("application_status_events")

    with op.batch_alter_table("applications") as batch_op:
        batch_op.drop_index("ix_applications_site_job_status")
        batch_op.drop_index("ix_applications_site_candidate_applied")
        batch_op.drop_constraint("fk_applications_job_site", type_="foreignkey")
        batch_op.drop_constraint("fk_applications_candidate_site", type_="foreignkey")
        batch_op.drop_constraint("fk_applications_site", type_="foreignkey")
        batch_op.drop_constraint("uq_applications_id_site", type_="unique")
        batch_op.drop_constraint("ck_applications_status", type_="check")
        batch_op.alter_column("status", existing_type=sa.String(length=20), nullable=True, server_default=None)
        batch_op.drop_column("site_id")

    with op.batch_alter_table("jobs") as batch_op:
        batch_op.drop_constraint("fk_jobs_company_site", type_="foreignkey")
        batch_op.drop_constraint("uq_jobs_id_site", type_="unique")
