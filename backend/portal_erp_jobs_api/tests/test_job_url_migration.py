"""Isolated Alembic URL snapshot migration and code-only rollback checks."""
import importlib.util
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest

import sqlalchemy as sa

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT / ".venv/bin/python"
SLUG_COLUMNS = {"public_company_slug", "public_title_slug"}


class JobUrlMigrationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="jobs-url-migration-")
        self.path = Path(self.directory.name) / "test.db"
        self.env = {
            **os.environ, "DATABASE_URL": f"sqlite:///{self.path}",
            "SECRET_KEY": "migration-test-secret-at-least-thirty-two-characters",
            "JWT_SECRET_KEY": "migration-test-jwt-at-least-thirty-two-characters",
            "FLASK_ENV": "testing",
        }
        self.alembic("upgrade", "20261110_09")
        self.seed()

    def tearDown(self):
        self.directory.cleanup()

    def alembic(self, *args):
        result = subprocess.run([str(PYTHON), "-m", "alembic", *args], cwd=ROOT,
                                env=self.env, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def sql(self, statement, parameters=()):
        with sqlite3.connect(self.path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            return connection.execute(statement, parameters).fetchall()

    def seed(self):
        for user_id, kind in ((301, "company"), (302, "candidate"), (303, "company"), (304, "company")):
            self.sql("INSERT INTO users(id,email,user_type,is_active) VALUES(?,?,?,1)",
                     (user_id, f"fixture-{user_id}@example.invalid", kind))
        for company_id, user_id, name in ((401, 301, "Global_ACME Áção"), (403, 303, ""), (404, 304, "")):
            self.sql("INSERT INTO companies(id,user_id,company_name) VALUES(?,?,?)", (company_id, user_id, name))
        self.site_ids = dict(self.sql("SELECT code,id FROM sites"))
        for company_id, code, name in ((401, "BR", "Regional_São Paulo"), (401, "MX", "Regional_México"), (403, "BR", "  "), (404, "BR", None)):
            self.sql("INSERT INTO company_sites(company_id,site_id,status,display_name) VALUES(?,?,'approved',?)",
                     (company_id, self.site_ids[code], name))
        self.sql("INSERT INTO candidates(id,user_id,first_name,last_name) VALUES(501,302,'Test','Candidate')")
        self.sql("INSERT INTO candidate_sites(candidate_id,site_id) VALUES(501,?)", (self.site_ids["BR"],))
        jobs = [
            (601, 401, "BR", "Consultor_ERP Sênior", 0),
            (602, 401, "BR", "Consultor_ERP Sênior", 0),
            (603, 401, "BR", "Confidencial", 1),
            (604, 401, "MX", "Gerência México", 0),
            (605, 403, "BR", "東京 数据", 0),
            (606, 404, "BR", "", 0),
        ]
        for job_id, company_id, code, title, hidden in jobs:
            self.sql("""INSERT INTO jobs(id,company_id,site_id,title,description,is_company_hidden,
                     status,is_active,is_featured,created_at,updated_at)
                     VALUES(?,?,?,?,'Fixture without PII',?,'active',1,0,'2026-10-01','2026-10-02')""",
                     (job_id, company_id, self.site_ids[code], title, hidden))
        self.sql("INSERT INTO applications(id,job_id,candidate_id,site_id,status) VALUES(701,601,501,?,'applied')", (self.site_ids["BR"],))
        self.sql("INSERT INTO application_status_events(id,application_id,to_status,actor_user_id,actor_role) VALUES(801,701,'applied',302,'candidate')")
        self.sql("INSERT INTO skills(id,name) VALUES(901,'SQL')")
        self.sql("INSERT INTO job_skills(id,job_id,skill_id) VALUES(902,601,901)")
        self.sql("INSERT INTO candidate_skills(id,candidate_id,skill_id) VALUES(903,501,901)")

    def snapshot(self):
        tables = self.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version' ORDER BY name")
        result = {}
        for (name,) in tables:
            columns = [row[1] for row in self.sql(f'PRAGMA table_info("{name}")')
                       if row[1] not in SLUG_COLUMNS
                       and not (name == "company_sites" and row[1] == "public_profile_slug")]
            selected = ",".join(f'"{column}"' for column in columns)
            result[name] = self.sql(f'SELECT {selected} FROM "{name}" ORDER BY 1')
        return result

    def constraints(self):
        result = {}
        for name in ("jobs", "applications", "company_sites", "application_status_events"):
            # SQLite reassigns FK/index ordinals when Alembic rebuilds a table.
            # Preserve composite grouping, ordered columns, targets and actions.
            groups = {}
            for row in self.sql(f'PRAGMA foreign_key_list("{name}")'):
                groups.setdefault(row[0], []).append(row)
            foreign_keys = []
            for rows in groups.values():
                rows.sort(key=lambda row: row[1])
                first = rows[0]
                foreign_keys.append((first[2], tuple((row[3], row[4]) for row in rows), first[5], first[6], first[7]))
            indexes = []
            for _, index_name, unique, origin, partial in self.sql(f'PRAGMA index_list("{name}")'):
                columns = tuple((row[0], row[2], row[3], row[4], row[5]) for row in self.sql(f'PRAGMA index_xinfo("{index_name}")'))
                indexes.append((index_name, unique, origin, partial, columns))
            result[name] = (sorted(foreign_keys), sorted(indexes))
        return result

    def backfill(self):
        spec = importlib.util.spec_from_file_location("slug_migration", ROOT / "migrations/versions/20261111_10_add_public_job_slugs.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        engine = sa.create_engine(self.env["DATABASE_URL"])
        try:
            with engine.begin() as connection:
                module._backfill(connection)
        finally:
            engine.dispose()

    def test_upgrade_backfill_downgrade_roundtrip_preserves_every_existing_column_and_fk(self):
        before, constraints = self.snapshot(), self.constraints()
        self.alembic("upgrade", "20261111_10")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261111_10",)])
        self.alembic("upgrade", "head")
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261111_11",)])
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.constraints(), constraints)
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.assertEqual(self.sql("SELECT id,public_company_slug,public_title_slug FROM jobs ORDER BY id"), [
            (601, "regional-sao-paulo", "consultor-erp-senior"),
            (602, "regional-sao-paulo", "consultor-erp-senior"),
            (603, "empresa-confidencial", "confidencial"),
            (604, "regional-mexico", "gerencia-mexico"),
            (605, "empresa", "vaga"), (606, "empresa", "vaga"),
        ])
        columns = {row[1]: row for row in self.sql("PRAGMA table_info(jobs)")}
        for name in SLUG_COLUMNS:
            self.assertEqual(columns[name][2], "VARCHAR(140)")
            self.assertEqual(columns[name][3], 0)
        result = self.alembic("check")
        self.assertIn("No new upgrade operations detected", result.stdout)
        self.alembic("downgrade", "20261110_09")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.constraints(), constraints)
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.assertFalse(SLUG_COLUMNS.intersection(row[1] for row in self.sql("PRAGMA table_info(jobs)")))
        self.alembic("upgrade", "head")
        self.assertEqual(self.snapshot(), before)
        self.alembic("check")

    def test_idempotent_core_backfill_preserves_nonnull_snapshots_and_timestamp(self):
        self.alembic("upgrade", "head")
        snapshots = self.sql("SELECT id,public_company_slug,public_title_slug FROM jobs ORDER BY id")
        self.sql("UPDATE jobs SET title='Edited after snapshot' WHERE id=601")
        self.sql("UPDATE company_sites SET display_name='Renamed after snapshot' WHERE company_id=401")
        self.backfill()
        self.backfill()
        self.assertEqual(self.sql("SELECT id,public_company_slug,public_title_slug FROM jobs ORDER BY id"), snapshots)
        self.sql("UPDATE jobs SET public_company_slug=NULL WHERE id=603")
        self.sql("UPDATE jobs SET public_title_slug=NULL WHERE id=605")
        self.sql("UPDATE jobs SET public_company_slug='manually-preserved' WHERE id=606")
        before = self.snapshot()
        self.backfill()
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.sql("SELECT public_company_slug FROM jobs WHERE id=603"), [("empresa-confidencial",)])
        self.assertEqual(self.sql("SELECT public_title_slug FROM jobs WHERE id=605"), [("vaga",)])
        self.assertEqual(self.sql("SELECT public_company_slug FROM jobs WHERE id=606"), [("manually-preserved",)])
        self.assertEqual(self.sql("SELECT DISTINCT updated_at FROM jobs"), [("2026-10-02",)])

    def test_legacy_sql_writers_work_without_restoring_database_after_code_rollback(self):
        self.alembic("upgrade", "head")
        self.sql("INSERT INTO jobs(id,company_id,site_id,title,description,status,is_featured) VALUES(607,401,?,'Rollback writer','Fixture','active',0)", (self.site_ids["BR"],))
        self.assertEqual(self.sql("SELECT public_company_slug,public_title_slug FROM jobs WHERE id=607"), [(None, None)])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        self.backfill()
        self.assertEqual(self.sql("SELECT public_company_slug,public_title_slug FROM jobs WHERE id=607"), [("regional-sao-paulo", "rollback-writer")])

    def test_backfill_processes_more_than_one_chunk(self):
        with sqlite3.connect(self.path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            connection.executemany("INSERT INTO jobs(id,company_id,site_id,title,description,status,is_featured) VALUES(?,401,?,'Chunk_Title','Fixture','active',0)",
                                   [(job_id, self.site_ids["BR"]) for job_id in range(1000, 1507)])
        before = self.snapshot()
        self.alembic("upgrade", "head")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.sql("SELECT count(*) FROM jobs WHERE public_company_slug IS NULL OR public_title_slug IS NULL"), [(0,)])
        self.assertEqual(self.sql("SELECT public_title_slug FROM jobs WHERE id=1506"), [("chunk-title",)])
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])


if __name__ == "__main__":
    unittest.main()
