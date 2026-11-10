"""Allow regional hostname reuse without changing any site configuration.

Revision ID: 20261110_09
Revises: 20260930_08

This is schema preparation only. BR's ID, origin, domains and activation are
preserved; the canonical-domain cutover requires separate explicit approval.
"""
from alembic import op
import sqlalchemy as sa

from src.models.site import PREFIX_RE, normalize_host

revision = "20261110_09"
down_revision = "20260930_08"
branch_labels = None
depends_on = None

PAIR_CONSTRAINT = "uq_site_domains_hostname_prefix"
NAMING = {"uq": "uq_%(table_name)s_%(column_0_name)s"}


def _preflight(*, downgrade=False):
    bind = op.get_bind()
    rows = bind.execute(sa.text(
        "SELECT hostname, url_prefix, site_id, is_primary FROM site_domains"
    )).all()
    pairs, primaries, hosts, site_prefixes = set(), set(), set(), set()
    for hostname, prefix, site_id, primary in rows:
        try:
            valid_host = normalize_host(hostname) == hostname
        except (ValueError, TypeError):
            valid_host = False
        if not valid_host or not isinstance(prefix, str) or not PREFIX_RE.fullmatch(prefix):
            raise RuntimeError("Domain migration preflight: noncanonical hostname/prefix; no changes made")
        if (hostname, prefix) in pairs or (primary and site_id in primaries):
            raise RuntimeError("Domain migration preflight: ambiguous host/prefix or primary; no changes made")
        pairs.add((hostname, prefix))
        if primary:
            primaries.add(site_id)
        if downgrade and (hostname in hosts or (site_id, prefix) in site_prefixes):
            raise RuntimeError(
                "Domain downgrade refused: reused hostname or alias prefix cannot fit legacy uniqueness; "
                "explicit configuration reconciliation required, no rows removed"
            )
        hosts.add(hostname)
        site_prefixes.add((site_id, prefix))


def upgrade():
    _preflight()
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    constraints = inspector.get_unique_constraints("site_domains")
    indexes = inspector.get_indexes("site_domains")
    # The original migration has an unnamed hostname UNIQUE plus a unique
    # hostname index. ORM-created legacy SQLite databases may have only the
    # index. Reflection naming handles both without relying on autoindex IDs.
    with op.batch_alter_table("site_domains", naming_convention=NAMING) as batch:
        for constraint in constraints:
            columns = tuple(constraint["column_names"])
            if columns in (("hostname",), ("site_id", "url_prefix")):
                name = constraint["name"] or f"uq_site_domains_{columns[0]}"
                batch.drop_constraint(name, type_="unique")
        if any(index["name"] == "ix_site_domains_hostname" for index in indexes):
            batch.drop_index("ix_site_domains_hostname")
        batch.create_unique_constraint(PAIR_CONSTRAINT, ["hostname", "url_prefix"])
        batch.create_index("ix_site_domains_hostname", ["hostname"], unique=False)
    # uq_site_domains_primary (partial UNIQUE site_id) remains untouched.


def downgrade():
    # SQLite DDL is not reliably transactional: reject before the first DDL,
    # including when a same-site alias would violate site_id/prefix uniqueness.
    _preflight(downgrade=True)
    with op.batch_alter_table("site_domains", naming_convention=NAMING) as batch:
        batch.drop_constraint(PAIR_CONSTRAINT, type_="unique")
        batch.drop_index("ix_site_domains_hostname")
        # Legacy ORM enforces hostname uniqueness with this unique index.
        # Adding a second named UNIQUE duplicates that protection and creates
        # Alembic drift when returning to the legacy runtime after rollback.
        batch.create_unique_constraint("uq_site_domain_prefix", ["site_id", "url_prefix"])
        batch.create_index("ix_site_domains_hostname", ["hostname"], unique=True)
