import os
import tempfile
import unittest
from urllib.parse import urlparse

fd, database_path = tempfile.mkstemp(prefix="portal-erp-jobs-wave8-", suffix=".db")
os.close(fd)
os.environ["SECRET_KEY"] = "test-secret-key-that-is-longer-than-thirty-two-characters"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-that-is-longer-than-thirty-two-characters"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path}"
os.environ["CORS_ORIGINS"] = "https://jobs.portalerp.com.br"
os.environ["ALLOW_ADMIN_SETUP"] = "false"
os.environ["FLASK_ENV"] = "testing"
os.environ.pop("EMAIL_PROVIDER", None)
os.environ.pop("RESEND_API_KEY", None)
os.environ.pop("SMTP_HOST", None)

from src.config import db  # noqa: E402
from src.main import app  # noqa: E402
from src.models.company import Company, CompanySite, CompanyStatus  # noqa: E402
from src.models.company_team import CompanyAuditEvent, CompanyInvitation  # noqa: E402
from src.models.company_user import CompanyUser, CompanyUserRole  # noqa: E402
from src.models.legal_acceptance import LegalAcceptance  # noqa: E402
from src.models.site import Site, SiteDomain, SiteLocale  # noqa: E402
from src.models.user import User  # noqa: E402
from src.rate_limit import auth_rate_limiter  # noqa: E402


class CompanyTeamWave8Tests(unittest.TestCase):
    HOST = {"Host": "jobs.portalerp.com.br"}

    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True, EMAIL_PROVIDER="")
        cls.client = app.test_client()
        with app.app_context():
            db.create_all()
            site = Site(code="BR", name="Brasil", country_code="BR", default_locale="pt-BR", currency_code="BRL", timezone="America/Sao_Paulo", canonical_origin="https://jobs.portalerp.com.br", is_active=True)
            site.domains.append(SiteDomain(hostname="jobs.portalerp.com.br", is_primary=True, is_active=True))
            site.locales.append(SiteLocale(locale="pt-BR", is_default=True, is_active=True))
            db.session.add(site)
            owner_user = User(email="owner-wave8@example.com", user_type="company")
            owner_user.set_password("OwnerWave82026")
            db.session.add(owner_user)
            db.session.flush()
            company = Company(user_id=owner_user.id, company_name="Wave8 Software", cnpj="WAVE8-TAX")
            db.session.add(company)
            db.session.flush()
            db.session.add(CompanySite(company_id=company.id, site_id=site.id, status=CompanyStatus.APPROVED, display_name=company.company_name, max_active_jobs=5))
            owner = CompanyUser(company_id=company.id, user_id=owner_user.id, role=CompanyUserRole.OWNER, name="Owner Wave8", is_active=True, invitation_accepted=True)
            db.session.add(owner)
            db.session.commit()
            cls.owner_id = owner.id
            cls.company_id = company.id
            cls.site_id = site.id

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
        if os.path.exists(database_path):
            os.unlink(database_path)

    def setUp(self):
        auth_rate_limiter.clear()

    def _login(self, email, password):
        response = self.client.post("/api/auth/login/company", headers=self.HOST, json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()["access_token"]

    def _headers(self, token):
        return {**self.HOST, "Authorization": f"Bearer {token}"}

    def _invite_and_accept(self, owner_token, *, email, role, password):
        created = self.client.post("/api/company-team/invitations", headers=self._headers(owner_token), json={"email": email, "name": email.split("@")[0], "role": role, "position": "Equipe"})
        self.assertEqual(created.status_code, 201, created.get_json())
        payload = created.get_json()
        self.assertEqual(payload["delivery"], "manual")
        token = urlparse(payload["invitation_url"]).path.rsplit("/", 1)[-1]
        with app.app_context():
            record = CompanyInvitation.query.filter_by(email=email).one()
            self.assertNotEqual(record.token_hash, token)
        preview = self.client.get(f"/api/company-team/invitations/{token}", headers=self.HOST)
        self.assertEqual(preview.status_code, 200, preview.get_json())
        self.assertNotEqual(preview.get_json()["invitation"]["email"], email)
        self.assertTrue(preview.get_json()["invitation"]["email"].endswith(email[email.index("@"):]))
        accepted = self.client.post(f"/api/company-team/invitations/{token}", headers=self.HOST, json={"password": password, "accept_terms": True, "accept_privacy": True})
        self.assertEqual(accepted.status_code, 200, accepted.get_json())
        reused = self.client.post(f"/api/company-team/invitations/{token}", headers=self.HOST, json={"password": password, "accept_terms": True, "accept_privacy": True})
        self.assertIn(reused.status_code, (404, 409))
        return self._login(email, password)

    def test_registration_requires_and_records_versioned_acceptance(self):
        rejected = self.client.post("/api/auth/register/candidate", headers=self.HOST, json={"email": "candidate-no-consent@example.com", "password": "CandidateWave82026", "name": "No Consent"})
        self.assertEqual(rejected.status_code, 400, rejected.get_json())
        accepted = self.client.post("/api/auth/register/candidate", headers=self.HOST, json={"email": "candidate-consent@example.com", "password": "CandidateWave82026", "name": "Consent User", "accept_terms": True, "accept_privacy": True})
        self.assertEqual(accepted.status_code, 201, accepted.get_json())
        with app.app_context():
            user = User.query.filter_by(email="candidate-consent@example.com").one()
            self.assertEqual({item.document_type for item in LegalAcceptance.query.filter_by(user_id=user.id, site_id=self.site_id).all()}, {"terms", "privacy"})

        company_rejected = self.client.post("/api/auth/register/company", headers=self.HOST, json={"email": "company-no-consent@example.com", "password": "CompanyWave82026", "trade_name": "No Consent", "tax_id": "W8-NO-CONSENT"})
        self.assertEqual(company_rejected.status_code, 400, company_rejected.get_json())
        company_accepted = self.client.post("/api/auth/register/company", headers=self.HOST, json={"email": "company-consent@example.com", "password": "CompanyWave82026", "trade_name": "Consent Company", "tax_id": "W8-CONSENT", "accept_terms": True, "accept_privacy": True})
        self.assertEqual(company_accepted.status_code, 201, company_accepted.get_json())
        with app.app_context():
            user = User.query.filter_by(email="company-consent@example.com").one()
            self.assertEqual(LegalAcceptance.query.filter_by(user_id=user.id, site_id=self.site_id).count(), 2)
            self.assertEqual(CompanyUser.query.filter_by(user_id=user.id, role=CompanyUserRole.OWNER, is_active=True).count(), 1)

    def test_team_invitation_rbac_last_owner_and_session_revocation(self):
        owner_token = self._login("owner-wave8@example.com", "OwnerWave82026")
        hr_token = self._invite_and_accept(owner_token, email="hr-wave8@example.com", role="hr", password="HrMemberWave82026")
        viewer_token = self._invite_and_accept(owner_token, email="viewer-wave8@example.com", role="viewer", password="ViewerWave82026")
        admin_token = self._invite_and_accept(owner_token, email="admin-wave8@example.com", role="admin", password="AdminWave82026")

        hr_me = self.client.get("/api/auth/me", headers=self._headers(hr_token))
        self.assertEqual(hr_me.status_code, 200, hr_me.get_json())
        self.assertEqual(hr_me.get_json()["role"], "hr")
        self.assertTrue(hr_me.get_json()["permissions"]["manage_jobs"])
        self.assertFalse(hr_me.get_json()["permissions"]["manage_users"])

        viewer_jobs = self.client.get("/api/jobs/my-jobs", headers=self._headers(viewer_token))
        self.assertEqual(viewer_jobs.status_code, 200, viewer_jobs.get_json())
        viewer_create = self.client.post("/api/jobs/", headers=self._headers(viewer_token), json={"title": "Blocked", "description": "Blocked"})
        self.assertEqual(viewer_create.status_code, 403, viewer_create.get_json())
        viewer_candidates = self.client.get("/api/applications/company", headers=self._headers(viewer_token))
        self.assertEqual(viewer_candidates.status_code, 403, viewer_candidates.get_json())
        viewer_team = self.client.get("/api/company-team/members", headers=self._headers(viewer_token))
        self.assertEqual(viewer_team.status_code, 403, viewer_team.get_json())

        admin_owner_invite = self.client.post("/api/company-team/invitations", headers=self._headers(admin_token), json={"email": "forbidden-owner@example.com", "name": "Forbidden", "role": "owner"})
        self.assertEqual(admin_owner_invite.status_code, 403, admin_owner_invite.get_json())

        owner_self_demote = self.client.patch(f"/api/company-team/members/{self.owner_id}", headers=self._headers(owner_token), json={"role": "viewer"})
        self.assertEqual(owner_self_demote.status_code, 409, owner_self_demote.get_json())
        owner_self_remove = self.client.delete(f"/api/company-team/members/{self.owner_id}", headers=self._headers(owner_token))
        self.assertEqual(owner_self_remove.status_code, 409, owner_self_remove.get_json())

        members = self.client.get("/api/company-team/members", headers=self._headers(owner_token)).get_json()["members"]
        hr_member = next(item for item in members if item["email"] == "hr-wave8@example.com")
        removed = self.client.delete(f"/api/company-team/members/{hr_member['id']}", headers=self._headers(owner_token))
        self.assertEqual(removed.status_code, 200, removed.get_json())
        blocked_session = self.client.get("/api/auth/me", headers=self._headers(hr_token))
        self.assertEqual(blocked_session.status_code, 401, blocked_session.get_json())

        with app.app_context():
            self.assertGreaterEqual(CompanyAuditEvent.query.filter_by(company_id=self.company_id).count(), 6)
            invited_users = User.query.filter(User.email.in_(["hr-wave8@example.com", "viewer-wave8@example.com", "admin-wave8@example.com"])).all()
            for user in invited_users:
                self.assertEqual(LegalAcceptance.query.filter_by(user_id=user.id, site_id=self.site_id).count(), 2)


if __name__ == "__main__":
    unittest.main()
