"""Country-unique company profile slugs and permanent reservations.

Revision ID: 20261111_12
Revises: 20261111_11

No company/job identity changes, redirects, timestamp updates, or region activation.
Valid existing slugs keep their first owner (membership ID order). All distinct
existing keys are reserved before collision allocation, so qualifiers cannot steal
another existing unique snapshot. NULL legacy inserts remain private/fail-closed.
Downgrade deliberately removes this feature's tombstones/guards only; do not serve
slug-only URLs while downgraded. Re-upgrade cannot recover deleted tombstones.
"""
from alembic import op
import sqlalchemy as sa
from src.company_slug_policy_v12 import (
    base_slug, candidates, install_guards, remove_guards,
    reservation_table, valid_slug,
)

revision = "20261111_12"
down_revision = "20261111_11"
branch_labels = None
depends_on = None


def _rows(connection):
    last_id = 0
    while True:
        rows = connection.execute(sa.text("""
            SELECT cs.id, cs.company_id, cs.public_profile_slug, cs.display_name,
              c.company_name, COALESCE(cs.sector,c.sector) AS sector,
              COALESCE(cs.city,c.city) AS city, s.country_code
            FROM company_sites cs JOIN companies c ON c.id=cs.company_id
              JOIN sites s ON s.id=cs.site_id
            WHERE cs.id > :last_id ORDER BY cs.id LIMIT 500
        """), {"last_id": last_id}).mappings().all()
        if not rows:
            return
        yield from rows
        last_id = rows[-1]["id"]


def upgrade():
    connection = op.get_bind()
    if connection.dialect.name not in {"sqlite", "postgresql"}:
        raise RuntimeError("Country company slugs require SQLite or PostgreSQL")
    # Preflight must happen before any DDL (SQLite DDL is not transactional).
    countries = connection.execute(sa.text("SELECT DISTINCT country_code FROM sites")).scalars()
    if any(not isinstance(code, str) or len(code) != 2 or not all('A' <= letter <= 'Z' for letter in code)
           for code in countries):
        raise RuntimeError("Company slug country preflight requires canonical uppercase ISO country codes")
    metadata = sa.MetaData()
    sa.Table("companies", metadata, sa.Column("id", sa.Integer, primary_key=True))
    reservations = reservation_table(metadata)
    reservations.create(connection)
    # Migration owns the new table exclusively until guards are installed.
    # Remember keys to avoid quadratic database roundtrips for repeated names.
    owners = {}
    for row in _rows(connection):
        if valid_slug(row["public_profile_slug"]):
            key = (row["country_code"], row["public_profile_slug"])
            if key not in owners:
                connection.execute(reservations.insert().values(country_code=key[0], slug=key[1], company_id=row["company_id"]))
                owners[key] = row["company_id"]
    for row in _rows(connection):
        existing = row["public_profile_slug"]
        if valid_slug(existing) and owners.get((row["country_code"], existing)) == row["company_id"]:
            slug = existing
        else:
            base = existing if valid_slug(existing) else base_slug(row["display_name"], row["company_name"])
            for slug in candidates(base, row["sector"], row["city"]):
                key = (row["country_code"], slug)
                if key not in owners:
                    connection.execute(reservations.insert().values(country_code=key[0], slug=key[1], company_id=row["company_id"]))
                    owners[key] = row["company_id"]
                    break
                if owners[key] == row["company_id"]:
                    break
        if slug != existing:
            connection.execute(sa.text("UPDATE company_sites SET public_profile_slug=:slug WHERE id=:id"),
                               {"slug": slug, "id": row["id"]})
    install_guards(connection)


def downgrade():
    remove_guards(op.get_bind())
    op.drop_table("company_slug_reservations")
