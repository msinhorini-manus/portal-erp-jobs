"""Isolated 20261111_10 -> 20261111_11 company profile slug migration tests."""
import importlib.util
from pathlib import Path
import sqlite3
import unittest
from unittest.mock import patch

import sqlalchemy as sa
import test_job_url_migration as fixtures

ROOT = Path(__file__).resolve().parents[1]
PROFILE_COLUMN = "public_profile_slug"


class CompanyUrlMigrationTests(unittest.TestCase):
    tearDown = fixtures.JobUrlMigrationTests.tearDown
    alembic = fixtures.JobUrlMigrationTests.alembic
    sql = fixtures.JobUrlMigrationTests.sql
    seed = fixtures.JobUrlMigrationTests.seed

    def setUp(self):
        fixtures.JobUrlMigrationTests.setUp(self)
        self.alembic("upgrade", "20261111_10")
        # All regional approval states and global-name fallback, without PII.
        for company_id, user_id, name, display_name, status in (
            (405, 305, "Global_Áção", None, "approved"),
            (406, 306, "Legal", "___!!!", "pending"),
            (407, 307, "Global_Áção", "  ", "suspended"),
            (408, 308, "Legal", "東京 数据", "rejected"),
            (409, 309, "Legal", "Á" * 100, "approved"),
        ):
            self.sql("INSERT INTO users(id,email,user_type,is_active) VALUES(?,?,'company',1)",
                     (user_id, f"fixture-{user_id}@example.invalid"))
            self.sql("INSERT INTO companies(id,user_id,company_name) VALUES(?,?,?)", (company_id, user_id, name))
            self.sql("""INSERT INTO company_sites(company_id,site_id,status,display_name,created_at,updated_at)
                     VALUES(?,?,?,?,'2026-10-01','2026-10-02')""",
                     (company_id, self.site_ids["BR"], status, display_name))
        # Existing job snapshots must remain byte-for-byte independent of profiles.
        self.sql("UPDATE jobs SET public_company_slug='historic-job-brand', public_title_slug='historic-job-title' WHERE id=601")

    def migration(self):
        spec = importlib.util.spec_from_file_location(
            "company_profile_slug_migration", ROOT / "migrations/versions/20261111_11_add_public_company_profile_slugs.py",
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def backfill(self):
        engine = sa.create_engine(self.env["DATABASE_URL"])
        try:
            with engine.begin() as connection:
                self.migration()._backfill(connection)
        finally:
            engine.dispose()

    def snapshot(self):
        result = {}
        for (name,) in self.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version' ORDER BY name"):
            columns = [row[1] for row in self.sql(f'PRAGMA table_info("{name}")')
                       if not (name == "company_sites" and row[1] == PROFILE_COLUMN)]
            selected = ",".join(f'"{column}"' for column in columns)
            result[name] = self.sql(f'SELECT {selected} FROM "{name}" ORDER BY 1')
        return result

    def constraints(self):
        # Covers every table: named CHECK/UNIQUE, composite grouping and ordered
        # FK columns/targets/actions, indexes (including partial), column defaults,
        # nullability and PKs. FK/index ordinal assignment is not an invariant.
        engine = sa.create_engine(self.env["DATABASE_URL"])
        try:
            inspector = sa.inspect(engine)
            result = {}
            for name in inspector.get_table_names():
                if name == "alembic_version":
                    continue
                fks = [(fk["name"], tuple(fk["constrained_columns"]), fk["referred_table"],
                        tuple(fk["referred_columns"]), tuple(sorted(fk["options"].items())))
                       for fk in inspector.get_foreign_keys(name)]
                uniques = [(item["name"], tuple(item["column_names"])) for item in inspector.get_unique_constraints(name)]
                checks = [(item["name"], item["sqltext"]) for item in inspector.get_check_constraints(name)]
                indexes = []
                for _, index_name, unique, origin, partial in self.sql(f'PRAGMA index_list("{name}")'):
                    columns = tuple((row[0], row[2], row[3], row[4], row[5])
                                    for row in self.sql(f'PRAGMA index_xinfo("{index_name}")'))
                    indexes.append((index_name, unique, origin, partial, columns))
                columns = [row for row in self.sql(f'PRAGMA table_info("{name}")')
                           if not (name == "company_sites" and row[1] == PROFILE_COLUMN)]
                pk = inspector.get_pk_constraint(name)
                result[name] = (sorted(fks, key=repr), sorted(uniques, key=repr), sorted(checks, key=repr),
                                sorted(indexes), columns, pk["name"], tuple(pk["constrained_columns"]))
            return result
        finally:
            engine.dispose()

    def profile_snapshot(self):
        return self.sql("SELECT company_id,site_id,public_profile_slug FROM company_sites ORDER BY company_id,site_id")

    def test_additive_upgrade_roundtrip_preserves_all_rows_columns_constraints_and_job_snapshots(self):
        before, constraints = self.snapshot(), self.constraints()
        rootpages = self.sql("SELECT name,rootpage FROM sqlite_master WHERE type='table' ORDER BY name")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261111_10",)])
        module = self.migration()
        self.assertEqual(module.revision, "20261111_11")
        self.assertEqual(module.down_revision, "20261111_10")
        self.alembic("upgrade", "head")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261111_11",)])
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.constraints(), constraints)
        # ADD COLUMN must not rebuild any SQLite table, even referenced parents.
        self.assertEqual(self.sql("SELECT name,rootpage FROM sqlite_master WHERE type='table' ORDER BY name"), rootpages)
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        column = next(row for row in self.sql("PRAGMA table_info(company_sites)") if row[1] == PROFILE_COLUMN)
        self.assertEqual(column[2:], ("VARCHAR(140)", 0, None, 0))
        expected = {
            (401, self.site_ids["BR"]): "regional-sao-paulo",
            (401, self.site_ids["MX"]): "regional-mexico",
            (403, self.site_ids["BR"]): "empresa", (404, self.site_ids["BR"]): "empresa",
            (405, self.site_ids["BR"]): "global-acao", (406, self.site_ids["BR"]): "empresa",
            (407, self.site_ids["BR"]): "global-acao", (408, self.site_ids["BR"]): "empresa",
            (409, self.site_ids["BR"]): "a" * 100,
        }
        self.assertEqual({(company_id, site_id): slug for company_id, site_id, slug in self.profile_snapshot()}, expected)
        self.assertEqual(self.sql("SELECT public_company_slug,public_title_slug FROM jobs WHERE id=601"),
                         [("historic-job-brand", "historic-job-title")])
        self.assertIn("No new upgrade operations detected", self.alembic("check").stdout)
        self.alembic("downgrade", "20261111_10")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261111_10",)])
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.constraints(), constraints)
        self.assertNotIn(PROFILE_COLUMN, [row[1] for row in self.sql("PRAGMA table_info(company_sites)")])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.alembic("upgrade", "head")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.constraints(), constraints)
        self.assertEqual({(company_id, site_id): slug for company_id, site_id, slug in self.profile_snapshot()}, expected)
        self.alembic("check")

    def test_idempotent_backfill_preserves_nonnull_empty_snapshots_and_timestamps(self):
        self.alembic("upgrade", "head")
        snapshots = self.profile_snapshot()
        self.sql("UPDATE company_sites SET display_name='Rename after snapshot' WHERE company_id=401")
        self.sql("UPDATE companies SET company_name='Global rename after snapshot' WHERE id=405")
        before = self.snapshot()
        self.backfill()
        self.backfill()
        self.assertEqual(self.profile_snapshot(), snapshots)
        self.assertEqual(self.snapshot(), before)
        self.sql("UPDATE company_sites SET public_profile_slug=NULL WHERE company_id=405")
        self.sql("UPDATE company_sites SET public_profile_slug='manually-preserved' WHERE company_id=406")
        self.sql("UPDATE company_sites SET public_profile_slug='' WHERE company_id=407")
        self.backfill()
        self.assertEqual(self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=405"), [("global-rename-after-snapshot",)])
        self.assertEqual(self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=406"), [("manually-preserved",)])
        self.assertEqual(self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=407"), [("",)])
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.sql("SELECT DISTINCT updated_at FROM company_sites WHERE company_id>=405"), [("2026-10-02",)])

    def test_frozen_helper_is_independent_of_runtime_normalizer_and_matches_v1_cases(self):
        from src.job_slugs import public_company_slug
        module = self.migration()
        for regional, global_name in (("Marca_Áção", "Global"), ("  ", "Global_México"),
                                      (None, None), ("東京", "Global"), ("Ｄｅｖ", "Global"),
                                      ("a-" * 200, "Global"), (None, "Global_Áção")):
            with self.subTest(regional=regional, global_name=global_name):
                self.assertEqual(module._public_company_slug_v1(regional, global_name), public_company_slug(regional, global_name))
        self.alembic("upgrade", "head")
        self.sql("UPDATE company_sites SET public_profile_slug=NULL WHERE company_id=401")
        with patch("src.job_slugs.public_company_slug", return_value="future-runtime-behavior"):
            self.backfill()
        self.assertEqual(self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=401 ORDER BY site_id"),
                         [("regional-sao-paulo",), ("regional-mexico",)])

    def test_legacy_writer_remains_nullable_and_safe_downgrade_keeps_inserted_membership_and_job(self):
        self.alembic("upgrade", "head")
        self.sql("INSERT INTO company_sites(company_id,site_id,status,display_name) VALUES(401,?,'approved','Legacy_Marca')",
                 (self.site_ids["US"],))
        self.assertEqual(self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=401 AND site_id=?",
                                 (self.site_ids["US"],)), [(None,)])
        self.sql("""INSERT INTO jobs(id,company_id,site_id,title,description,status,is_featured,
                 public_company_slug,public_title_slug) VALUES(607,401,?,'Legacy job','Fixture','active',0,'job-snapshot','job-title')""",
                 (self.site_ids["US"],))
        before = self.snapshot()
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.alembic("downgrade", "20261111_10")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.alembic("upgrade", "head")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.sql("SELECT public_profile_slug FROM company_sites WHERE company_id=401 AND site_id=?",
                                 (self.site_ids["US"],)), [("legacy-marca",)])
        self.alembic("check")

    def assert_constraints_enforced(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("INSERT INTO company_sites(company_id,site_id,status) VALUES(401,?,'approved')", (self.site_ids["BR"],))
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("UPDATE company_sites SET status='invalid' WHERE company_id=401")
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("UPDATE company_sites SET max_active_jobs=-1 WHERE company_id=401")
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("INSERT INTO company_sites(company_id,site_id,status) VALUES(999999,?,'approved')", (self.site_ids["BR"],))
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("INSERT INTO company_sites(company_id,site_id,status) VALUES(401,999999,'approved')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("UPDATE jobs SET site_id=? WHERE id=601", (self.site_ids["US"],))
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("UPDATE applications SET site_id=? WHERE id=701", (self.site_ids["MX"],))
        with self.assertRaises(sqlite3.IntegrityError):
            self.sql("DELETE FROM company_sites WHERE company_id=401 AND site_id=?", (self.site_ids["BR"],))
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])

    def test_upgrade_and_downgrade_retain_real_fk_unique_check_and_composite_enforcement(self):
        self.assert_constraints_enforced()
        self.alembic("upgrade", "head")
        self.assert_constraints_enforced()
        self.alembic("downgrade", "20261111_10")
        self.assert_constraints_enforced()

    def test_backfill_keyset_covers_multiple_chunks_with_gaps(self):
        with sqlite3.connect(self.path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            for number in range(507):
                user_id, company_id = 1000 + number * 2, 2000 + number * 2
                connection.execute("INSERT INTO users(id,email,user_type,is_active) VALUES(?,?,'company',1)",
                                   (user_id, f"chunk-{number}@example.invalid"))
                connection.execute("INSERT INTO companies(id,user_id,company_name) VALUES(?,?,'Global')", (company_id, user_id))
                connection.execute("INSERT INTO company_sites(company_id,site_id,status,display_name) VALUES(?,?,'pending','Chunk_Marca Áção')",
                                   (company_id, self.site_ids["BR"]))
        before = self.snapshot()
        self.alembic("upgrade", "head")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.sql("SELECT count(*) FROM company_sites WHERE public_profile_slug IS NULL"), [(0,)])
        self.assertEqual(self.sql("SELECT count(*) FROM company_sites WHERE public_profile_slug='chunk-marca-acao'"), [(507,)])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])

    def test_full_head_to_previous_domain_revision_roundtrip_keeps_original_data(self):
        # Head can safely roll both additive URL revisions back; job URL
        # reconstruction on re-upgrade is separate from the company snapshot.
        self.sql("UPDATE jobs SET public_company_slug='regional-sao-paulo',public_title_slug='consultor-erp-senior' WHERE id=601")
        before = self.snapshot()
        self.alembic("upgrade", "head")
        self.alembic("downgrade", "20261110_09")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261110_09",)])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.assertNotIn(PROFILE_COLUMN, [row[1] for row in self.sql("PRAGMA table_info(company_sites)")])
        self.alembic("upgrade", "head")
        self.assertEqual(self.snapshot(), before)
        self.alembic("check")


if __name__ == "__main__":
    unittest.main()
