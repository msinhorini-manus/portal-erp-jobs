import os
import tempfile
import unittest

fd, database_path = tempfile.mkstemp(prefix="portal-erp-jobs-wave0-", suffix=".db")
os.close(fd)

os.environ["SECRET_KEY"] = "test-secret-key-that-is-longer-than-thirty-two-characters"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-that-is-longer-than-thirty-two-characters"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path}"
os.environ["CORS_ORIGINS"] = "https://jobs.portalerp.com.br"
os.environ["ALLOW_ADMIN_SETUP"] = "false"
os.environ["FLASK_ENV"] = "testing"

from src.config import _required_secret, db  # noqa: E402
from src.main import app  # noqa: E402
from src.models.user import User  # noqa: E402
from src.models.company import Company  # noqa: E402
from src.models.job import Job  # noqa: E402
from src.models.site import Site, SiteDomain, SiteLocale  # noqa: E402


class WaveZeroSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()
        with app.app_context():
            db.create_all()
            br = Site(
                code="BR",
                name="Brasil",
                country_code="BR",
                default_locale="pt-BR",
                currency_code="BRL",
                timezone="America/Sao_Paulo",
                canonical_origin="https://jobs.portalerp.com.br",
                is_active=True,
            )
            br.domains.append(
                SiteDomain(
                    hostname="jobs.portalerp.com.br",
                    is_primary=True,
                    is_active=True,
                )
            )
            br.locales.append(
                SiteLocale(locale="pt-BR", is_default=True, is_active=True)
            )
            mx = Site(
                code="MX",
                name="México",
                country_code="MX",
                default_locale="es-MX",
                currency_code="MXN",
                timezone="America/Mexico_City",
                is_active=False,
            )
            mx.domains.append(
                SiteDomain(
                    hostname="jobs-mx.invalid",
                    is_primary=True,
                    is_active=True,
                )
            )
            mx.locales.append(
                SiteLocale(locale="es-MX", is_default=True, is_active=True)
            )
            db.session.add_all([br, mx])

            user = User(email="security-test@example.com", user_type="candidate")
            user.set_password("ValidPassword123")
            company_user = User(email="company-test@example.com", user_type="company")
            company_user.set_password("ValidPassword123")
            db.session.add_all([user, company_user])
            db.session.flush()
            company = Company(user_id=company_user.id, company_name="Regional Test Company")
            db.session.add(company)
            db.session.flush()
            db.session.add_all([
                Job(
                    site_id=br.id,
                    company_id=company.id,
                    title="BR Job",
                    description="Brazilian job",
                    is_active=True,
                ),
                Job(
                    site_id=mx.id,
                    company_id=company.id,
                    title="MX Job",
                    description="Mexican job",
                    is_active=True,
                ),
            ])
            db.session.commit()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
        if os.path.exists(database_path):
            os.unlink(database_path)

    def test_required_secret_fails_closed(self):
        original = os.environ.pop("WAVE0_MISSING_SECRET", None)
        try:
            with self.assertRaises(RuntimeError):
                _required_secret("WAVE0_MISSING_SECRET")
        finally:
            if original is not None:
                os.environ["WAVE0_MISSING_SECRET"] = original

    def test_password_reset_never_returns_token(self):
        response = self.client.post(
            "/api/auth/forgot-password",
            json={"email": "security-test@example.com"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_debug_token", response.get_json())
        with app.app_context():
            user = User.query.filter_by(email="security-test@example.com").first()
            self.assertIsNone(user.reset_token)
            self.assertIsNone(user.reset_token_expires)

    def test_reset_token_is_stored_as_hash(self):
        with app.app_context():
            user = User.query.filter_by(email="security-test@example.com").first()
            raw_token = user.generate_reset_token()
            self.assertNotEqual(user.reset_token, raw_token)
            self.assertTrue(user.verify_reset_token(raw_token))
            self.assertFalse(user.verify_reset_token("wrong-token"))
            user.clear_reset_token()
            db.session.commit()

    def test_catalog_mutations_require_admin(self):
        requests = [
            ("post", "/api/config/areas", {"name": "Blocked"}),
            ("put", "/api/config/areas/999", {"name": "Blocked"}),
            ("delete", "/api/config/areas/999", None),
            ("post", "/api/config/levels", {"name": "Blocked"}),
            ("put", "/api/config/levels/999", {"name": "Blocked"}),
            ("delete", "/api/config/levels/999", None),
            ("post", "/api/config/modalities", {"name": "Blocked"}),
            ("put", "/api/config/modalities/999", {"name": "Blocked"}),
            ("delete", "/api/config/modalities/999", None),
            ("post", "/api/config/softwares", {"name": "Blocked"}),
            ("put", "/api/config/softwares/999", {"name": "Blocked"}),
            ("delete", "/api/config/softwares/999", None),
            ("post", "/api/config/technologies", {"name": "Blocked"}),
            ("put", "/api/config/technologies/999", {"name": "Blocked"}),
            ("delete", "/api/config/technologies/999", None),
            ("post", "/api/config/tags", {"name": "Blocked"}),
            ("put", "/api/config/tags/999", {"name": "Blocked"}),
            ("delete", "/api/config/tags/999", None),
            ("post", "/api/config/seed", {}),
        ]
        for method, path, payload in requests:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, json=payload)
                self.assertEqual(response.status_code, 401)

    def test_migration_endpoint_is_not_registered(self):
        response = self.client.post("/api/migrate/add-area-column")
        self.assertEqual(response.status_code, 404)

    def test_admin_setup_is_disabled(self):
        response = self.client.post(
            "/api/admin/setup",
            json={"email": "new-admin@example.com", "password": "Password123"},
        )
        self.assertEqual(response.status_code, 404)

    def test_cors_allows_only_configured_origin(self):
        trusted = self.client.get(
            "/api",
            headers={"Origin": "https://jobs.portalerp.com.br"},
        )
        self.assertEqual(
            trusted.headers.get("Access-Control-Allow-Origin"),
            "https://jobs.portalerp.com.br",
        )

        untrusted = self.client.get(
            "/api",
            headers={"Origin": "https://evil.example"},
        )
        self.assertIsNone(untrusted.headers.get("Access-Control-Allow-Origin"))

    def test_public_context_returns_only_server_resolved_site(self):
        response = self.client.get(
            "/api/context",
            headers={"Host": "jobs.portalerp.com.br"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["site"]["code"], "BR")
        self.assertEqual(payload["site"]["locale"], "pt-BR")
        self.assertEqual(payload["site"]["currency_code"], "BRL")

    def test_public_sites_exclude_inactive_mexico(self):
        response = self.client.get(
            "/api/sites",
            headers={"Host": "jobs.portalerp.com.br"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["code"] for item in response.get_json()["sites"]], ["BR"])

    def test_inactive_mexico_fails_closed(self):
        response = self.client.get(
            "/api/context",
            headers={"Host": "jobs-mx.invalid"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["error"]["code"], "site_not_available")

    def test_unknown_host_fails_closed_when_fallback_disabled(self):
        previous = app.config["REGIONAL_ALLOW_DEVELOPMENT_FALLBACK"]
        app.config["REGIONAL_ALLOW_DEVELOPMENT_FALLBACK"] = False
        try:
            response = self.client.get("/api/context", headers={"Host": "unknown.invalid"})
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.get_json()["error"]["code"], "site_not_found")
        finally:
            app.config["REGIONAL_ALLOW_DEVELOPMENT_FALLBACK"] = previous

    def test_client_cannot_override_site_authority(self):
        response = self.client.get(
            "/api/jobs/?site_id=2",
            headers={"Host": "jobs.portalerp.com.br"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json()["error"]["code"],
            "client_site_authority_forbidden",
        )

        header_response = self.client.get(
            "/api/context",
            headers={
                "Host": "jobs.portalerp.com.br",
                "X-Regional-Host": "jobs-mx.invalid",
            },
        )
        self.assertEqual(header_response.status_code, 400)

    def test_loopback_next_can_forward_the_regional_host(self):
        response = self.client.get(
            "/api/context",
            headers={
                "Host": "127.0.0.1:5000",
                "X-Regional-Host": "jobs.portalerp.com.br",
            },
            environ_base={"REMOTE_ADDR": "127.0.0.1"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["site"]["code"], "BR")

    def test_jobs_are_filtered_by_resolved_site(self):
        response = self.client.get(
            "/api/jobs/",
            headers={"Host": "jobs.portalerp.com.br"},
        )
        self.assertEqual(response.status_code, 200)
        titles = [job["title"] for job in response.get_json()["jobs"]]
        self.assertEqual(titles, ["BR Job"])


if __name__ == "__main__":
    unittest.main()
