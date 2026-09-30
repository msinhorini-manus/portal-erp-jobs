import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta

from flask_jwt_extended import create_access_token


fd, database_path = tempfile.mkstemp(prefix="portal-erp-jobs-admin0-", suffix=".db")
os.close(fd)
os.environ["SECRET_KEY"] = "admin-zero-secret-key-longer-than-thirty-two"
os.environ["JWT_SECRET_KEY"] = "admin-zero-jwt-key-longer-than-thirty-two"
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
    Candidate,
    CandidateSite,
    Company,
    CompanySite,
    CompanyStatus,
    CompanyUser,
    CompanyUserRole,
    SessionFamily,
    Site,
    SiteDomain,
    SiteLocale,
    User,
)
from src.rate_limit import auth_rate_limiter  # noqa: E402


class AdminWaveZeroTests(unittest.TestCase):
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
            br.domains.append(SiteDomain(hostname="jobs.portalerp.com.br", is_primary=True, is_active=True))
            br.locales.append(SiteLocale(locale="pt-BR", is_default=True, is_active=True))
            mx = Site(
                code="MX",
                name="México",
                country_code="MX",
                default_locale="es-MX",
                currency_code="MXN",
                timezone="America/Mexico_City",
                canonical_origin="https://jobs-mx.invalid",
                is_active=True,
            )
            mx.domains.append(SiteDomain(hostname="jobs-mx.invalid", is_primary=True, is_active=True))
            mx.locales.append(SiteLocale(locale="es-MX", is_default=True, is_active=True))
            db.session.add_all([br, mx])
            db.session.flush()

            cls.br_id = br.id
            cls.mx_id = mx.id

            br_admin_user = User(email="br-admin@example.invalid", user_type="admin", is_active=True)
            br_admin_user.set_password("ValidPassword123")
            mx_admin_user = User(email="mx-admin@example.invalid", user_type="admin", is_active=True)
            mx_admin_user.set_password("ValidPassword123")
            moderator_user = User(email="br-moderator@example.invalid", user_type="admin", is_active=True)
            moderator_user.set_password("ValidPassword123")
            target_admin_user = User(email="target-admin@example.invalid", user_type="admin", is_active=True)
            target_admin_user.set_password("ValidPassword123")
            br_candidate_user = User(email="br-candidate@example.invalid", user_type="candidate", is_active=True)
            br_candidate_user.set_password("ValidPassword123")
            mx_candidate_user = User(email="mx-candidate@example.invalid", user_type="candidate", is_active=True)
            mx_candidate_user.set_password("ValidPassword123")
            company_user = User(email="br-company@example.invalid", user_type="company", is_active=True)
            company_user.set_password("ValidPassword123")
            db.session.add_all([
                br_admin_user,
                mx_admin_user,
                moderator_user,
                target_admin_user,
                br_candidate_user,
                mx_candidate_user,
                company_user,
            ])
            db.session.flush()

            br_admin = Admin(user_id=br_admin_user.id, name="BR Super", role=AdminRole.SUPER_ADMIN, is_platform_admin=True)
            br_admin.set_role(AdminRole.SUPER_ADMIN)
            mx_admin = Admin(user_id=mx_admin_user.id, name="MX Super", role=AdminRole.SUPER_ADMIN, is_platform_admin=False)
            mx_admin.set_role(AdminRole.SUPER_ADMIN)
            moderator = Admin(user_id=moderator_user.id, name="BR Moderator", role=AdminRole.MODERATOR)
            moderator.set_role(AdminRole.MODERATOR)
            target_admin = Admin(user_id=target_admin_user.id, name="BR Target", role=AdminRole.ADMIN)
            target_admin.set_role(AdminRole.ADMIN)
            db.session.add_all([br_admin, mx_admin, moderator, target_admin])
            db.session.flush()
            db.session.add_all([
                AdminSite(admin_id=br_admin.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=mx_admin.id, site_id=mx.id, is_active=True),
                AdminSite(admin_id=moderator.id, site_id=br.id, is_active=True),
                AdminSite(admin_id=target_admin.id, site_id=br.id, is_active=True),
            ])

            br_candidate = Candidate(
                user_id=br_candidate_user.id,
                first_name="Candidato",
                last_name="Brasil",
                city="São Paulo",
                linkedin_url="https://www.linkedin.com/in/candidato-br",
                github_url="https://github.com/candidato-br",
            )
            mx_candidate = Candidate(user_id=mx_candidate_user.id, first_name="Candidato", last_name="Mexico")
            company = Company(user_id=company_user.id, company_name="Empresa BR")
            db.session.add_all([br_candidate, mx_candidate, company])
            db.session.flush()
            db.session.add_all([
                CandidateSite(candidate_id=br_candidate.id, site_id=br.id, is_active=True, is_discoverable=True, salary_currency="BRL"),
                CandidateSite(candidate_id=br_candidate.id, site_id=mx.id, is_active=True, is_discoverable=True, salary_currency="MXN"),
                CandidateSite(candidate_id=mx_candidate.id, site_id=mx.id, is_active=True, is_discoverable=True, salary_currency="MXN"),
                CompanySite(company_id=company.id, site_id=br.id, status=CompanyStatus.PENDING, display_name="Empresa BR", max_active_jobs=3),
                CompanyUser(company_id=company.id, user_id=company_user.id, role=CompanyUserRole.OWNER, name="Owner BR", is_active=True, invitation_accepted=True),
            ])
            db.session.commit()

            cls.br_admin_user_id = br_admin_user.id
            cls.br_admin_id = br_admin.id
            cls.mx_admin_user_id = mx_admin_user.id
            cls.mx_admin_id = mx_admin.id
            cls.moderator_user_id = moderator_user.id
            cls.target_admin_user_id = target_admin_user.id
            cls.target_admin_id = target_admin.id
            cls.br_candidate_user_id = br_candidate_user.id
            cls.mx_candidate_user_id = mx_candidate_user.id
            cls.br_candidate_id = br_candidate.id
            cls.mx_candidate_id = mx_candidate.id
            cls.company_id = company.id

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
        if os.path.exists(database_path):
            os.unlink(database_path)

    def setUp(self):
        auth_rate_limiter.clear()
        with app.app_context():
            AdminAuditEvent.query.delete()
            SessionFamily.query.delete()
            CandidateSite.query.update({"is_active": True, "is_discoverable": True})
            CompanySite.query.update({"status": CompanyStatus.PENDING, "approval_reason": None})
            for user in User.query.all():
                user.is_active = True
                user.failed_login_attempts = 0
                user.locked_until = None
            User.query.get(self.br_admin_user_id).set_password("ValidPassword123")
            User.query.get(self.mx_admin_user_id).set_password("ValidPassword123")
            User.query.get(self.moderator_user_id).set_password("ValidPassword123")
            User.query.get(self.target_admin_user_id).set_password("ValidPassword123")
            moderator = Admin.query.filter_by(user_id=self.moderator_user_id).one()
            moderator.set_role(AdminRole.MODERATOR)
            for assignment in AdminSite.query.all():
                assignment.is_active = True
            db.session.commit()

    def _token(self, user_id, site_id, site_code):
        with app.app_context():
            admin = Admin.query.filter_by(user_id=user_id).one()
            family_id = str(uuid.uuid4())
            db.session.add(SessionFamily(
                user_id=user_id,
                site_id=site_id,
                family_id=family_id,
                current_refresh_jti=str(uuid.uuid4()),
                expires_at=datetime.utcnow() + timedelta(days=1),
            ))
            token = create_access_token(
                identity=str(user_id),
                additional_claims={
                    "user_type": "admin",
                    "site_id": site_id,
                    "site_code": site_code,
                    "admin_id": admin.id,
                    "family_id": family_id,
                },
            )
            db.session.commit()
            return token

    @staticmethod
    def _headers(token, host="jobs.portalerp.com.br"):
        return {"Authorization": f"Bearer {token}", "Host": host}

    def test_admin_login_requires_explicit_site_assignment(self):
        allowed = self.client.post(
            "/api/auth/login/admin",
            json={"email": "br-admin@example.invalid", "password": "ValidPassword123"},
            headers={"Host": "jobs.portalerp.com.br"},
        )
        self.assertEqual(allowed.status_code, 200)
        denied = self.client.post(
            "/api/auth/login/admin",
            json={"email": "br-admin@example.invalid", "password": "ValidPassword123"},
            headers={"Host": "jobs-mx.invalid"},
        )
        self.assertEqual(denied.status_code, 401)
        self.assertEqual(denied.get_json(), {"error": "Email ou senha inválidos"})

    def test_legacy_admin_management_routes_are_not_registered(self):
        token = self._token(self.br_admin_user_id, self.br_id, "BR")
        headers = self._headers(token)
        self.assertEqual(self.client.get("/api/auth/admin/list", headers=headers).status_code, 404)
        self.assertEqual(
            self.client.post(
                "/api/auth/admin/register",
                json={"email": "legacy@example.invalid", "password": "ValidPassword123", "name": "Legacy"},
                headers=headers,
            ).status_code,
            404,
        )

    def test_users_are_site_scoped_and_delete_is_regional_soft_delete(self):
        token = self._token(self.br_admin_user_id, self.br_id, "BR")
        headers = self._headers(token)
        response = self.client.get("/api/admin/users?per_page=100", headers=headers)
        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.get_json()["users"]}
        self.assertIn(self.br_candidate_user_id, ids)
        self.assertNotIn(self.mx_candidate_user_id, ids)

        cross_site = self.client.delete(f"/api/admin/users/{self.mx_candidate_user_id}", headers=headers)
        self.assertEqual(cross_site.status_code, 404)

        local = self.client.delete(f"/api/admin/users/{self.br_candidate_user_id}", headers=headers)
        self.assertEqual(local.status_code, 200)
        with app.app_context():
            self.assertIsNotNone(db.session.get(User, self.br_candidate_user_id))
            membership = CandidateSite.query.filter_by(candidate_id=self.br_candidate_id, site_id=self.br_id).one()
            self.assertFalse(membership.is_active)
            self.assertTrue(AdminAuditEvent.query.filter_by(action="user.regional_access_removed", site_id=self.br_id).count())

    def test_moderator_is_denied_company_and_catalog_mutations(self):
        token = self._token(self.moderator_user_id, self.br_id, "BR")
        headers = self._headers(token)
        self.assertEqual(self.client.get("/api/admin/companies", headers=headers).status_code, 403)
        self.assertEqual(
            self.client.post("/api/config/areas", json={"name": "Bloqueada"}, headers=headers).status_code,
            403,
        )
        self.assertEqual(self.client.get("/api/admin/stats", headers=headers).status_code, 200)

        super_token = self._token(self.br_admin_user_id, self.br_id, "BR")
        created = self.client.post(
            "/api/config/areas",
            json={"name": f"Área auditável {uuid.uuid4()}"},
            headers=self._headers(super_token),
        )
        self.assertEqual(created.status_code, 201)
        with app.app_context():
            self.assertTrue(AdminAuditEvent.query.filter_by(action="catalog.area.created", site_id=self.br_id).count())

    def test_company_lifecycle_requires_formal_approval_and_is_audited(self):
        token = self._token(self.br_admin_user_id, self.br_id, "BR")
        headers = self._headers(token)
        blocked = self.client.patch(f"/api/admin/companies/{self.company_id}/toggle-active", headers=headers)
        self.assertEqual(blocked.status_code, 409)
        missing_reason = self.client.post(f"/api/admin/companies/{self.company_id}/reject", json={}, headers=headers)
        self.assertEqual(missing_reason.status_code, 400)
        approved = self.client.post(f"/api/admin/companies/{self.company_id}/approve", headers=headers)
        self.assertEqual(approved.status_code, 200)
        suspended = self.client.patch(f"/api/admin/companies/{self.company_id}/toggle-active", headers=headers)
        self.assertEqual(suspended.status_code, 200)
        with app.app_context():
            membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one()
            self.assertEqual(membership.status, CompanyStatus.SUSPENDED)
            actions = {event.action for event in AdminAuditEvent.query.filter_by(site_id=self.br_id).all()}
            self.assertIn("company.approved", actions)
            self.assertIn("company.suspended", actions)

    def test_multisite_candidate_global_profile_is_read_only_for_regional_admin(self):
        token = self._token(self.br_admin_user_id, self.br_id, "BR")
        headers = self._headers(token)
        details = self.client.get(f"/api/admin/candidates/{self.br_candidate_id}", headers=headers)
        self.assertEqual(details.status_code, 200)
        payload = details.get_json()
        self.assertFalse(payload["global_profile_editable"])
        self.assertEqual(payload["linkedin_url"], "https://www.linkedin.com/in/candidato-br")
        self.assertEqual(payload["github_url"], "https://github.com/candidato-br")

        blocked = self.client.put(
            f"/api/admin/candidates/{self.br_candidate_id}",
            json={"city": "Rio de Janeiro"},
            headers=headers,
        )
        self.assertEqual(blocked.status_code, 409)
        regional = self.client.put(
            f"/api/admin/candidates/{self.br_candidate_id}",
            json={"is_discoverable": False},
            headers=headers,
        )
        self.assertEqual(regional.status_code, 200)
        with app.app_context():
            candidate = db.session.get(Candidate, self.br_candidate_id)
            self.assertEqual(candidate.city, "São Paulo")
            br_membership = CandidateSite.query.filter_by(candidate_id=self.br_candidate_id, site_id=self.br_id).one()
            mx_membership = CandidateSite.query.filter_by(candidate_id=self.br_candidate_id, site_id=self.mx_id).one()
            self.assertFalse(br_membership.is_discoverable)
            self.assertTrue(mx_membership.is_discoverable)

    def test_admin_password_policy_revokes_sessions_and_admin_list_is_site_scoped(self):
        actor = self._token(self.br_admin_user_id, self.br_id, "BR")
        self._token(self.target_admin_user_id, self.br_id, "BR")
        headers = self._headers(actor)
        weak = self.client.put(
            f"/api/admin/admins/{self.target_admin_id}",
            json={"password": "weak"},
            headers=headers,
        )
        self.assertEqual(weak.status_code, 400)
        strong = self.client.put(
            f"/api/admin/admins/{self.target_admin_id}",
            json={"password": "Replacement456"},
            headers=headers,
        )
        self.assertEqual(strong.status_code, 200)
        listing = self.client.get("/api/admin/admins", headers=headers)
        self.assertEqual(listing.status_code, 200)
        listed_ids = {item["user_id"] for item in listing.get_json()["admins"]}
        self.assertIn(self.target_admin_user_id, listed_ids)
        self.assertNotIn(self.mx_admin_user_id, listed_ids)
        with app.app_context():
            target = db.session.get(User, self.target_admin_user_id)
            self.assertTrue(target.check_password("Replacement456"))
            families = SessionFamily.query.filter_by(user_id=self.target_admin_user_id).all()
            self.assertTrue(families)
            self.assertTrue(all(item.revoked_at is not None for item in families))
            self.assertTrue(AdminAuditEvent.query.filter_by(action="admin.updated", site_id=self.br_id).count())

    def test_admin_site_assignments_are_explicit_and_cross_site_targets_are_hidden(self):
        actor = self._token(self.br_admin_user_id, self.br_id, "BR")
        headers = self._headers(actor)
        cross_site = self.client.put(
            f"/api/admin/admins/{self.mx_admin_id}",
            json={"name": "Não deve alterar"},
            headers=headers,
        )
        self.assertEqual(cross_site.status_code, 404)

        assigned = self.client.put(
            f"/api/admin/admins/{self.target_admin_id}/sites",
            json={"site_codes": ["BR", "MX"]},
            headers=headers,
        )
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(
            {item["site_code"] for item in assigned.get_json()["sites"] if item["is_active"]},
            {"BR", "MX"},
        )
        login_mx = self.client.post(
            "/api/auth/login/admin",
            json={"email": "target-admin@example.invalid", "password": "ValidPassword123"},
            headers={"Host": "jobs-mx.invalid"},
        )
        self.assertEqual(login_mx.status_code, 200)

        removed = self.client.put(
            f"/api/admin/admins/{self.target_admin_id}/sites",
            json={"site_codes": ["BR"]},
            headers=headers,
        )
        self.assertEqual(removed.status_code, 200)
        with app.app_context():
            mx_families = SessionFamily.query.filter_by(
                user_id=self.target_admin_user_id,
                site_id=self.mx_id,
            ).all()
            self.assertTrue(mx_families)
            self.assertTrue(all(item.revoked_at is not None for item in mx_families))

        own_removal = self.client.put(
            f"/api/admin/admins/{self.br_admin_id}/sites",
            json={"site_codes": ["MX"]},
            headers=headers,
        )
        self.assertEqual(own_removal.status_code, 409)

        mx_actor = self._token(self.mx_admin_user_id, self.mx_id, "MX")
        unauthorized_assignment = self.client.put(
            f"/api/admin/admins/{self.mx_admin_id}/sites",
            json={"site_codes": ["BR", "MX"]},
            headers=self._headers(mx_actor, host="jobs-mx.invalid"),
        )
        self.assertEqual(unauthorized_assignment.status_code, 403)
        unauthorized_catalog = self.client.post(
            "/api/config/areas",
            json={"name": "Não deve ser global"},
            headers=self._headers(mx_actor, host="jobs-mx.invalid"),
        )
        self.assertEqual(unauthorized_catalog.status_code, 403)

    def test_audit_feed_never_crosses_sites_or_exposes_fingerprints(self):
        with app.app_context():
            br_admin = Admin.query.filter_by(user_id=self.br_admin_user_id).one()
            mx_admin = Admin.query.filter_by(user_id=self.mx_admin_user_id).one()
            db.session.add_all([
                AdminAuditEvent(site_id=self.br_id, actor_admin_id=br_admin.id, action="test.br", target_type="test", details={}, ip_prefix="127.0.0.0/24", user_agent_hash="a" * 64),
                AdminAuditEvent(site_id=self.mx_id, actor_admin_id=mx_admin.id, action="test.mx", target_type="test", details={}),
            ])
            db.session.commit()
        token = self._token(self.br_admin_user_id, self.br_id, "BR")
        response = self.client.get("/api/admin/audit-events?per_page=100", headers=self._headers(token))
        self.assertEqual(response.status_code, 200)
        events = response.get_json()["events"]
        self.assertEqual({item["action"] for item in events}, {"test.br"})
        self.assertNotIn("ip_prefix", events[0])
        self.assertNotIn("user_agent_hash", events[0])


if __name__ == "__main__":
    unittest.main()
