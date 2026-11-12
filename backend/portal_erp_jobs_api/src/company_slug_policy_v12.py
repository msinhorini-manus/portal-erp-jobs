"""Frozen revision12 policy. Keep this module stable for reproducible migrations.

Company profile identity is independent of legacy job URL snapshots.
"""
import re
import unicodedata

import sqlalchemy as sa
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import ColumnElement

MAX_LENGTH = 140
RESERVED = frozenset({
    "admin", "api", "by-slug", "search", "new", "edit", "delete", "create",
    "login", "logout", "register", "registration", "auth", "account", "me",
    "profile", "settings", "dashboard", "empresas", "companies", "jobs", "vagas",
    "static", "assets", "uploads", "favicon", "robots", "sitemap", "feed",
    "empresa-confidencial",
})
SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z", re.ASCII)


def valid_slug(slug):
    return (isinstance(slug, str) and 0 < len(slug) <= MAX_LENGTH
            and bool(SLUG_RE.fullmatch(slug)) and bool(re.search(r"[a-z]", slug))
            and slug not in RESERVED)


def normalize(value):
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:MAX_LENGTH].rstrip("-")


def base_slug(display_name, company_name):
    name = display_name if display_name and display_name.strip() else company_name
    slug = normalize(name)
    return slug if valid_slug(slug) else "empresa"


def alphabetic(number):
    """a..z, aa..az..: deterministic letters, never an internal numeric ID."""
    result = ""
    while True:
        number, remainder = divmod(number, 26)
        result = chr(97 + remainder) + result
        if not number:
            return result
        number -= 1


def candidates(base, sector=None, city=None):
    yield base
    qualifiers = []
    for value in (sector, city):
        qualifier = normalize(value)
        if qualifier and qualifier not in qualifiers:
            qualifiers.append(qualifier)
    seen = {base}
    for qualifier in qualifiers + (["-".join(qualifiers)] if len(qualifiers) > 1 else []):
        suffix = "-" + qualifier[:100].rstrip("-")
        candidate = base[:MAX_LENGTH - len(suffix)].rstrip("-") + suffix
        if candidate not in seen and valid_slug(candidate):
            seen.add(candidate)
            yield candidate
    stem = base
    if qualifiers:
        suffix = "-" + "-".join(qualifiers)[:100].rstrip("-")
        stem = base[:MAX_LENGTH - len(suffix)].rstrip("-") + suffix
    number = 0
    while True:
        suffix = "-" + alphabetic(number)
        yield stem[:MAX_LENGTH - len(suffix)].rstrip("-") + suffix
        number += 1


class SlugCheck(ColumnElement):
    type = sa.Boolean()
    inherit_cache = True


@compiles(SlugCheck)
def _slug_check_default(element, compiler, **kw):
    raise NotImplementedError("Country company slugs support SQLite and PostgreSQL only")


@compiles(SlugCheck, "sqlite")
def _slug_check_sqlite(element, compiler, **kw):
    reserved = ",".join("'" + item + "'" for item in sorted(RESERVED))
    return ("length(slug) BETWEEN 1 AND 140 AND slug NOT GLOB '*[^a-z0-9-]*' "
            "AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND instr(slug,'--') = 0 "
            "AND slug GLOB '*[a-z]*' AND slug NOT IN (" + reserved + ")")


@compiles(SlugCheck, "postgresql")
def _slug_check_pg(element, compiler, **kw):
    reserved = ",".join("'" + item + "'" for item in sorted(RESERVED))
    return ("length(slug) BETWEEN 1 AND 140 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' "
            "AND slug ~ '[a-z]' AND slug NOT IN (" + reserved + ")")


def reservation_table(metadata):
    return sa.Table(
        "company_slug_reservations", metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("country_code", sa.String(2), nullable=False),
        sa.Column("slug", sa.String(MAX_LENGTH), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.UniqueConstraint("country_code", "slug", name="uq_company_slug_country_slug"),
        sa.CheckConstraint(SlugCheck(), name="ck_company_slug_format"),
        sa.CheckConstraint("length(country_code) = 2 AND substr(country_code,1,1) BETWEEN 'A' AND 'Z' AND substr(country_code,2,1) BETWEEN 'A' AND 'Z'",
                           name="ck_company_slug_country"),
    )


SQLITE_TRIGGERS = {
    "company_slug_reservation_insert": """BEFORE INSERT ON company_slug_reservations BEGIN
        SELECT CASE WHEN EXISTS(SELECT 1 FROM company_slug_reservations WHERE
          (country_code=NEW.country_code AND slug=NEW.slug AND company_id IS NOT NEW.company_id)
          OR (id=NEW.id AND (country_code IS NOT NEW.country_code OR slug IS NOT NEW.slug)))
          THEN RAISE(ABORT, 'company slug reservation conflict') END; END""",
    "company_slug_reservation_no_delete": """BEFORE DELETE ON company_slug_reservations BEGIN
        SELECT RAISE(ABORT, 'company slug reservations cannot be deleted'); END""",
    "company_slug_reservation_immutable": """BEFORE UPDATE ON company_slug_reservations BEGIN
        SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.country_code IS NOT OLD.country_code
          OR NEW.slug IS NOT OLD.slug OR (NEW.company_id IS NOT OLD.company_id AND NOT
            (NEW.company_id IS NULL AND OLD.company_id IS NOT NULL AND
             NOT EXISTS(SELECT 1 FROM companies WHERE id=OLD.company_id)))
          THEN RAISE(ABORT, 'company slug reservation is immutable') END; END""",
    "company_slug_membership_insert": """BEFORE INSERT ON company_sites BEGIN
        SELECT CASE WHEN EXISTS(SELECT 1 FROM company_sites cs WHERE
          (cs.id=NEW.id AND (cs.company_id IS NOT NEW.company_id OR cs.site_id IS NOT NEW.site_id))
          OR ((cs.id=NEW.id OR (cs.company_id=NEW.company_id AND cs.site_id=NEW.site_id))
            AND cs.public_profile_slug IS NOT NULL AND cs.public_profile_slug IS NOT NEW.public_profile_slug))
          THEN RAISE(ABORT, 'company profile identity is immutable') END;
        INSERT INTO company_slug_reservations(country_code,slug,company_id)
          SELECT country_code,NEW.public_profile_slug,NEW.company_id FROM sites
          WHERE id=NEW.site_id AND NEW.public_profile_slug IS NOT NULL
          ON CONFLICT(country_code,slug) DO NOTHING;
        SELECT CASE WHEN NEW.public_profile_slug IS NOT NULL AND NOT EXISTS(SELECT 1 FROM company_slug_reservations r JOIN sites s
          ON s.country_code=r.country_code WHERE s.id=NEW.site_id AND r.slug=NEW.public_profile_slug
          AND r.company_id=NEW.company_id)
          THEN RAISE(ABORT, 'company slug reservation mismatch') END; END""",
    "company_slug_membership_update": """BEFORE UPDATE ON company_sites BEGIN
        SELECT CASE WHEN NEW.company_id IS NOT OLD.company_id OR NEW.site_id IS NOT OLD.site_id
          OR (OLD.public_profile_slug IS NOT NULL AND NEW.public_profile_slug IS NOT OLD.public_profile_slug)
          THEN RAISE(ABORT, 'company profile identity is immutable') END;
        INSERT INTO company_slug_reservations(country_code,slug,company_id)
          SELECT country_code,NEW.public_profile_slug,NEW.company_id FROM sites
          WHERE id=NEW.site_id AND NEW.public_profile_slug IS NOT NULL
          ON CONFLICT(country_code,slug) DO NOTHING;
        SELECT CASE WHEN NEW.public_profile_slug IS NOT NULL AND NOT EXISTS(
          SELECT 1 FROM company_slug_reservations r JOIN sites s ON s.country_code=r.country_code
          WHERE s.id=NEW.site_id AND r.slug=NEW.public_profile_slug AND r.company_id=NEW.company_id)
          THEN RAISE(ABORT, 'company slug reservation mismatch') END; END""",
    "company_slug_site_country_update": """BEFORE UPDATE OF country_code ON sites
        WHEN NEW.country_code IS NOT OLD.country_code AND EXISTS(SELECT 1 FROM company_sites WHERE site_id=OLD.id)
        BEGIN SELECT RAISE(ABORT, 'country of a company-bearing site is immutable'); END""",
    "company_slug_site_country_insert_format": """BEFORE INSERT ON sites BEGIN
        SELECT CASE WHEN length(NEW.country_code) != 2 OR substr(NEW.country_code,1,1) NOT BETWEEN 'A' AND 'Z'
          OR substr(NEW.country_code,2,1) NOT BETWEEN 'A' AND 'Z'
          THEN RAISE(ABORT, 'canonical ISO country required') END;
        SELECT CASE WHEN EXISTS(SELECT 1 FROM sites s JOIN company_sites cs ON cs.site_id=s.id
          WHERE (s.id=NEW.id OR s.code=NEW.code) AND s.country_code IS NOT NEW.country_code)
          THEN RAISE(ABORT, 'country of a company-bearing site is immutable') END; END""",
    "company_slug_site_country_update_format": """BEFORE UPDATE OF country_code ON sites WHEN
        length(NEW.country_code) != 2 OR substr(NEW.country_code,1,1) NOT BETWEEN 'A' AND 'Z'
        OR substr(NEW.country_code,2,1) NOT BETWEEN 'A' AND 'Z'
        BEGIN SELECT RAISE(ABORT, 'canonical ISO country required'); END""",
}

PG_FUNCTIONS = {
    "company_slug_reservation_guard": """BEGIN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'company slug reservations cannot be deleted'; END IF;
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.country_code IS DISTINCT FROM OLD.country_code
          OR NEW.slug IS DISTINCT FROM OLD.slug OR (NEW.company_id IS DISTINCT FROM OLD.company_id AND NOT
            (NEW.company_id IS NULL AND OLD.company_id IS NOT NULL AND
             NOT EXISTS(SELECT 1 FROM companies WHERE id=OLD.company_id)))
          THEN RAISE EXCEPTION 'company slug reservation is immutable'; END IF;
        RETURN NEW; END""",
    "company_slug_membership_guard": """BEGIN
        IF TG_OP = 'UPDATE' THEN
          IF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.site_id IS DISTINCT FROM OLD.site_id
            OR (OLD.public_profile_slug IS NOT NULL AND NEW.public_profile_slug IS DISTINCT FROM OLD.public_profile_slug)
            THEN RAISE EXCEPTION 'company profile identity is immutable'; END IF;
        END IF;
        -- Hold country identity even for a NULL legacy membership insert.
        -- Country UPDATE cannot pass its emptiness check concurrently.
        PERFORM 1 FROM sites WHERE id=NEW.site_id FOR SHARE;
        IF NEW.public_profile_slug IS NOT NULL THEN
          INSERT INTO company_slug_reservations(country_code,slug,company_id)
            SELECT country_code,NEW.public_profile_slug,NEW.company_id FROM sites WHERE id=NEW.site_id
            ON CONFLICT(country_code,slug) DO NOTHING;
          IF NOT EXISTS(SELECT 1 FROM company_slug_reservations r JOIN sites s ON s.country_code=r.country_code
            WHERE s.id=NEW.site_id AND r.slug=NEW.public_profile_slug AND r.company_id=NEW.company_id)
            THEN RAISE EXCEPTION 'company slug reservation mismatch'; END IF;
        END IF;
        RETURN NEW; END""",
    "company_slug_site_country_guard": """BEGIN
        IF length(NEW.country_code) != 2 OR NEW.country_code !~ '^[A-Z]{2}$'
          THEN RAISE EXCEPTION 'canonical ISO country required'; END IF;
        IF TG_OP = 'UPDATE' THEN
          IF NEW.country_code IS DISTINCT FROM OLD.country_code AND
            current_setting('transaction_isolation') NOT IN ('read committed', 'read uncommitted')
            THEN RAISE EXCEPTION 'country mutation requires fresh read committed snapshots'; END IF;
          IF NEW.country_code IS DISTINCT FROM OLD.country_code AND EXISTS(SELECT 1 FROM company_sites WHERE site_id=OLD.id)
            THEN RAISE EXCEPTION 'country of a company-bearing site is immutable'; END IF;
        END IF;
        RETURN NEW; END""",
}
PG_TRIGGERS = {
    "company_slug_reservation_no_delete": ("BEFORE DELETE", "company_slug_reservations", "company_slug_reservation_guard"),
    "company_slug_reservation_immutable": ("BEFORE UPDATE", "company_slug_reservations", "company_slug_reservation_guard"),
    "company_slug_membership_insert": ("BEFORE INSERT", "company_sites", "company_slug_membership_guard"),
    "company_slug_membership_update": ("BEFORE UPDATE", "company_sites", "company_slug_membership_guard"),
    "company_slug_site_country_update": ("BEFORE UPDATE OF country_code", "sites", "company_slug_site_country_guard"),
    "company_slug_site_country_insert_format": ("BEFORE INSERT", "sites", "company_slug_site_country_guard"),
}


def install_guards(connection):
    if connection.dialect.name == "sqlite":
        for name, sql in SQLITE_TRIGGERS.items():
            connection.exec_driver_sql(f"CREATE TRIGGER {name} {sql}")
    elif connection.dialect.name == "postgresql":
        for name, sql in PG_FUNCTIONS.items():
            connection.exec_driver_sql(f"CREATE FUNCTION {name}() RETURNS trigger LANGUAGE plpgsql AS $$ {sql} $$")
        for name, (timing, table, function) in PG_TRIGGERS.items():
            connection.exec_driver_sql(f"CREATE TRIGGER {name} {timing} ON {table} FOR EACH ROW EXECUTE FUNCTION {function}()")
    else:
        raise NotImplementedError("Country company slugs support SQLite and PostgreSQL only")


def remove_guards(connection):
    if connection.dialect.name == "sqlite":
        for name in SQLITE_TRIGGERS:
            connection.exec_driver_sql(f"DROP TRIGGER IF EXISTS {name}")
    elif connection.dialect.name == "postgresql":
        for name, (_, table, _) in PG_TRIGGERS.items():
            connection.exec_driver_sql(f"DROP TRIGGER IF EXISTS {name} ON {table}")
        for name in PG_FUNCTIONS:
            connection.exec_driver_sql(f"DROP FUNCTION IF EXISTS {name}()")


def claim(connection, reservations, country_code, slug, company_id):
    """An atomic unique-key insert is the arbiter, not a check-then-insert."""
    if connection.dialect.name == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    elif connection.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        raise NotImplementedError("Country company slugs support SQLite and PostgreSQL only")
    statement = insert(reservations).values(country_code=country_code, slug=slug, company_id=company_id)
    if connection.dialect.name == "sqlite":
        # Single serialized SQLite write statement, not a separate pre-check.
        # Skip foreign-owner keys inside the statement so the replace-hardening
        # trigger can reject raw conflicts without savepoints/autocommit quirks.
        foreign_owner = sa.exists(sa.select(reservations.c.id).where(
            reservations.c.country_code == country_code, reservations.c.slug == slug,
            sa.or_(reservations.c.company_id.is_(None), reservations.c.company_id != company_id),
        ))
        statement = insert(reservations).from_select(
            ["country_code", "slug", "company_id"],
            sa.select(sa.literal(country_code), sa.literal(slug), sa.literal(company_id)).where(~foreign_owner),
        )
    connection.execute(statement.on_conflict_do_nothing(index_elements=["country_code", "slug"]))
    owner = connection.execute(sa.select(reservations.c.company_id).where(
        reservations.c.country_code == country_code, reservations.c.slug == slug)).scalar_one()
    return owner == company_id


def allocate(connection, reservations, country_code, company_id, base, sector=None, city=None):
    for slug in candidates(base, sector, city):
        if claim(connection, reservations, country_code, slug, company_id):
            return slug
