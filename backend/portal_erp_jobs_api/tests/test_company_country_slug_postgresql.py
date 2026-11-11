"""Real PostgreSQL tests using a throwaway local Unix-socket-only cluster.

No existing server, credentials or production DB is accessed. Requires installed
PostgreSQL binaries; skips explicitly otherwise. Cluster and data are removed.
"""
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

import sqlalchemy as sa
from src.company_slug_policy_v12 import allocate, base_slug, install_guards, remove_guards, reservation_table

ROOT = Path(__file__).resolve().parents[1]


class CompanyCountrySlugPostgreSQLTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        candidates = sorted(Path("/usr/lib/postgresql").glob("*/bin/initdb"))
        if not candidates:
            raise unittest.SkipTest("PostgreSQL binaries unavailable; no server contacted")
        cls.bin = candidates[-1].parent
        cls.directory = tempfile.TemporaryDirectory(prefix="jobs-company-slug-pg-")
        cls.path = Path(cls.directory.name)
        cls.socket = cls.path / "socket"
        cls.socket.mkdir()
        subprocess.run([str(cls.bin / "initdb"), "-D", str(cls.path / "data"), "-A", "trust", "-U", "fixture", "--no-locale", "--encoding=UTF8"], check=True, capture_output=True)
        subprocess.run([str(cls.bin / "pg_ctl"), "-D", str(cls.path / "data"), "-l", str(cls.path / "pg.log"), "-o", f"-k {cls.socket} -c listen_addresses='' -c fsync=off", "-w", "start"], check=True, capture_output=True)
        cls.url = f"postgresql+psycopg2://fixture@/postgres?host={cls.socket}"
        cls.engine = sa.create_engine(cls.url)

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()
        subprocess.run([str(cls.bin / "pg_ctl"), "-D", str(cls.path / "data"), "-m", "immediate", "-w", "stop"], check=True, capture_output=True)
        cls.directory.cleanup()

    def setUp(self):
        with self.engine.begin() as connection:
            connection.exec_driver_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
        self.metadata = sa.MetaData()
        self.companies = sa.Table("companies", self.metadata, sa.Column("id", sa.Integer, primary_key=True))
        self.sites = sa.Table("sites", self.metadata, sa.Column("id", sa.Integer, primary_key=True), sa.Column("country_code", sa.String(2)))
        self.memberships = sa.Table("company_sites", self.metadata, sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=False),
            sa.Column("site_id", sa.Integer, sa.ForeignKey("sites.id"), nullable=False),
            sa.Column("public_profile_slug", sa.String(140)))
        self.reservations = reservation_table(self.metadata)
        with self.engine.begin() as connection:
            self.metadata.create_all(connection)
            install_guards(connection)
            connection.execute(self.companies.insert(), [{"id": i} for i in range(1, 20)])
            connection.execute(self.sites.insert(), [{"id": 1, "country_code": "BR"}, {"id": 2, "country_code": "BR"}, {"id": 3, "country_code": "MX"}])

    def rejected(self, sql):
        with self.assertRaises(sa.exc.DBAPIError):
            with self.engine.begin() as connection:
                connection.exec_driver_sql(sql)

    def test_real_postgres_raw_write_guards_same_country_multisite_null_and_tombstone(self):
        with self.engine.begin() as connection:
            connection.execute(self.memberships.insert(), [
                {"company_id": 1, "site_id": 1, "public_profile_slug": "megasoft"},
                {"company_id": 1, "site_id": 2, "public_profile_slug": "megasoft"},
                {"company_id": 2, "site_id": 3, "public_profile_slug": "megasoft"},
                {"company_id": 3, "site_id": 2, "public_profile_slug": None},
            ])
        for sql in (
            "UPDATE company_sites SET public_profile_slug='megasoft' WHERE company_id=3",
            "UPDATE company_sites SET public_profile_slug=NULL WHERE company_id=1",
            "UPDATE company_sites SET company_id=4 WHERE company_id=1",
            "UPDATE company_sites SET site_id=3 WHERE company_id=1",
            "UPDATE sites SET country_code='MX' WHERE id=1",
            "UPDATE sites SET country_code='br' WHERE id=3",
            "DELETE FROM company_slug_reservations",
            "UPDATE company_slug_reservations SET slug='other'",
            "UPDATE company_slug_reservations SET company_id=4",
        ):
            self.rejected(sql)
        for slug in ("api", "123", "Megasoft", "mégasoft", "a--b", "a" * 141):
            with self.assertRaises(sa.exc.DBAPIError):
                with self.engine.begin() as connection:
                    connection.execute(self.memberships.insert().values(company_id=4, site_id=1, public_profile_slug=slug))
        with self.engine.begin() as connection:
            connection.exec_driver_sql("DELETE FROM company_sites WHERE company_id=1; DELETE FROM companies WHERE id=1")
            owner = connection.execute(sa.select(self.reservations.c.company_id).where(self.reservations.c.country_code == "BR", self.reservations.c.slug == "megasoft")).scalar_one()
            self.assertIsNone(owner)
            slug = allocate(connection, self.reservations, "BR", 4, "megasoft")
            self.assertEqual(slug, "megasoft-a")
        self.rejected("UPDATE company_slug_reservations SET company_id=5 WHERE company_id IS NULL")

    def test_real_postgres_concurrent_collisions_commit_unique_country_reservations(self):
        def insert_company(owner):
            with self.engine.begin() as connection:
                slug = allocate(connection, self.reservations, "BR", owner, base_slug("Mégasoft", None), "Software", "São Paulo")
                connection.execute(self.memberships.insert().values(company_id=owner, site_id=1 if owner % 2 else 2, public_profile_slug=slug))
                return slug
        with ThreadPoolExecutor(max_workers=8) as executor:
            slugs = list(executor.map(insert_company, range(1, 9)))
        self.assertEqual(len(set(slugs)), 8)
        self.assertEqual(set(slugs), {"megasoft", "megasoft-software", "megasoft-sao-paulo", "megasoft-software-sao-paulo", *(f"megasoft-software-sao-paulo-{c}" for c in "abcd")})
        with self.engine.begin() as connection:
            mx = allocate(connection, self.reservations, "MX", 9, "megasoft")
            self.assertEqual(mx, "megasoft")

    def test_real_postgres_allocation_rollback_does_not_leave_orphan_reservation(self):
        with self.engine.connect() as connection:
            transaction = connection.begin()
            self.assertEqual(allocate(connection, self.reservations, "BR", 1, "rollback-brand"), "rollback-brand")
            transaction.rollback()
        with self.engine.begin() as connection:
            self.assertEqual(connection.execute(sa.select(sa.func.count()).select_from(self.reservations)).scalar_one(), 0)
            self.assertEqual(allocate(connection, self.reservations, "BR", 2, "rollback-brand"), "rollback-brand")

    def test_snapshot_isolation_cannot_change_country_after_concurrent_membership_commit(self):
        for site_id, isolation in enumerate(("REPEATABLE READ", "SERIALIZABLE"), start=1):
            with self.subTest(isolation=isolation):
                slug = f"snapshot-probe-{site_id}"
                with self.engine.connect().execution_options(isolation_level=isolation) as stale:
                    transaction = stale.begin()
                    self.assertEqual(stale.exec_driver_sql(
                        "SELECT count(*) FROM company_sites WHERE site_id=%s", (site_id,),
                    ).scalar_one(), 0)
                    with self.engine.begin() as fresh:
                        fresh.execute(self.memberships.insert().values(
                            company_id=site_id, site_id=site_id, public_profile_slug=slug,
                        ))
                    with self.assertRaises(sa.exc.DBAPIError):
                        stale.exec_driver_sql("UPDATE sites SET country_code='MX' WHERE id=%s", (site_id,))
                    transaction.rollback()
                with self.engine.connect() as connection:
                    self.assertEqual(connection.exec_driver_sql(
                        "SELECT country_code FROM sites WHERE id=%s", (site_id,),
                    ).scalar_one(), "BR")
                    self.assertEqual(connection.execute(sa.select(self.reservations.c.company_id).where(
                        self.reservations.c.country_code == "BR", self.reservations.c.slug == slug,
                    )).scalar_one(), site_id)

    def test_real_postgres_full_alembic_upgrade_check_downgrade_and_reupgrade(self):
        with self.engine.begin() as connection:
            connection.exec_driver_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
            # Historical revision03 has preexisting SQLite-only boolean/scalar
            # SQL. Build equivalent revision11 ORM metadata and stamp11 instead
            # of changing unrelated historical migrations in this slug wave.
            from src.config import db
            import src.models  # noqa: F401
            legacy_metadata = sa.MetaData()
            for table in db.metadata.sorted_tables:
                if table.name != "company_slug_reservations":
                    table.to_metadata(legacy_metadata)
            legacy_metadata.create_all(connection)
            connection.exec_driver_sql("INSERT INTO sites(id,code,name,country_code,default_locale,currency_code,timezone,is_active,created_at,updated_at) VALUES(1,'BR','Brasil','BR','pt-BR','BRL','UTC',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": "/home/ubuntu", "PYTHON_DOTENV_DISABLED": "1", "DATABASE_URL": self.url,
               "SECRET_KEY": "isolated-test-secret-at-least-thirty-two-characters", "JWT_SECRET_KEY": "isolated-test-jwt-at-least-thirty-two-characters", "FLASK_ENV": "testing"}
        def alembic(*args):
            result = subprocess.run([str(ROOT / ".venv/bin/python"), "-m", "alembic", *args], cwd=ROOT, env=env, text=True, capture_output=True, timeout=90)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            return result
        alembic("stamp", "20261111_11")
        with self.engine.begin() as connection:
            connection.exec_driver_sql("INSERT INTO users(id,email,user_type,is_active) VALUES(400,'fixture@example.invalid','company',true),(401,'fixture2@example.invalid','company',true)")
            connection.exec_driver_sql("INSERT INTO companies(id,user_id,company_name) VALUES(400,400,'Megasoft'),(401,401,'Megasoft')")
            connection.exec_driver_sql("INSERT INTO company_sites(company_id,site_id,status,public_profile_slug,is_member,max_active_jobs,created_at,updated_at) SELECT 400,id,'pending','megasoft',false,3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM sites WHERE code='BR'")
            connection.exec_driver_sql("INSERT INTO company_sites(company_id,site_id,status,public_profile_slug,is_member,max_active_jobs,created_at,updated_at) SELECT 401,id,'suspended','megasoft',false,3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM sites WHERE code='BR'")
        alembic("upgrade", "head")
        self.assertIn("No new upgrade operations detected", alembic("check").stdout)
        with self.engine.connect() as connection:
            rows = connection.exec_driver_sql("SELECT company_id,public_profile_slug FROM company_sites ORDER BY id").all()
            self.assertEqual(rows, [(400, "megasoft"), (401, "megasoft-a")])
        alembic("downgrade", "20261111_11")
        with self.engine.connect() as connection:
            self.assertEqual(connection.exec_driver_sql("SELECT company_id,public_profile_slug FROM company_sites ORDER BY id").all(), rows)
        alembic("upgrade", "head")
        alembic("check")


if __name__ == "__main__":
    unittest.main()
