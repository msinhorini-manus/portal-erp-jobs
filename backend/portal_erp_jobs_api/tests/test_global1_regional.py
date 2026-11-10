"""Run alone: .venv/bin/python -m unittest discover -s tests -p test_global1_regional.py."""
import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

fd, database_path = tempfile.mkstemp(prefix="jobs-global1-regional-", suffix=".db")
os.close(fd)
os.environ.update(
    SECRET_KEY="global1-test-secret-at-least-thirty-two-characters",
    JWT_SECRET_KEY="global1-test-jwt-at-least-thirty-two-characters",
    DATABASE_URL=f"sqlite:///{database_path}", FLASK_ENV="testing", ALLOW_ADMIN_SETUP="false",
)
os.environ.pop("CORS_ORIGINS", None)

from src.config import Config, db  # noqa: E402
from src.main import app  # noqa: E402
from src.models import (  # noqa: E402
    Admin, AdminRole, AdminSite, Candidate, CandidateSite, Company, CompanySite,
    CompanyStatus, CompanyUser, CompanyUserRole, Site, SiteDomain, SiteLocale, User,
)
from src.models.company_team import CompanyInvitation  # noqa: E402
from src.rate_limit import auth_rate_limiter  # noqa: E402
from src.services.regional_urls import trusted_regional_base_url  # noqa: E402

GLOBAL_HOST = "jobs.portalerp.com"
LEGACY_HOST = "jobs.portalerp.com.br"
PASSWORD = "ValidPassword123"


class GlobalOneRegionalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True, EMAIL_PROVIDER="", REGIONAL_ALLOW_DEVELOPMENT_FALLBACK=False)
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()
        os.unlink(database_path)

    def setUp(self):
        auth_rate_limiter.clear()
        with app.app_context():
            db.drop_all()
            db.create_all()
            sites = []
            for code, locale, currency, active in (("BR", "pt-BR", "BRL", True), ("MX", "es-MX", "MXN", True), ("US", "en-US", "USD", False)):
                site = Site(code=code, name=code, country_code=code, default_locale=locale,
                            currency_code=currency, timezone="UTC", canonical_origin=f"https://{GLOBAL_HOST}", is_active=active)
                site.domains.append(SiteDomain(hostname=GLOBAL_HOST, url_prefix=f"/{code.lower()}", is_primary=True))
                site.locales.append(SiteLocale(locale=locale, is_default=True))
                sites.append(site)
            br, mx, us = sites
            br.domains.extend([SiteDomain(hostname=LEGACY_HOST, url_prefix=""), SiteDomain(hostname="br-alias.invalid", url_prefix=""), SiteDomain(hostname="br-prefixed-alias.invalid", url_prefix="/br")])
            db.session.add_all(sites)
            db.session.flush()
            self.br_id, self.mx_id = br.id, mx.id
            for name, kind in (("platform", "admin"), ("regional", "admin"), ("candidate", "candidate"), ("owner", "company"), ("viewer", "company")):
                user = User(email=f"{name}@example.invalid", user_type=kind, is_active=True)
                user.set_password(PASSWORD)
                db.session.add(user)
            db.session.flush()
            self.users = {user.email.split("@")[0]: user.id for user in User.query.all()}
            for name, platform in (("platform", True), ("regional", False)):
                admin = Admin(user_id=self.users[name], name=name, role=AdminRole.SUPER_ADMIN, is_platform_admin=platform)
                admin.set_role(AdminRole.SUPER_ADMIN)
                db.session.add(admin)
                db.session.flush()
                db.session.add(AdminSite(admin_id=admin.id, site_id=br.id, is_active=True))
            candidate = Candidate(user_id=self.users["candidate"], first_name="Regional", last_name="Candidate")
            db.session.add(candidate)
            company = Company(user_id=self.users["owner"], company_name="Regional Company", website="https://external.invalid/catalog", cnpj="TEST-GLOBAL1")
            db.session.add(company)
            db.session.flush()
            self.company_id = company.id
            db.session.add(CandidateSite(candidate_id=candidate.id, site_id=br.id, is_active=True))
            db.session.add(CompanySite(company_id=company.id, site_id=br.id, status=CompanyStatus.APPROVED))
            db.session.add(CompanySite(company_id=company.id, site_id=mx.id, status=CompanyStatus.APPROVED))
            for name, role in (("owner", CompanyUserRole.OWNER), ("viewer", CompanyUserRole.VIEWER)):
                db.session.add(CompanyUser(company_id=company.id, user_id=self.users[name], role=role, name=name, is_active=True, invitation_accepted=True))
            db.session.commit()

    def headers(self, prefix="/br", token=None, host=GLOBAL_HOST):
        result = {"Host": "127.0.0.1:5000", "X-Regional-Host": host, "X-Regional-Prefix": prefix}
        if token:
            result["Authorization"] = f"Bearer {token}"
        return result

    def login(self, name, kind, prefix="/br"):
        response = self.client.post(f"/api/auth/login/{kind}", headers=self.headers(prefix), json={"email": f"{name}@example.invalid", "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()

    def invite(self, token, *, prefix="/br", email="invited@example.invalid"):
        return self.client.post("/api/company-team/invitations", headers=self.headers(prefix, token), json={"email": email, "name": "Invited", "role": "hr"})

    def admin_patch(self, payload, *, code="BR", token=None):
        token = token or self.login("platform", "admin")["access_token"]
        return self.client.patch(f"/api/admin/sites/{code}", headers=self.headers(token=token), json=payload)

    def test_same_host_resolves_independent_prefixes_and_locales(self):
        for prefix, code, locale in (("/br", "BR", "pt-BR"), ("/mx", "MX", "es-MX")):
            with self.subTest(prefix=prefix):
                response = self.client.get("/api/context", headers=self.headers(prefix))
                self.assertEqual(response.status_code, 200)
                data = response.get_json()
                self.assertEqual(data["site"]["code"], code)
                self.assertEqual(data["locale"], locale)
                self.assertEqual(data["site"]["url_prefix"], prefix)
                self.assertEqual(data["site"]["regional_base_url"], f"https://{GLOBAL_HOST}{prefix}")
                self.assertEqual(data["site"]["canonical_origin"], f"https://{GLOBAL_HOST}")

    def test_empty_prefix_requires_exact_registered_alias_not_primary_guess(self):
        self.assertEqual(self.client.get("/api/context", headers={"Host": GLOBAL_HOST}).status_code, 404)
        self.assertEqual(self.client.get("/api/context", headers=self.headers("")).status_code, 404)
        for host in (LEGACY_HOST, "br-alias.invalid"):
            response = self.client.get("/api/context", headers={"Host": host})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()["site"]["regional_base_url"], f"https://{GLOBAL_HOST}/br")
        self.assertEqual(self.client.get("/api/context", headers={"Host": "br-prefixed-alias.invalid"}).status_code, 404)
        self.assertEqual(self.client.get("/api/context", headers=self.headers(host="br-prefixed-alias.invalid")).status_code, 200)

    def test_nonexistent_inactive_or_malformed_explicit_prefix_never_falls_back(self):
        for prefix in ("/us", "/ar", "/BR", "br", "/br/", "/br/mx", "/../br", "/br?x=1", "/br,/mx", "/br%2f"):
            with self.subTest(prefix=prefix):
                self.assertEqual(self.client.get("/api/context", headers=self.headers(prefix)).status_code, 404)
        self.assertEqual(self.client.get("/api/context", headers=self.headers("/mx", host=LEGACY_HOST)).status_code, 404)

    def test_unknown_host_cannot_use_development_flag_to_fallback(self):
        previous = app.config["REGIONAL_ALLOW_DEVELOPMENT_FALLBACK"]
        app.config["REGIONAL_ALLOW_DEVELOPMENT_FALLBACK"] = True
        try:
            self.assertEqual(self.client.get("/api/context", headers={"Host": "unknown.invalid"}).status_code, 404)
            self.assertEqual(self.client.get("/api/context", headers=self.headers(host="unknown.invalid")).status_code, 404)
        finally:
            app.config["REGIONAL_ALLOW_DEVELOPMENT_FALLBACK"] = previous

    def test_inactive_domain_and_site_fail_closed_and_selector_updates_immediately(self):
        with app.app_context():
            SiteDomain.query.filter_by(hostname=GLOBAL_HOST, url_prefix="/mx").one().is_active = False
            db.session.commit()
        self.assertEqual(self.client.get("/api/context", headers=self.headers("/mx")).status_code, 404)
        response = self.admin_patch({"is_active": False}, code="MX")
        self.assertEqual(response.status_code, 200)
        selector = self.client.get("/api/sites", headers=self.headers()).get_json()["sites"]
        self.assertEqual([item["code"] for item in selector], ["BR"])
        self.assertEqual(selector[0]["url_prefix"], "/br")

    def test_spoofed_regional_headers_rejected_on_public_host_and_nonloopback_internal_host(self):
        for host, remote in ((GLOBAL_HOST, "127.0.0.1"), ("127.0.0.1:5000", "203.0.113.5"), ("localhost", "10.0.0.2")):
            for supplied in ({"X-Regional-Host": GLOBAL_HOST}, {"X-Regional-Prefix": "/br"}, {"X-Regional-Host": GLOBAL_HOST, "X-Regional-Prefix": "/br"}):
                with self.subTest(host=host, remote=remote, supplied=supplied):
                    response = self.client.get("/api/context", headers={"Host": host, **supplied}, environ_overrides={"REMOTE_ADDR": remote})
                    self.assertEqual(response.status_code, 400)

    def test_both_loopback_addresses_and_internal_hosts_are_supported(self):
        for host in ("localhost:5000", "127.0.0.1:5000"):
            for remote in ("127.0.0.1", "::1"):
                response = self.client.get("/api/context", headers={**self.headers(), "Host": host}, environ_overrides={"REMOTE_ADDR": remote})
                self.assertEqual(response.status_code, 200)

    def test_forwarded_headers_never_override_registered_host_or_regional_pair(self):
        response = self.client.get("/api/context", headers={"Host": LEGACY_HOST, "X-Forwarded-Host": "attacker.invalid", "Forwarded": "host=attacker.invalid"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["site"]["code"], "BR")
        response = self.client.get("/api/context", headers={"Host": "127.0.0.1", "X-Forwarded-Host": GLOBAL_HOST, "X-Regional-Prefix": "/br"})
        self.assertEqual(response.status_code, 404)

    def test_forbidden_site_ids_headers_and_admin_crud_have_no_security_exception(self):
        for header in ("X-Site-Id", "X-Site-Key", "X-Regional-Site"):
            for path in ("/api/context", "/api/admin/sites"):
                self.assertEqual(self.client.get(path, headers={**self.headers(), header: "2"}).status_code, 400)
        for key in ("site_id", "siteId", "site_code", "siteCode"):
            self.assertEqual(self.client.get(f"/api/context?{key}=2", headers=self.headers()).status_code, 400)
            self.assertEqual(self.client.patch("/api/admin/sites/BR", headers=self.headers(), json={key: 2}).status_code, 400)
        self.assertEqual(self.client.get("/api/admin/sites", headers={"Host": LEGACY_HOST, "X-Regional-Prefix": "/br"}).status_code, 400)

    def test_company_candidate_admin_access_and_refresh_cannot_cross_same_hostname_country(self):
        for name, kind, path in (("candidate", "candidate", "/api/auth/me"), ("owner", "company", "/api/jobs/my-jobs"), ("platform", "admin", "/api/admin/sites")):
            tokens = self.login(name, kind)
            self.assertEqual(self.client.get(path, headers=self.headers(token=tokens["access_token"])).status_code, 200)
            self.assertEqual(self.client.get(path, headers=self.headers("/mx", tokens["access_token"])).status_code, 403)
            self.assertEqual(self.client.post("/api/auth/refresh", headers=self.headers("/mx", tokens["refresh_token"])).status_code, 403)

    def test_logout_cannot_cross_country_or_revoke_foreign_family(self):
        tokens = self.login("candidate", "candidate")
        self.assertEqual(self.client.post("/api/auth/logout", headers=self.headers("/mx", tokens["access_token"])).status_code, 403)
        self.assertEqual(self.client.post("/api/auth/logout", headers=self.headers("/mx", tokens["refresh_token"])).status_code, 403)
        self.assertEqual(self.client.get("/api/auth/me", headers=self.headers(token=tokens["access_token"])).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout", headers=self.headers(token=tokens["access_token"])).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me", headers=self.headers(token=tokens["access_token"])).status_code, 401)

    def test_company_approval_and_viewer_rbac_are_preserved(self):
        viewer = self.login("viewer", "company")["access_token"]
        self.assertEqual(self.invite(viewer).status_code, 403)
        owner = self.login("owner", "company")["access_token"]
        with app.app_context():
            CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one().status = CompanyStatus.PENDING
            db.session.commit()
        self.assertEqual(self.invite(owner).status_code, 403)
        self.assertEqual(self.client.post("/api/jobs/", headers=self.headers(token=owner), json={"title": "Blocked", "description": "Blocked"}).status_code, 403)
        regional = self.login("regional", "admin")["access_token"]
        self.assertEqual(self.admin_patch({"name": "No"}, token=regional).status_code, 403)

    def test_admin_domain_replacement_supports_host_reuse_aliases_and_detects_duplicate_pairs(self):
        domains = [
            {"hostname": GLOBAL_HOST, "url_prefix": "/br", "is_primary": True},
            {"hostname": LEGACY_HOST, "url_prefix": ""},
            {"hostname": "second-br.invalid", "url_prefix": "/br"},
        ]
        response = self.admin_patch({"domains": domains, "locales": [{"locale": "pt-BR", "is_default": True}]})
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual(response.get_json()["site"]["url_prefix"], "/br")
        self.assertEqual(self.admin_patch({"domains": domains}).status_code, 200)
        duplicate = domains + [{"hostname": GLOBAL_HOST, "url_prefix": "/mx"}]
        self.assertEqual(self.admin_patch({"domains": duplicate}).status_code, 409)
        self.assertEqual(self.client.get("/api/context", headers=self.headers()).status_code, 200)

    def test_admin_active_invariant_rolls_back_bad_primary_locale_and_origin(self):
        for payload in ({"domains": []}, {"domains": [{"hostname": GLOBAL_HOST, "url_prefix": "/br", "is_primary": True, "is_active": False}]}, {"locales": []}, {"canonical_origin": None}, {"canonical_origin": "https://unregistered.invalid"}, {"canonical_origin": f"https://{GLOBAL_HOST}/br"}):
            with self.subTest(payload=payload):
                self.assertEqual(self.admin_patch(payload).status_code, 400)
                self.assertEqual(self.client.get("/api/context", headers=self.headers()).status_code, 200)
        two_primary = [{"hostname": GLOBAL_HOST, "url_prefix": "/br", "is_primary": True}, {"hostname": "second-primary.invalid", "url_prefix": "/br", "is_primary": True}]
        self.assertEqual(self.admin_patch({"domains": two_primary}).status_code, 409)

    def test_admin_create_delete_site_with_shared_hostname_and_new_prefix(self):
        token = self.login("platform", "admin")["access_token"]
        payload = {"code": "AR", "name": "Argentina", "country_code": "AR", "default_locale": "es-AR", "currency_code": "ARS", "timezone": "UTC", "canonical_origin": f"https://{GLOBAL_HOST}", "is_active": True, "domains": [{"hostname": GLOBAL_HOST, "url_prefix": "/ar", "is_primary": True}]}
        response = self.client.post("/api/admin/sites", headers=self.headers(token=token), json=payload)
        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertEqual(response.get_json()["site"]["regional_base_url"], f"https://{GLOBAL_HOST}/ar")
        self.assertEqual(self.client.get("/api/context", headers=self.headers("/ar")).status_code, 200)
        self.assertEqual(self.client.delete("/api/admin/sites/AR", headers=self.headers(token=token)).status_code, 409)
        self.assertEqual(self.admin_patch({"is_active": False}, code="AR", token=token).status_code, 200)
        self.assertEqual(self.client.get("/api/context", headers=self.headers("/ar")).status_code, 404)
        self.assertEqual(self.client.delete("/api/admin/sites/AR", headers=self.headers(token=token)).status_code, 204)

    def test_admin_reset_link_uses_primary_regional_base_and_fragment(self):
        token = self.login("platform", "admin")["access_token"]
        response = self.client.post(f'/api/admin/access-users/{self.users["candidate"]}/password-reset', headers=self.headers(token=token), json={"admin_password": PASSWORD, "reason": "Authorized test"})
        self.assertEqual(response.status_code, 200, response.get_json())
        parsed = urlparse(response.get_json()["reset_url"])
        self.assertEqual((parsed.scheme, parsed.netloc, parsed.path), ("https", GLOBAL_HOST, "/br/redefinir-senha"))
        self.assertEqual(parse_qs(parsed.query), {"type": ["candidate"]})
        self.assertIn("token", parse_qs(parsed.fragment))

    def test_public_reset_email_uses_primary_regional_base_even_from_legacy_alias(self):
        with patch("src.routes.auth.configured_email_provider", return_value="smtp"), patch("src.routes.auth.send_password_reset_email") as send:
            response = self.client.post("/api/auth/forgot-password", headers={"Host": LEGACY_HOST}, json={"email": "candidate@example.invalid"})
        self.assertEqual(response.status_code, 200)
        parsed = urlparse(send.call_args.kwargs["reset_url"])
        self.assertEqual(parsed.netloc, GLOBAL_HOST)
        self.assertEqual(parsed.path, "/br/redefinir-senha")
        self.assertIn("token", parse_qs(parsed.query))

    def test_invite_manual_email_resend_and_accept_remain_regional(self):
        owner = self.login("owner", "company")["access_token"]
        response = self.invite(owner)
        self.assertEqual(response.status_code, 201, response.get_json())
        parsed = urlparse(response.get_json()["invitation_url"])
        self.assertEqual(parsed.netloc, GLOBAL_HOST)
        self.assertTrue(parsed.path.startswith("/br/empresa/convite/"))
        raw_token = parsed.path.rsplit("/", 1)[-1]
        self.assertEqual(self.client.get(f"/api/company-team/invitations/{raw_token}", headers=self.headers("/mx")).status_code, 404)
        invitation_id = response.get_json()["invitation"]["id"]
        resent = self.client.post(f"/api/company-team/invitations/{invitation_id}/resend", headers=self.headers(token=owner))
        self.assertEqual(resent.status_code, 200)
        self.assertTrue(urlparse(resent.get_json()["invitation_url"]).path.startswith("/br/empresa/convite/"))
        resent_token = urlparse(resent.get_json()["invitation_url"]).path.rsplit("/", 1)[-1]
        accepted = self.client.post(
            f"/api/company-team/invitations/{resent_token}", headers=self.headers(),
            json={"password": "InvitedPassword123", "accept_terms": True, "accept_privacy": True},
        )
        self.assertEqual(accepted.status_code, 200, accepted.get_json())
        self.assertEqual(self.client.get(f"/api/company-team/invitations/{resent_token}", headers=self.headers()).status_code, 404)
        with patch("src.routes.company_team.configured_email_provider", return_value="smtp"), patch("src.routes.company_team.send_company_invitation_email") as send:
            emailed = self.invite(owner, email="emailed@example.invalid")
        self.assertEqual(emailed.status_code, 201)
        self.assertEqual(emailed.get_json()["delivery"], "email")
        self.assertNotIn("invitation_url", emailed.get_json())
        self.assertTrue(urlparse(send.call_args.kwargs["invitation_url"]).path.startswith("/br/empresa/convite/"))

    def test_foreign_invitation_resend_is_404_even_for_company_present_in_both_regions(self):
        br_owner = self.login("owner", "company")["access_token"]
        response = self.invite(br_owner)
        invitation_id = response.get_json()["invitation"]["id"]
        mx_owner = self.login("owner", "company", "/mx")["access_token"]
        self.assertEqual(self.client.post(f"/api/company-team/invitations/{invitation_id}/resend", headers=self.headers("/mx", mx_owner)).status_code, 404)
        self.assertEqual(self.client.delete(f"/api/company-team/invitations/{invitation_id}", headers=self.headers("/mx", mx_owner)).status_code, 404)
        mx_team = self.client.get("/api/company-team/members", headers=self.headers("/mx", mx_owner))
        self.assertEqual(mx_team.status_code, 200)
        self.assertEqual(mx_team.get_json()["invitations"], [])

    def test_invalid_security_url_base_generates_no_reset_or_invitation(self):
        owner = self.login("owner", "company")["access_token"]
        with app.app_context():
            Site.query.filter_by(id=self.br_id).update({"canonical_origin": "https://unregistered.invalid"})
            db.session.commit()
            self.assertIsNone(trusted_regional_base_url(db.session.get(Site, self.br_id)))
        self.assertEqual(self.invite(owner).status_code, 503)
        with patch("src.routes.auth.configured_email_provider", return_value="smtp"), patch("src.routes.auth.send_password_reset_email") as send:
            response = self.client.post("/api/auth/forgot-password", headers=self.headers(), json={"email": "candidate@example.invalid"})
        self.assertEqual(response.status_code, 503)
        send.assert_not_called()
        with app.app_context():
            self.assertEqual(CompanyInvitation.query.count(), 0)
            self.assertIsNone(db.session.get(User, self.users["candidate"]).reset_token)

    def test_unrelated_external_company_url_is_not_rewritten(self):
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            self.assertEqual(company.website, "https://external.invalid/catalog")
            self.assertEqual(db.session.get(Site, self.br_id).regional_base_url, f"https://{GLOBAL_HOST}/br")

    def test_default_cors_is_exact_global_origin_and_not_wildcard(self):
        self.assertEqual(set(Config.CORS_ORIGINS), {f"https://{GLOBAL_HOST}", f"https://{LEGACY_HOST}"})
        for origin, permitted in ((f"https://{GLOBAL_HOST}", True), (f"https://{LEGACY_HOST}", True), ("https://attacker.portalerp.com", False)):
            response = self.client.get("/api/context", headers={"Host": LEGACY_HOST, "Origin": origin})
            self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), origin if permitted else None)


if __name__ == "__main__":
    unittest.main()
