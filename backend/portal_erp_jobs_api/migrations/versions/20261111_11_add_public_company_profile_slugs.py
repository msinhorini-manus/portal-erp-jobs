"""Persist stable regional company profile URL snapshots without redirects.

Revision ID: 20261111_11
Revises: 20261111_10

Nullable deliberately permits legacy writers and code-only rollback. Upgrade
adds one column without rebuilding SQLite tables or changing old rows/columns.
Downgrade removes only this snapshot, preserving regional/composite constraints.
The v1 normalizer is frozen here so future runtime helper changes cannot alter
historical backfill results. No ORM events or timestamp hooks run in backfill.
"""
import re
import unicodedata

from alembic import op
import sqlalchemy as sa

revision = "20261111_11"
down_revision = "20261111_10"
branch_labels = None
depends_on = None


def _public_company_slug_v1(display_name, company_name):
    """Frozen src.job_slugs.public_company_slug v1 (visible profile only)."""
    name = display_name if display_name and display_name.strip() else company_name
    text = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:140].rstrip("-") or "empresa"


def _backfill(connection):
    """Fill NULL snapshots only, in bounded keyset chunks and stable ID order."""
    memberships = sa.table(
        "company_sites", sa.column("id", sa.Integer),
        sa.column("company_id", sa.Integer), sa.column("display_name", sa.String),
        sa.column("public_profile_slug", sa.String),
    )
    companies = sa.table(
        "companies", sa.column("id", sa.Integer), sa.column("company_name", sa.String),
    )
    source = memberships.outerjoin(companies, companies.c.id == memberships.c.company_id)
    last_id = None
    while True:
        query = sa.select(
            memberships.c.id, memberships.c.display_name, companies.c.company_name,
        ).select_from(source).where(
            memberships.c.public_profile_slug.is_(None),
        ).order_by(memberships.c.id).limit(500)
        if last_id is not None:
            query = query.where(memberships.c.id > last_id)
        rows = connection.execute(query).mappings().all()
        if not rows:
            break
        for row in rows:
            connection.execute(
                memberships.update().where(
                    memberships.c.id == row["id"],
                    memberships.c.public_profile_slug.is_(None),
                ).values(public_profile_slug=_public_company_slug_v1(
                    row["display_name"], row["company_name"],
                ))
            )
        last_id = rows[-1]["id"]


def upgrade():
    op.add_column("company_sites", sa.Column("public_profile_slug", sa.String(140), nullable=True))
    _backfill(op.get_bind())


def downgrade():
    # Alembic's SQLite batch reflection retains named CHECK/UNIQUE constraints,
    # indexes and FKs. env.py disables FK enforcement for the rebuild and checks
    # every FK before closing; the roundtrip tests include referencing jobs.
    with op.batch_alter_table("company_sites") as batch:
        batch.drop_column("public_profile_slug")
