"""Schema-only wave 1 migration tests; each Alembic command has a test DB."""
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT / ".venv/bin/python"


class GlobalOneMigrationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="jobs-global1-migration-")
        self.path = Path(self.directory.name) / "test.db"
        self.env = {
            **os.environ,
            "DATABASE_URL": f"sqlite:///{self.path}",
            "SECRET_KEY": "migration-test-secret-at-least-thirty-two-characters",
            "JWT_SECRET_KEY": "migration-test-jwt-at-least-thirty-two-characters",
            "FLASK_ENV": "testing",
        }
        self.run_alembic("upgrade", "20260930_08")

    def tearDown(self):
        self.directory.cleanup()

    def run_alembic(self, action, revision, *, success=True):
        result = subprocess.run(
            [str(PYTHON), "-m", "alembic", action, revision], cwd=ROOT,
            env=self.env, capture_output=True, text=True, timeout=60,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def sql(self, statement, parameters=()):
        with sqlite3.connect(self.path) as connection:
            return connection.execute(statement, parameters).fetchall()

    def snapshot(self):
        tables = self.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version' ORDER BY name")
        return {name: self.sql(f'SELECT * FROM "{name}" ORDER BY 1') for (name,) in tables}

    def schema(self):
        return self.sql("SELECT type, name, sql FROM sqlite_master WHERE tbl_name='site_domains' ORDER BY type,name")

    def add_domain(self, host, prefix, code="MX", primary=0, active=1):
        self.sql(
            "INSERT INTO site_domains(site_id,hostname,url_prefix,is_primary,is_active,created_at,updated_at) SELECT id,?,?,?,?,'2026-11-10','2026-11-10' FROM sites WHERE code=?",
            (host, prefix, primary, active, code),
        )

    def test_full_upgrade_downgrade_roundtrip_preserves_every_row_and_br_configuration(self):
        self.add_domain("legacy-alias.invalid", "/legacy", code="BR")
        self.sql("INSERT INTO users(email,user_type,is_active,created_at,updated_at) VALUES('migration@example.invalid','candidate',1,'2026-11-10','2026-11-10')")
        before = self.snapshot()
        self.run_alembic("upgrade", "20261110_09")
        self.assertEqual(before, self.snapshot())
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])
        indexes = {row[1]: row[2] for row in self.sql("PRAGMA index_list(site_domains)")}
        self.assertEqual(indexes["ix_site_domains_hostname"], 0)
        self.assertEqual(indexes["uq_site_domains_primary"], 1)
        self.run_alembic("downgrade", "20260930_08")
        self.assertEqual(before, self.snapshot())
        indexes = {row[1]: row[2] for row in self.sql("PRAGMA index_list(site_domains)")}
        self.assertEqual(indexes["ix_site_domains_hostname"], 1)
        self.run_alembic("upgrade", "20261110_09")
        self.assertEqual(before, self.snapshot())

    def test_downgrade_has_only_unique_index_for_legacy_hostname(self):
        self.run_alembic("upgrade", "20261110_09")
        self.run_alembic("downgrade", "20260930_08")
        ddl = self.sql("SELECT sql FROM sqlite_master WHERE name='site_domains'")[0][0]
        self.assertNotIn('uq_site_domains_hostname', ddl)
        indexes = {row[1]: row[2] for row in self.sql('PRAGMA index_list(site_domains)')}
        self.assertEqual(indexes['ix_site_domains_hostname'], 1)
        self.assertEqual(indexes['uq_site_domains_primary'], 1)
        self.assertEqual(self.sql('PRAGMA foreign_key_check'), [])

    def test_reused_host_and_same_site_prefix_alias_are_allowed_but_pair_and_primary_are_unique(self):
        self.run_alembic("upgrade", "20261110_09")
        self.add_domain("jobs.portalerp.com.br", "/mx", primary=1)
        self.add_domain("alias.invalid", "", code="BR")
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_domain("jobs.portalerp.com.br", "/mx", code="US")
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_domain("second-primary.invalid", "/mx", primary=1)
        self.assertEqual(self.sql("PRAGMA foreign_key_check"), [])

    def test_downgrade_rejects_even_inactive_reused_hosts_before_any_ddl(self):
        self.run_alembic("upgrade", "20261110_09")
        self.add_domain("jobs.portalerp.com.br", "/mx", active=0)
        before, schema = self.snapshot(), self.schema()
        result = self.run_alembic("downgrade", "20260930_08", success=False)
        self.assertIn("Domain downgrade refused", result.stderr)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(schema, self.schema())
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20261110_09",)])

    def test_downgrade_rejects_same_site_alias_prefix_without_removing_alias(self):
        self.run_alembic("upgrade", "20261110_09")
        self.add_domain("alias.invalid", "", code="BR")
        before, schema = self.snapshot(), self.schema()
        self.run_alembic("downgrade", "20260930_08", success=False)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(schema, self.schema())

    def test_upgrade_preflight_rejects_noncanonical_prefix_before_ddl(self):
        self.sql("UPDATE site_domains SET url_prefix='/BR'")
        before, schema = self.snapshot(), self.schema()
        result = self.run_alembic("upgrade", "20261110_09", success=False)
        self.assertIn("preflight", result.stderr)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(schema, self.schema())
        self.assertEqual(self.sql("SELECT version_num FROM alembic_version"), [("20260930_08",)])

    def test_upgrade_preflight_rejects_ambiguous_primary_configuration_before_ddl(self):
        self.sql("DROP INDEX uq_site_domains_primary")
        self.add_domain("second-primary.invalid", "/other", code="BR", primary=1)
        before, schema = self.snapshot(), self.schema()
        result = self.run_alembic("upgrade", "20261110_09", success=False)
        self.assertIn("ambiguous", result.stderr)
        self.assertEqual(before, self.snapshot())
        self.assertEqual(schema, self.schema())

    def test_upgrade_handles_legacy_orm_schema_with_unique_hostname_index_only(self):
        # ORM's unique=True,index=True emits a unique index, while migration 02
        # also emitted an unnamed UNIQUE constraint. Both forms must upgrade.
        with sqlite3.connect(self.path) as connection:
            connection.executescript("""
                ALTER TABLE site_domains RENAME TO old_site_domains;
                DROP INDEX ix_site_domains_hostname;
                DROP INDEX ix_site_domains_site_id;
                DROP INDEX uq_site_domains_primary;
                CREATE TABLE site_domains (
                    id INTEGER PRIMARY KEY, site_id INTEGER NOT NULL REFERENCES sites(id),
                    hostname VARCHAR(253) NOT NULL, url_prefix VARCHAR(64) NOT NULL,
                    is_primary BOOLEAN NOT NULL, is_active BOOLEAN NOT NULL,
                    created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
                    CONSTRAINT uq_site_domain_prefix UNIQUE(site_id,url_prefix)
                );
                INSERT INTO site_domains SELECT * FROM old_site_domains;
                DROP TABLE old_site_domains;
                CREATE UNIQUE INDEX ix_site_domains_hostname ON site_domains(hostname);
                CREATE INDEX ix_site_domains_site_id ON site_domains(site_id);
                CREATE UNIQUE INDEX uq_site_domains_primary ON site_domains(site_id) WHERE is_primary=1;
            """)
        before = self.snapshot()
        self.run_alembic("upgrade", "20261110_09")
        self.assertEqual(before, self.snapshot())
        self.add_domain("jobs.portalerp.com.br", "/mx")


if __name__ == "__main__":
    unittest.main()
