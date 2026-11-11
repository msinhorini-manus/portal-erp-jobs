"""Persist stable public job URL snapshots without changing identities or sites.

Revision ID: 20261111_10
Revises: 20261110_09

Nullable intentionally: rolling code back need not restore the database, and
legacy writers can insert null snapshots. New code supplies a read-only fallback.
Downgrade removes only the two snapshots (not jobs, applications or their IDs).
"""
from alembic import op
import sqlalchemy as sa

from src.job_slugs import public_company_slug, public_slug

revision = "20261111_10"
down_revision = "20261110_09"
branch_labels = None
depends_on = None


def _backfill(connection):
    """Fill only missing snapshots through Core, never ORM or timestamp hooks."""
    jobs = sa.table(
        "jobs", sa.column("id", sa.Integer), sa.column("company_id", sa.Integer),
        sa.column("site_id", sa.Integer), sa.column("title", sa.String),
        sa.column("is_company_hidden", sa.Boolean),
        sa.column("public_company_slug", sa.String), sa.column("public_title_slug", sa.String),
    )
    companies = sa.table("companies", sa.column("id", sa.Integer), sa.column("company_name", sa.String))
    memberships = sa.table(
        "company_sites", sa.column("company_id", sa.Integer), sa.column("site_id", sa.Integer),
        sa.column("display_name", sa.String),
    )
    source = jobs.outerjoin(companies, companies.c.id == jobs.c.company_id).outerjoin(
        memberships,
        sa.and_(memberships.c.company_id == jobs.c.company_id, memberships.c.site_id == jobs.c.site_id),
    )
    # Keyset chunks keep memory bounded and avoid modifying a streaming cursor.
    last_id = None
    while True:
        query = sa.select(jobs, companies.c.company_name, memberships.c.display_name).select_from(source).where(
            sa.or_(jobs.c.public_company_slug.is_(None), jobs.c.public_title_slug.is_(None))
        ).order_by(jobs.c.id).limit(500)
        if last_id is not None:
            query = query.where(jobs.c.id > last_id)
        rows = connection.execute(query).mappings().all()
        if not rows:
            break
        for row in rows:
            values = {}
            if row["public_company_slug"] is None:
                values["public_company_slug"] = public_company_slug(
                    row["display_name"], row["company_name"], hidden=bool(row["is_company_hidden"]),
                )
            if row["public_title_slug"] is None:
                values["public_title_slug"] = public_slug(row["title"], "vaga")
            connection.execute(jobs.update().where(jobs.c.id == row["id"]).values(**values))
        last_id = rows[-1]["id"]


def upgrade():
    op.add_column("jobs", sa.Column("public_company_slug", sa.String(140), nullable=True))
    op.add_column("jobs", sa.Column("public_title_slug", sa.String(140), nullable=True))
    _backfill(op.get_bind())


def downgrade():
    with op.batch_alter_table("jobs") as batch:
        batch.drop_column("public_title_slug")
        batch.drop_column("public_company_slug")
