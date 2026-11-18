"""Isolated tests for the editorial email center.

Run alone because the application owns one process-global SQLAlchemy instance:
  /home/ubuntu/jobs-email-venv/bin/python -m unittest tests.test_admin_email_center
"""
import importlib.util
import os
import sqlite3
import socket
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from flask_jwt_extended import create_access_token
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from alembic.migration import MigrationContext
from alembic.operations import Operations

fd, database_path = tempfile.mkstemp(prefix="portal-erp-jobs-email-center-", suffix=".db")
os.close(fd)
os.environ["SECRET_KEY"] = "email-center-tests-secret-key-longer-than-32"
os.environ["JWT_SECRET_KEY"] = "email-center-tests-jwt-key-longer-than-32"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path}"
os.environ["CORS_ORIGINS"] = "https://jobs.portalerp.com.br"
os.environ["ALLOW_ADMIN_SETUP"] = "false"
os.environ["FLASK_ENV"] = "testing"

from src.config import db  # noqa: E402
from src.main import app  # noqa: E402
from src.models import (  # noqa: E402
    Admin,
    AdminAuditEvent,
    AdminRole,
    AdminSite,
    EmailTemplate,
    EmailTemplateVersion,
    SessionFamily,
    Site,
    SiteDomain,
    SiteLocale,
    User,
)
from src.services.email_templates import (  # noqa: E402
    TemplateValidationError,
    _safe_href,
    catalog_definition,
    render_content,
    trusted_panel_url,
    validate_content,
)


PASSWORD = "ValidPassword123"
BR_HOST = "jobs.portalerp.com.br"
MX_HOST = "jobs-mx.invalid"


class ExternalSocketBlockedTestCase(unittest.TestCase):
    """Prevent accidental external calls while leaving loopback available."""

    def setUp(self):
        super().setUp()
        original_connect = socket.socket.connect

        def connect_without_external(sock, address):
            if isinstance(address, tuple):
                host = address[0] if address else None
                if host not in {"127.0.0.1", "::1", "localhost"}:
                    raise AssertionError(f"external socket blocked: {host!r}")
            return original_connect(sock, address)

        self._external_socket_patch = patch.object(
            socket.socket, "connect", new=connect_without_external
        )
        self._external_socket_patch.start()
        self.addCleanup(self._external_socket_patch.stop)


class AdminEmailCenterTests(ExternalSocketBlockedTestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()
        os.unlink(database_path)

    def setUp(self):
        with app.app_context():
            db.drop_all()
            db.create_all()
            br = Site(
                code="BR",
                name="Brasil",
                country_code="BR",
                default_locale="pt-BR",
                currency_code="BRL",
                timezone="America/Sao_Paulo",
                canonical_origin=f"https://{BR_HOST}",
                is_active=True,
            )
            br.domains.extend([
                SiteDomain(hostname=BR_HOST, url_prefix="/br", is_primary=True, is_active=True),
                SiteDomain(hostname=BR_HOST, url_prefix="", is_primary=False, is_active=True),
            ])
            br.locales.append(SiteLocale(locale="pt-BR", is_default=True, is_active=True))
            mx = Site(
                code="MX",
                name="México",
                country_code="MX",
                default_locale="es-MX",
                currency_code="MXN",
                timezone="America/Mexico_City",
                canonical_origin=f"https://{MX_HOST}",
                is_active=True,
            )
            mx.domains.extend([
                SiteDomain(hostname=MX_HOST, url_prefix="/mx", is_primary=True, is_active=True),
                SiteDomain(hostname=MX_HOST, url_prefix="", is_primary=False, is_active=True),
            ])
            mx.locales.append(SiteLocale(locale="es-MX", is_default=True, is_active=True))
            db.session.add_all([br, mx])
            db.session.flush()
            self.sites = {"BR": br.id, "MX": mx.id}

            users = {}
            for name in ("super", "generic", "editor", "delegate", "viewer", "foreign"):
                user = User(email=f"{name}@example.invalid", user_type="admin", is_active=True)
                user.set_password(PASSWORD)
                db.session.add(user)
                db.session.flush()
                users[name] = user.id
            self.users = users

            super_admin = Admin(
                user_id=users["super"],
                name="Super",
                role=AdminRole.SUPER_ADMIN,
                is_platform_admin=True,
            )
            super_admin.set_role(AdminRole.SUPER_ADMIN)
            generic = Admin(user_id=users["generic"], name="Generic", role=AdminRole.ADMIN)
            generic.set_role(AdminRole.ADMIN)
            editor = Admin(
                user_id=users["editor"],
                name="Editor",
                role=AdminRole.ADMIN,
                is_platform_admin=True,
                permissions={
                    "email.view": True,
                    "email.edit": True,
                    "email.publish": True,
                    "email.rules": True,
                    "email.history": True,
                },
            )
            delegate = Admin(
                user_id=users["delegate"],
                name="Delegate",
                role=AdminRole.ADMIN,
                permissions={
                    "email.view": True,
                    "email.edit": True,
                    "email.publish": True,
                    "email.rules": True,
                    "email.history": True,
                },
            )
            viewer = Admin(
                user_id=users["viewer"],
                name="Viewer",
                role=AdminRole.ADMIN,
                permissions={"email.view": True},
            )
            foreign = Admin(user_id=users["foreign"], name="Foreign", role=AdminRole.SUPER_ADMIN)
            foreign.set_role(AdminRole.SUPER_ADMIN)
            db.session.add_all([super_admin, generic, editor, delegate, viewer, foreign])
            db.session.flush()
            self.admins = {a.name.lower(): a.id for a in (super_admin, generic, editor, delegate, viewer, foreign)}
            db.session.add_all([
                AdminSite(admin_id=super_admin.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=generic.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=editor.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=delegate.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=viewer.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=foreign.id, site_id=mx.id, is_active=True),
            ])
            db.session.commit()

    def _headers(self, name="super", site="BR"):
        with app.app_context():
            site_obj = Site.query.filter_by(code=site).one()
            user_id = self.users[name]
            admin = Admin.query.filter_by(user_id=user_id).one()
            family_id = str(uuid.uuid4())
            db.session.add(SessionFamily(
                user_id=user_id,
                site_id=site_obj.id,
                family_id=family_id,
                current_refresh_jti=str(uuid.uuid4()),
                expires_at=datetime.utcnow() + timedelta(days=1),
            ))
            token = create_access_token(
                identity=str(user_id),
                additional_claims={
                    "user_type": "admin",
                    "site_id": site_obj.id,
                    "site_code": site_obj.code,
                    "admin_id": admin.id,
                    "family_id": family_id,
                },
            )
            db.session.commit()
        return {"Authorization": f"Bearer {token}", "Host": BR_HOST if site == "BR" else MX_HOST}

    @staticmethod
    def _content(locale="pt-BR"):
        value = catalog_definition(locale)
        return {
            "name": value["name"],
            "subject": value["subject"],
            "html": value["html"],
            "text": value["text"],
        }

    def _save_and_publish(self, headers=None, locale="pt-BR"):
        headers = headers or self._headers("editor")
        saved = self.client.put(
            f"/api/admin/emails/templates/{locale}/draft",
            json={"revision": 0, **self._content(locale)},
            headers=headers,
        )
        self.assertEqual(saved.status_code, 200, saved.get_json())
        published = self.client.post(
            f"/api/admin/emails/templates/{locale}/publish",
            json={"revision": saved.get_json()["template"]["revision"]},
            headers=headers,
        )
        self.assertEqual(published.status_code, 200, published.get_json())
        return published.get_json()["template"]

    def test_capabilities_are_independent_and_get_does_not_grant_catalog(self):
        response = self.client.get("/api/admin/emails/capabilities", headers=self._headers("generic"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["capabilities"]["view"], False)
        self.assertEqual(response.get_json()["capabilities"]["edit"], False)
        self.assertEqual(response.get_json()["capabilities"]["test"], False)
        self.assertEqual(response.get_json()["site"]["country_code"], "BR")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        denied = self.client.get("/api/admin/emails/templates", headers=self._headers("generic"))
        self.assertEqual(denied.status_code, 403)
        with app.app_context():
            self.assertEqual(EmailTemplate.query.count(), 0)

        super_caps = self.client.get("/api/admin/emails/capabilities", headers=self._headers("super"))
        self.assertTrue(all(super_caps.get_json()["capabilities"][key] for key in ("view", "edit", "publish", "rules", "history")))
        delegate_caps = self.client.get("/api/admin/emails/capabilities", headers=self._headers("delegate"))
        self.assertEqual(delegate_caps.status_code, 200)
        self.assertTrue(delegate_caps.get_json()["capabilities"]["view"])
        self.assertFalse(delegate_caps.get_json()["capabilities"]["publish"])
        catalog = self.client.get("/api/admin/emails/templates", headers=self._headers("super"))
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(catalog.get_json()["total"], 3)
        with app.app_context():
            self.assertEqual(EmailTemplate.query.count(), 0, "GET must use the in-memory catalog")

    def test_preview_is_fake_render_only_and_rejects_unknown_fields(self):
        before = self.client.get("/api/admin/emails/templates", headers=self._headers("editor")).get_json()
        response = self.client.post(
            "/api/admin/emails/templates/pt-BR/preview",
            json=self._content(),
            headers=self._headers("editor"),
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        payload = response.get_json()
        self.assertIn("Ana Ribeiro", payload["html"])
        self.assertIn("https://jobs.portalerp.com.br/br/empresa/dashboard", payload["html"])
        self.assertEqual(payload["notice"], "Prévia — dados fictícios; nenhum e-mail enviado")
        after = self.client.get("/api/admin/emails/templates", headers=self._headers("editor")).get_json()
        self.assertEqual(before, after)

        invalid = self.client.post(
            "/api/admin/emails/templates/pt-BR/preview",
            json={**self._content(), "recipient": "victim@example.invalid"},
            headers=self._headers("editor"),
        )
        self.assertEqual(invalid.status_code, 422)
        self.assertIn("body", invalid.get_json()["fields"])
        site_authority = self.client.post(
            "/api/admin/emails/templates/pt-BR/preview",
            json={**self._content(), "site_id": 999},
            headers=self._headers("editor"),
        )
        self.assertEqual(site_authority.status_code, 400)
        for bad_html in (
            "<script>alert(1)</script>",
            '<p class="unsafe">x</p>',
            '<a href="https://evil.invalid">x</a>',
            '<p style="color:red">x</p>',
        ):
            bad = self._content()
            bad["html"] = bad_html
            response = self.client.post(
                "/api/admin/emails/templates/pt-BR/preview",
                json=bad,
                headers=self._headers("editor"),
            )
            self.assertEqual(response.status_code, 422, bad_html)
            self.assertIn("html", response.get_json()["fields"])

        crlf_subject = self._content()
        crlf_subject["subject"] = "Assunto seguro\r\nBcc: attacker@example.invalid"
        response = self.client.post(
            "/api/admin/emails/templates/pt-BR/preview",
            json=crlf_subject,
            headers=self._headers("editor"),
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("subject", response.get_json()["fields"])

        external_text = self._content()
        external_text["text"] = "Acesse https://evil.invalid/reset/token."
        response = self.client.post(
            "/api/admin/emails/templates/pt-BR/preview",
            json=external_text,
            headers=self._headers("editor"),
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("text", response.get_json()["fields"])

        invalid_port = self._content()
        invalid_port["html"] = f'<p><a href="https://{BR_HOST}:invalid/br/empresa/vagas">Abrir painel</a></p>'
        response = self.client.post(
            "/api/admin/emails/templates/pt-BR/preview",
            json=invalid_port,
            headers=self._headers("editor"),
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("html", response.get_json()["fields"])

    def test_direct_service_escapes_by_context_and_rejects_broken_markers(self):
        primary_domain = SiteDomain(
            hostname=BR_HOST,
            url_prefix="/br",
            is_primary=True,
            is_active=True,
        )
        site = SimpleNamespace(
            canonical_origin=f"https://{BR_HOST}",
            primary_domain=primary_domain,
            domains=[primary_domain],
        )
        self.assertEqual(trusted_panel_url(site), f"https://{BR_HOST}/br/empresa/dashboard")
        value = self._content()
        rendered = render_content(value, site, "pt-BR")
        self.assertNotIn("{{", rendered["html"])
        self.assertNotIn("{{", rendered["text"])
        for safe_path in ("/br/empresa/vagas", "/br/candidato/dashboard", "/br/candidatos/dashboard"):
            self.assertTrue(_safe_href(f"https://{BR_HOST}{safe_path}", site))
        for unsafe_path in ("/br/empresa/convite/secret", "/br/candidato/reset/secret"):
            self.assertFalse(_safe_href(f"https://{BR_HOST}{unsafe_path}", site))
        self.assertFalse(_safe_href(f"https://{BR_HOST}:invalid/br/empresa/vagas", site))
        for field, marker in (("subject", "{{candidate_nome}}"), ("text", "{{vaga_titulo}"), ("html", "{{unknown}}")):
            invalid = dict(value)
            invalid[field] = marker
            with self.assertRaises(TemplateValidationError):
                validate_content(invalid, site)

    def test_mutations_require_view_and_action_and_cas_preserves_newer_draft(self):
        content = self._content()
        view_only = self._headers("viewer")
        denied = self.client.put(
            "/api/admin/emails/templates/pt-BR/draft",
            json={"revision": 0, **content},
            headers=view_only,
        )
        self.assertEqual(denied.status_code, 403)

        saved = self.client.put(
            "/api/admin/emails/templates/pt-BR/draft",
            json={"revision": 0, **content},
            headers=self._headers("editor"),
        )
        self.assertEqual(saved.status_code, 200, saved.get_json())
        self.assertEqual(saved.get_json()["template"]["revision"], 1)
        changed = dict(content)
        changed["subject"] = "Assunto novo seguro"
        stale = self.client.put(
            "/api/admin/emails/templates/pt-BR/draft",
            json={"revision": 0, **changed},
            headers=self._headers("editor"),
        )
        self.assertEqual(stale.status_code, 409)
        with app.app_context():
            template = EmailTemplate.query.one()
            self.assertEqual(template.revision, 1)
            self.assertEqual(template.draft_subject, content["subject"])

        publish_denied = self.client.post(
            "/api/admin/emails/templates/pt-BR/publish",
            json={"revision": 1},
            headers=view_only,
        )
        self.assertEqual(publish_denied.status_code, 403)
        published = self.client.post(
            "/api/admin/emails/templates/pt-BR/publish",
            json={"revision": 1},
            headers=self._headers("editor"),
        )
        self.assertEqual(published.status_code, 200, published.get_json())
        self.assertEqual(published.get_json()["template"]["published"]["version"], 1)
        self.assertEqual(published.get_json()["template"]["revision"], 2)

        versions = self.client.get(
            "/api/admin/emails/templates/pt-BR/versions",
            headers=self._headers("editor"),
        )
        self.assertEqual(versions.status_code, 200)
        self.assertEqual(len(versions.get_json()["versions"]), 1)
        self.assertEqual(versions.get_json()["versions"][0]["version"], 1)

    def test_publish_and_inactivate_require_platform_admin(self):
        content = self._content()
        saved = self.client.put(
            "/api/admin/emails/templates/pt-BR/draft",
            json={"revision": 0, **content},
            headers=self._headers("editor"),
        )
        self.assertEqual(saved.status_code, 200, saved.get_json())
        delegate_publish = self.client.post(
            "/api/admin/emails/templates/pt-BR/publish",
            json={"revision": saved.get_json()["template"]["revision"]},
            headers=self._headers("delegate"),
        )
        self.assertEqual(delegate_publish.status_code, 403)

        published = self.client.post(
            "/api/admin/emails/templates/pt-BR/publish",
            json={"revision": saved.get_json()["template"]["revision"]},
            headers=self._headers("editor"),
        )
        self.assertEqual(published.status_code, 200, published.get_json())
        delegate_inactivate = self.client.post(
            "/api/admin/emails/templates/pt-BR/inactivate",
            json={"revision": published.get_json()["template"]["revision"]},
            headers=self._headers("delegate"),
        )
        self.assertEqual(delegate_inactivate.status_code, 403)
        self.assertEqual(
            self.client.get(
                "/api/admin/emails/templates", headers=self._headers("editor")
            ).get_json()["templates"][0]["status"],
            "published",
        )

    def test_restore_creates_new_draft_and_versions_are_immutable(self):
        published = self._save_and_publish()
        restored = self.client.post(
            "/api/admin/emails/templates/pt-BR/restore",
            json={"revision": published["revision"], "version": 1},
            headers=self._headers("editor"),
        )
        self.assertEqual(restored.status_code, 200, restored.get_json())
        self.assertEqual(restored.get_json()["template"]["status"], "published_with_draft")
        self.assertEqual(restored.get_json()["template"]["draft"]["subject"], published["published"]["subject"])
        self.assertEqual(restored.get_json()["template"]["published"]["version"], 1)
        with app.app_context():
            version = EmailTemplateVersion.query.one()
            version_id = version.id
            self.assertEqual(version_id, EmailTemplateVersion.query.one().id)
            self.assertEqual(EmailTemplateVersion.query.one().subject, published["published"]["subject"])

    def test_inactive_published_template_keeps_version_but_rule_gate_is_false(self):
        published = self._save_and_publish()
        inactive = self.client.post(
            "/api/admin/emails/templates/pt-BR/inactivate",
            json={"revision": published["revision"]},
            headers=self._headers("editor"),
        )
        self.assertEqual(inactive.status_code, 200, inactive.get_json())
        self.assertEqual(inactive.get_json()["template"]["status"], "inactive")
        self.assertEqual(inactive.get_json()["template"]["published"]["version"], 1)
        rules = self.client.get("/api/admin/emails/rules", headers=self._headers("editor"))
        self.assertEqual(rules.status_code, 200)
        gate = next(item for item in rules.get_json()["rules"][0]["gates"] if item["key"] == "published_template_safe")
        self.assertFalse(gate["ready"])
        self.assertFalse(rules.get_json()["can_activate"])

    def test_restore_preserves_inactive_until_explicit_publish(self):
        published = self._save_and_publish()
        inactive = self.client.post(
            "/api/admin/emails/templates/pt-BR/inactivate",
            json={"revision": published["revision"]},
            headers=self._headers("editor"),
        )
        self.assertEqual(inactive.status_code, 200, inactive.get_json())
        restored = self.client.post(
            "/api/admin/emails/templates/pt-BR/restore",
            json={"revision": inactive.get_json()["template"]["revision"], "version": 1},
            headers=self._headers("editor"),
        )
        self.assertEqual(restored.status_code, 200, restored.get_json())
        self.assertEqual(restored.get_json()["template"]["status"], "inactive")
        rules = self.client.get("/api/admin/emails/rules", headers=self._headers("editor"))
        gate = next(item for item in rules.get_json()["rules"][0]["gates"] if item["key"] == "published_template_safe")
        self.assertFalse(gate["ready"])

        republished = self.client.post(
            "/api/admin/emails/templates/pt-BR/publish",
            json={"revision": restored.get_json()["template"]["revision"]},
            headers=self._headers("editor"),
        )
        self.assertEqual(republished.status_code, 200, republished.get_json())
        self.assertEqual(republished.get_json()["template"]["status"], "published")

    def test_region_claim_and_assignment_cannot_cross_sites(self):
        br_token = self._headers("super")
        crossed = self.client.get(
            "/api/admin/emails/capabilities",
            headers={**br_token, "Host": MX_HOST},
        )
        self.assertEqual(crossed.status_code, 403)
        foreign = self.client.get("/api/admin/emails/capabilities", headers=self._headers("foreign", "MX"))
        self.assertEqual(foreign.status_code, 200)
        self.assertEqual(foreign.get_json()["site"]["code"], "MX")
        foreign_caps = foreign.get_json()["capabilities"]
        self.assertEqual(foreign_caps["reason"], "Região/idioma não operacional nesta fase")
        self.assertTrue(all(value is False for key, value in foreign_caps.items() if key != "reason"))
        denied = self.client.get("/api/admin/emails/templates", headers=self._headers("foreign", "MX"))
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(set(denied.get_json()), {"error"})

    def test_rules_and_history_have_no_fake_delivery_records(self):
        rules = self.client.get("/api/admin/emails/rules", headers=self._headers("super"))
        self.assertEqual(rules.status_code, 200)
        self.assertFalse(rules.get_json()["rules"][0]["enabled"])
        history = self.client.get("/api/admin/emails/history", headers=self._headers("super"))
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.get_json()["records"], [])
        self.assertFalse(history.get_json()["available"])


class EmailCenterMigrationTests(ExternalSocketBlockedTestCase):
    def test_schema12_to13_is_additive_and_downgrade_preserves_existing_tables(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.exec_driver_sql("CREATE TABLE sites (id INTEGER PRIMARY KEY, code VARCHAR(10))")
            connection.exec_driver_sql("CREATE TABLE admins (id INTEGER PRIMARY KEY, name VARCHAR(255))")
            connection.exec_driver_sql("CREATE TABLE legacy_data (id INTEGER PRIMARY KEY, value VARCHAR(20))")
            connection.exec_driver_sql("INSERT INTO legacy_data (value) VALUES ('keep')")
            connection.exec_driver_sql("INSERT INTO sites (id, code) VALUES (1, 'BR')")
            connection.exec_driver_sql("INSERT INTO admins (id, name) VALUES (1, 'Admin')")

        path = Path(__file__).parents[1] / "migrations" / "versions" / "20261118_13_add_email_template_center.py"
        spec = importlib.util.spec_from_file_location("migration_13", path)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        with engine.begin() as connection:
            operations = Operations(MigrationContext.configure(connection))
            old_op = migration.op
            migration.op = operations
            try:
                migration.upgrade()
            finally:
                migration.op = old_op
            tables = set(connection.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table' ").scalars())
            self.assertIn("legacy_data", tables)
            self.assertIn("email_templates", tables)
            self.assertIn("email_template_versions", tables)
            self.assertEqual(connection.exec_driver_sql("SELECT value FROM legacy_data").scalar(), "keep")
            connection.exec_driver_sql(
                "INSERT INTO email_templates (site_id,locale,key,event,audience) VALUES (1,'pt-BR','k','e','a')"
            )
            template_id = connection.exec_driver_sql("SELECT id FROM email_templates").scalar()
            connection.exec_driver_sql(
                "INSERT INTO email_template_versions (template_id,version,name,subject,html,text) VALUES (:id,1,'n','s','<p>x</p>','x')",
                {"id": template_id},
            )
            with self.assertRaises(IntegrityError):
                connection.exec_driver_sql("UPDATE email_template_versions SET subject='bad'")

        with engine.begin() as connection:
            operations = Operations(MigrationContext.configure(connection))
            old_op = migration.op
            migration.op = operations
            try:
                migration.downgrade()
            finally:
                migration.op = old_op
            tables = set(connection.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'").scalars())
            self.assertIn("legacy_data", tables)
            self.assertIn("sites", tables)
            self.assertIn("admins", tables)
            self.assertNotIn("email_templates", tables)
            self.assertNotIn("email_template_versions", tables)
            self.assertEqual(connection.exec_driver_sql("SELECT value FROM legacy_data").scalar(), "keep")
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
