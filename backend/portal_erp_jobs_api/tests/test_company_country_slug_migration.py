"""Disposable SQLite revision11→12 data/DDL and legacy-writer compatibility."""
import importlib.util
from pathlib import Path
import sqlite3
import unittest

import sqlalchemy as sa
import test_company_url_migration as fixtures
from src.company_slug_policy_v12 import SQLITE_TRIGGERS

ROOT = Path(__file__).resolve().parents[1]


class CompanyCountrySlugMigrationTests(unittest.TestCase):
    tearDown = fixtures.CompanyUrlMigrationTests.tearDown
    alembic = fixtures.CompanyUrlMigrationTests.alembic
    sql = fixtures.CompanyUrlMigrationTests.sql
    seed = fixtures.CompanyUrlMigrationTests.seed
    snapshot = fixtures.CompanyUrlMigrationTests.snapshot
    constraints = fixtures.CompanyUrlMigrationTests.constraints

    def setUp(self):
        fixtures.CompanyUrlMigrationTests.setUp(self)
        self.alembic("upgrade", "20261111_11")
        self.sql("""INSERT INTO sites(code,name,country_code,default_locale,currency_code,timezone,is_active,created_at,updated_at)
                 VALUES('BR2','Second Brazil','BR','pt-BR','BRL','UTC',0,'2026-10-01','2026-10-02')""")
        self.site_ids["BR2"] = self.sql("SELECT id FROM sites WHERE code='BR2'")[0][0]

    def previous_snapshot(self):
        data = self.snapshot()
        data.pop("company_slug_reservations", None)
        return data

    def extra_company(self, number, *, name="Mégasoft", slug="megasoft", site="BR", status="pending", sector=None, city=None):
        self.sql("INSERT INTO users(id,email,user_type,is_active) VALUES(?,?,'company',1)", (number, f"fixture-{number}@example.invalid"))
        self.sql("INSERT INTO companies(id,user_id,company_name,sector,city) VALUES(?,?,?,?,?)", (number, number, name, sector, city))
        self.sql("""INSERT INTO company_sites(company_id,site_id,status,display_name,public_profile_slug,created_at,updated_at)
                 VALUES(?,?,?,?,?,'2026-10-01','2026-10-02')""", (number, self.site_ids[site], status, name, slug))

    def profile(self, number):
        return self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=? ORDER BY id", (number,))[0][0]

    def test_collision_migration_preserves_unique_snapshots_and_reserves_all_statuses_countries(self):
        self.extra_company(510, name="Mégasoft", sector="Software", city="São Paulo")
        self.extra_company(511, name="Me\u0301gasoft", site="BR2", status="suspended", sector="Software", city="São Paulo")
        self.extra_company(512, name="Ｍｅｇａｓｏｆｔ", status="rejected", sector="Software", city="São Paulo")
        self.extra_company(513, name="Megasoft", status="approved", sector="Software", city="São Paulo")
        # A later unique existing key must never be stolen by qualifier allocation.
        self.extra_company(514, name="Independent", slug="megasoft-software")
        self.extra_company(515, name="Megasoft", site="MX", status="approved")
        self.extra_company(516, name="123", slug="123")
        self.extra_company(517, name="api", slug="api")
        self.extra_company(518, name="Fresh Brand", slug=None)
        before = self.previous_snapshot()
        old_constraints = self.constraints()
        self.alembic("upgrade", "head")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261111_12",)])
        self.assertEqual(self.previous_snapshot(), before)
        constraints = self.constraints()
        constraints.pop("company_slug_reservations")
        self.assertEqual(constraints, old_constraints)
        self.assertEqual([self.profile(i) for i in range(510, 519)], [
            "megasoft", "megasoft-sao-paulo", "megasoft-software-sao-paulo",
            "megasoft-software-sao-paulo-a", "megasoft-software", "megasoft", "empresa-d", "empresa-e", "fresh-brand",
        ])
        self.assertEqual(self.sql("SELECT DISTINCT updated_at FROM company_sites WHERE company_id>=510"), [("2026-10-02",)])
        self.assertEqual(self.sql("SELECT public_company_slug,public_title_slug FROM jobs WHERE id=601"), [("historic-job-brand", "historic-job-title")])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.assertEqual({row[0] for row in self.sql("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'company_slug_%'")}, set(SQLITE_TRIGGERS))
        self.assertIn("No new upgrade operations detected", self.alembic("check").stdout)

    def test_upgrade_downgrade_roundtrip_preserves_all_previous_schema_and_allocated_slugs(self):
        before, constraints = self.previous_snapshot(), self.constraints()
        self.alembic("upgrade", "head")
        allocated = self.sql("SELECT id,public_profile_slug FROM company_sites ORDER BY id")
        self.alembic("check")
        self.alembic("downgrade", "20261111_11")
        self.assertEqual(self.previous_snapshot(), before)
        self.assertEqual(self.constraints(), constraints)
        self.assertEqual(self.sql("SELECT id,public_profile_slug FROM company_sites ORDER BY id"), allocated)
        self.assertEqual(self.sql("SELECT name FROM sqlite_master WHERE name LIKE 'company_slug_%'"), [])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.alembic("upgrade", "head")
        self.assertEqual(self.sql("SELECT id,public_profile_slug FROM company_sites ORDER BY id"), allocated)
        self.alembic("check")
        self.alembic("downgrade", "20261110_09")
        # Revision10 snapshots intentionally disappear below revision10; every
        # earlier job column and all other old rows still survive byte-for-byte.
        below = self.previous_snapshot()
        expected = dict(before)
        expected["jobs"] = [row[:-2] for row in before["jobs"]]
        self.assertEqual(below, expected)
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])

    def test_raw_writes_uniqueness_snapshot_membership_country_reservation_and_replace_bypass(self):
        self.extra_company(510)
        self.alembic("upgrade", "head")
        self.extra_company(511, name="Other", slug=None, site="BR2")
        self.extra_company(512, name="Mexico", slug="megasoft", site="MX")
        self.assertEqual(self.profile(512), "megasoft")
        attacks = [
            ("UPDATE company_sites SET public_profile_slug='megasoft' WHERE company_id=511", ()),
            ("UPDATE company_sites SET public_profile_slug=NULL WHERE company_id=510", ()),
            ("UPDATE company_sites SET public_profile_slug='different' WHERE company_id=510", ()),
            ("UPDATE company_sites SET company_id=511 WHERE company_id=510", ()),
            ("UPDATE company_sites SET site_id=? WHERE company_id=510", (self.site_ids["US"],)),
            ("UPDATE sites SET country_code='MX' WHERE id=?", (self.site_ids["BR"],)),
            ("UPDATE sites SET country_code='br' WHERE id=?", (self.site_ids["US"],)),
            ("UPDATE company_slug_reservations SET company_id=511 WHERE slug='megasoft' AND country_code='BR'", ()),
            ("UPDATE company_slug_reservations SET country_code='US' WHERE slug='megasoft' AND country_code='BR'", ()),
            ("DELETE FROM company_slug_reservations WHERE slug='megasoft'", ()),
            ("INSERT OR REPLACE INTO company_slug_reservations(country_code,slug,company_id) VALUES('BR','megasoft',511)", ()),
            ("INSERT OR REPLACE INTO company_sites(company_id,site_id,status,public_profile_slug) VALUES(510,?,'pending','different')", (self.site_ids["BR"],)),
            ("INSERT OR REPLACE INTO company_sites(company_id,site_id,status,public_profile_slug) VALUES(510,?,'pending',NULL)", (self.site_ids["BR"],)),
        ]
        for statement, params in attacks:
            with self.subTest(statement=statement), self.assertRaises(sqlite3.IntegrityError):
                self.sql(statement, params)
        for slug in ("123", "api", "Megasoft", "mégasoft", "a--b", "a" * 141, ""):
            with self.subTest(slug=slug), self.assertRaises(sqlite3.IntegrityError):
                self.sql("UPDATE company_sites SET public_profile_slug=? WHERE company_id=511", (slug,))
        self.assertIsNone(self.profile(511))
        self.sql("UPDATE company_sites SET public_profile_slug='safe-legacy' WHERE company_id=511")
        self.assertEqual(self.profile(511), "safe-legacy")
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])

    def test_hard_delete_preserves_nullable_tombstone_and_cannot_claim_even_with_replace(self):
        self.extra_company(510)
        self.alembic("upgrade", "head")
        self.sql("DELETE FROM company_sites WHERE company_id=510")
        self.sql("DELETE FROM companies WHERE id=510")
        self.assertEqual(self.sql("SELECT company_id FROM company_slug_reservations WHERE country_code='BR' AND slug='megasoft'"), [(None,)])
        self.extra_company(511, name="Another", slug=None)
        for statement in (
            "UPDATE company_sites SET public_profile_slug='megasoft' WHERE company_id=511",
            "INSERT OR REPLACE INTO company_slug_reservations(country_code,slug,company_id) VALUES('BR','megasoft',511)",
            "UPDATE company_slug_reservations SET company_id=511 WHERE country_code='BR' AND slug='megasoft'",
        ):
            with self.assertRaises(sqlite3.IntegrityError):
                self.sql(statement)
        self.assertIsNone(self.profile(511))

    def test_revision11_old_orm_insert_unique_name_is_reserved_without_new_code(self):
        """An isolated legacy mapping copies revision11's before_insert hook."""
        self.alembic("upgrade", "head")
        module_path = ROOT / "migrations/versions/20261111_11_add_public_company_profile_slugs.py"
        spec = importlib.util.spec_from_file_location("legacy_slug_v11", module_path)
        legacy = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(legacy)
        self.sql("INSERT INTO users(id,email,user_type,is_active) VALUES(520,'legacy@example.invalid','company',1)")
        self.sql("INSERT INTO companies(id,user_id,company_name) VALUES(520,520,'Legacy Writer Unique')")
        from sqlalchemy.orm import DeclarativeBase, Session
        class Base(DeclarativeBase):
            pass
        class LegacyMembership(Base):
            __tablename__ = "company_sites"
            id = sa.Column(sa.Integer, primary_key=True)
            company_id = sa.Column(sa.Integer)
            site_id = sa.Column(sa.Integer)
            display_name = sa.Column(sa.String)
            public_profile_slug = sa.Column(sa.String)
            status = sa.Column(sa.String)
        @sa.event.listens_for(LegacyMembership, "before_insert")
        def old_snapshot(mapper, connection, target):
            company_name = connection.execute(sa.text("SELECT company_name FROM companies WHERE id=:id"), {"id": target.company_id}).scalar_one()
            if not target.public_profile_slug:
                target.public_profile_slug = legacy._public_company_slug_v1(target.display_name, company_name)
        engine = sa.create_engine(self.env["DATABASE_URL"])
        try:
            with Session(engine) as session:
                member = LegacyMembership(company_id=520, site_id=self.site_ids["BR"], status="pending")
                session.add(member)
                session.commit()
                self.assertEqual(member.public_profile_slug, "legacy-writer-unique")
            self.assertEqual(self.sql("SELECT company_id FROM company_slug_reservations WHERE country_code='BR' AND slug='legacy-writer-unique'"), [(520,)])
            self.extra_company(521, name="Legacy Collision", slug=None, site="BR2")
            with Session(engine) as session:
                session.execute(sa.text("DELETE FROM company_sites WHERE company_id=521"))
                session.commit()
                member = LegacyMembership(company_id=521, site_id=self.site_ids["BR2"], status="pending", display_name="Legacy Writer Unique")
                session.add(member)
                with self.assertRaises(sa.exc.IntegrityError):
                    session.commit()
                session.rollback()
            self.assertEqual(self.sql("SELECT count(*) FROM company_sites WHERE company_id=521"), [(0,)])
        finally:
            engine.dispose()
        # Schema downgrade retains legitimate legacy rows and their slugs.
        self.alembic("downgrade", "20261111_11")
        self.assertEqual(self.profile(520), "legacy-writer-unique")

    def test_chunked_collision_backfill_is_deterministic_and_not_quadratic_db_queries(self):
        with sqlite3.connect(self.path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            for number in range(507):
                identity = 2000 + number * 2
                connection.execute("INSERT INTO users(id,email,user_type,is_active) VALUES(?,?,'company',1)", (identity, f"chunk-{number}@example.invalid"))
                connection.execute("INSERT INTO companies(id,user_id,company_name) VALUES(?,?,'Chunk Brand')", (identity, identity))
                connection.execute("INSERT INTO company_sites(company_id,site_id,status,public_profile_slug) VALUES(?,?,'pending','chunk-brand')", (identity, self.site_ids["BR"]))
        before = self.previous_snapshot()
        self.alembic("upgrade", "head")
        slugs = self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id>=2000 ORDER BY id")
        self.assertEqual(len(set(slugs)), 507)
        self.assertEqual(slugs[:3], [("chunk-brand",), ("chunk-brand-a",), ("chunk-brand-b",)])
        self.assertEqual(self.previous_snapshot(), before)
        self.alembic("check")


if __name__ == "__main__":
    unittest.main()
