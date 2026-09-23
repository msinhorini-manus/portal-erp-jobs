import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta

from flask_jwt_extended import create_access_token


fd, database_path = tempfile.mkstemp(prefix="portal-erp-jobs-wave4-", suffix=".db")
os.close(fd)

os.environ.setdefault("SECRET_KEY", "wave4-test-secret-key-that-is-longer-than-32")
os.environ.setdefault("JWT_SECRET_KEY", "wave4-test-jwt-secret-that-is-longer-than-32")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{database_path}")
os.environ.setdefault("CORS_ORIGINS", "https://jobs.portalerp.com.br")
os.environ.setdefault("ALLOW_ADMIN_SETUP", "false")
os.environ.setdefault("FLASK_ENV", "testing")

from src.config import db  # noqa: E402
from src.main import app  # noqa: E402
from src.models import (  # noqa: E402
    Admin,
    Application,
    ApplicationStatus,
    ApplicationStatusEvent,
    Candidate,
    CandidateSite,
    Company,
    CompanySite,
    CompanyStatus,
    CompanyUser,
    CompanyUserRole,
    Job,
    SessionFamily,
    Site,
    SiteDomain,
    SiteLocale,
    User,
)
from src.models.job import Skill  # noqa: E402


class JobsWave4Tests(unittest.TestCase):
    HOST = {"Host": "jobs.portalerp.com.br"}

    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
        if os.path.exists(database_path):
            os.unlink(database_path)

    def setUp(self):
        with app.app_context():
            db.drop_all()
            db.create_all()

            self.site = Site(
                code="BR",
                name="Brasil",
                country_code="BR",
                default_locale="pt-BR",
                currency_code="BRL",
                timezone="America/Sao_Paulo",
                canonical_origin="https://jobs.portalerp.com.br",
                is_active=True,
            )
            self.site.domains.append(
                SiteDomain(hostname="jobs.portalerp.com.br", is_primary=True, is_active=True)
            )
            self.site.locales.append(SiteLocale(locale="pt-BR", is_default=True, is_active=True))
            db.session.add(self.site)

            self.owner_user = User(email="owner-wave4@example.com", user_type="company")
            self.other_user = User(email="other-wave4@example.com", user_type="company")
            self.candidate_user = User(email="candidate-wave4@example.com", user_type="candidate")
            self.admin_user = User(email="admin-wave4@example.com", user_type="admin")
            self.denied_admin_user = User(email="denied-admin-wave4@example.com", user_type="admin")
            db.session.add_all([
                self.owner_user,
                self.other_user,
                self.candidate_user,
                self.admin_user,
                self.denied_admin_user,
            ])
            db.session.flush()

            self.company = Company(
                user_id=self.owner_user.id,
                company_name="Wave 4 Company",
                cnpj="WAVE4-OWNER-TAX",
            )
            self.other_company = Company(
                user_id=self.other_user.id,
                company_name="Other Company",
                cnpj="WAVE4-OTHER-TAX",
            )
            self.candidate = Candidate(
                user_id=self.candidate_user.id,
                first_name="Ana",
                last_name="Candidate",
            )
            self.admin = Admin(
                user_id=self.admin_user.id,
                name="Jobs Admin",
                role="admin",
                permissions={"manage_jobs": True, "approve_companies": True},
            )
            self.denied_admin = Admin(
                user_id=self.denied_admin_user.id,
                name="Denied Admin",
                role="moderator",
                permissions={"manage_jobs": False, "approve_companies": False},
            )
            db.session.add_all([
                self.company,
                self.other_company,
                self.candidate,
                self.admin,
                self.denied_admin,
            ])
            db.session.flush()

            self.membership = CompanySite(
                company_id=self.company.id,
                site_id=self.site.id,
                status=CompanyStatus.APPROVED,
                display_name="Wave 4 Company BR",
                max_active_jobs=5,
            )
            self.other_membership = CompanySite(
                company_id=self.other_company.id,
                site_id=self.site.id,
                status=CompanyStatus.APPROVED,
                display_name="Other Company BR",
                max_active_jobs=5,
            )
            db.session.add_all([
                self.membership,
                self.other_membership,
                CandidateSite(
                    candidate_id=self.candidate.id,
                    site_id=self.site.id,
                    is_active=True,
                    is_discoverable=False,
                    salary_currency="BRL",
                ),
                CompanyUser(
                    company_id=self.company.id,
                    user_id=self.owner_user.id,
                    role=CompanyUserRole.OWNER,
                    name="Owner One",
                    is_active=True,
                    invitation_accepted=True,
                ),
                CompanyUser(
                    company_id=self.other_company.id,
                    user_id=self.other_user.id,
                    role=CompanyUserRole.OWNER,
                    name="Owner Two",
                    is_active=True,
                    invitation_accepted=True,
                ),
            ])
            self.python = Skill(name="Python", category="language")
            self.flask = Skill(name="Flask", category="framework")
            self.sql = Skill(name="SQL", category="database")
            db.session.add_all([self.python, self.flask, self.sql])
            db.session.commit()

            self.site_id = self.site.id
            self.company_id = self.company.id
            self.other_company_id = self.other_company.id
            self.candidate_id = self.candidate.id
            self.candidate_user_id = self.candidate_user.id
            self.python_id = self.python.id
            self.flask_id = self.flask.id
            self.sql_id = self.sql.id
            self.owner_token = self._token(self.owner_user, "company", company_id=self.company.id)
            self.other_token = self._token(
                self.other_user, "company", company_id=self.other_company.id
            )
            self.candidate_token = self._token(
                self.candidate_user, "candidate", candidate_id=self.candidate.id
            )
            self.admin_token = self._token(self.admin_user, "admin", admin_id=self.admin.id)
            self.denied_admin_token = self._token(
                self.denied_admin_user, "admin", admin_id=self.denied_admin.id
            )

    def _token(self, user, user_type, **claims):
        family_id = str(uuid.uuid4())
        token_claims = {
            "user_type": user_type,
            "site_id": self.site.id,
            "site_code": self.site.code,
            "family_id": family_id,
            **claims,
        }
        db.session.add(
            SessionFamily(
                user_id=user.id,
                site_id=self.site.id,
                family_id=family_id,
                current_refresh_jti=str(uuid.uuid4()),
                expires_at=datetime.utcnow() + timedelta(days=1),
            )
        )
        token = create_access_token(identity=str(user.id), additional_claims=token_claims)
        db.session.commit()
        return token

    def _headers(self, token=None):
        headers = dict(self.HOST)
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _job(self, *, company_id=None, active=True, title=None):
        with app.app_context():
            job = Job(
                company_id=company_id or self.company_id,
                site_id=self.site_id,
                title=title or f"Job {uuid.uuid4()}",
                description="Descrição válida",
                is_active=active,
                status="active" if active else "inactive",
            )
            db.session.add(job)
            db.session.commit()
            return job.id

    def _application_with_event(self, job_id):
        with app.app_context():
            application = Application(
                job_id=job_id,
                candidate_id=self.candidate_id,
                site_id=self.site_id,
                status=ApplicationStatus.APPLIED,
            )
            db.session.add(application)
            db.session.flush()
            application.add_created_event(self.candidate_user_id, "candidate")
            db.session.commit()
            return application.id

    def test_company_crud_persists_fields_replaces_skills_and_hides_archive(self):
        created = self.client.post(
            "/api/jobs/",
            json={
                "title": "Consultor ERP",
                "description": "Implantação regional",
                "responsibilities": "Conduzir discovery",
                "benefits": "Plano de saúde",
                "work_mode": "hybrid",
                "contract_type": "clt",
                "skills": [
                    self.python_id,
                    {"skill_id": self.flask_id, "is_required": True, "proficiency_level": 4},
                ],
            },
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(created.status_code, 201, created.get_json())
        job_id = created.get_json()["job"]["id"]

        public = self.client.get(f"/api/jobs/{job_id}", headers=self.HOST)
        self.assertEqual(public.status_code, 200, public.get_json())
        self.assertEqual(public.get_json()["benefits"], "Plano de saúde")
        self.assertEqual(public.get_json()["responsibilities"], "Conduzir discovery")
        self.assertEqual(set(public.get_json()["skill_ids"]), {self.python_id, self.flask_id})

        updated = self.client.put(
            f"/api/jobs/{job_id}",
            json={
                "title": "Consultor ERP Sênior",
                "benefits": "Plano de saúde e bônus",
                "responsibilities": "Liderar implantação",
                "skills": [{"id": self.sql_id, "is_required": True}],
            },
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(updated.status_code, 200, updated.get_json())
        self.assertEqual(updated.get_json()["job"]["skill_ids"], [self.sql_id])

        deleted = self.client.delete(
            f"/api/jobs/{job_id}", headers=self._headers(self.owner_token)
        )
        self.assertEqual(deleted.status_code, 200, deleted.get_json())
        self.assertEqual(deleted.get_json()["job"]["status"], "archived")
        self.assertEqual(self.client.get(f"/api/jobs/{job_id}", headers=self.HOST).status_code, 404)
        private = self.client.get(
            f"/api/jobs/my-jobs/{job_id}", headers=self._headers(self.owner_token)
        )
        self.assertEqual(private.status_code, 200, private.get_json())
        self.assertEqual(private.get_json()["benefits"], "Plano de saúde e bônus")
        self.assertEqual(private.get_json()["skill_ids"], [self.sql_id])
        other_private = self.client.get(
            f"/api/jobs/my-jobs/{job_id}", headers=self._headers(self.other_token)
        )
        self.assertEqual(other_private.status_code, 404, other_private.get_json())
        with app.app_context():
            persisted = db.session.get(Job, job_id)
            self.assertIsNotNone(persisted)
            self.assertFalse(persisted.is_active)
            self.assertEqual(persisted.status, "archived")
            self.assertEqual(persisted.benefits, "Plano de saúde e bônus")
            self.assertEqual(persisted.responsibilities, "Liderar implantação")
            self.assertEqual([item.skill_id for item in persisted.skills], [self.sql_id])

    def test_public_detail_hides_inactive_and_non_public_lifecycle(self):
        inactive_id = self._job(active=False, title="Paused")
        pending_id = self._job(active=True, title="Pending inconsistent")
        with app.app_context():
            pending = db.session.get(Job, pending_id)
            pending.status = "pending"
            db.session.commit()

        self.assertEqual(self.client.get(f"/api/jobs/{inactive_id}", headers=self.HOST).status_code, 404)
        self.assertEqual(self.client.get(f"/api/jobs/{pending_id}", headers=self.HOST).status_code, 404)
        listed = self.client.get("/api/jobs/", headers=self.HOST)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.get_json()["jobs"], [])

    def test_company_mutations_reject_idor(self):
        job_id = self._job(company_id=self.company_id, active=False)
        endpoints = (
            ("put", f"/api/jobs/{job_id}", {"title": "Stolen"}),
            ("patch", f"/api/jobs/{job_id}/toggle-status", None),
            ("delete", f"/api/jobs/{job_id}", None),
            ("get", f"/api/jobs/{job_id}/applications", None),
        )
        for method, path, payload in endpoints:
            with self.subTest(method=method):
                response = getattr(self.client, method)(
                    path, json=payload, headers=self._headers(self.other_token)
                )
                self.assertEqual(response.status_code, 403, response.get_json())
        with app.app_context():
            job = db.session.get(Job, job_id)
            self.assertEqual(job.title[:3], "Job")
            self.assertFalse(job.is_active)
            self.assertNotEqual(job.status, "archived")

    def test_quota_blocks_company_put_toggle_and_all_admin_activation_paths(self):
        active_id = self._job(active=True, title="Only active")
        paused_id = self._job(active=False, title="Paused for quota")
        with app.app_context():
            membership = CompanySite.query.filter_by(
                company_id=self.company_id, site_id=self.site_id
            ).one()
            membership.max_active_jobs = 1
            db.session.commit()

        attempts = (
            ("put", f"/api/jobs/{paused_id}", {"is_active": True}, self.owner_token),
            ("patch", f"/api/jobs/{paused_id}/toggle-status", None, self.owner_token),
            ("put", f"/api/admin/jobs/{paused_id}", {"is_active": True}, self.admin_token),
            ("put", f"/api/admin/jobs/{paused_id}/toggle-status", {"is_active": True}, self.admin_token),
            ("put", f"/api/admin/jobs/{paused_id}/status", {"status": "approved"}, self.admin_token),
        )
        for method, path, payload, token in attempts:
            with self.subTest(path=path):
                response = getattr(self.client, method)(
                    path, json=payload, headers=self._headers(token)
                )
                self.assertEqual(response.status_code, 409, response.get_json())
        with app.app_context():
            self.assertTrue(db.session.get(Job, active_id).is_active)
            self.assertFalse(db.session.get(Job, paused_id).is_active)

    def test_company_and_admin_delete_are_soft_and_preserve_audit_history(self):
        company_job_id = self._job(active=True, title="Company archive")
        admin_job_id = self._job(active=True, title="Admin archive")
        company_application_id = self._application_with_event(company_job_id)
        admin_application_id = self._application_with_event(admin_job_id)

        company_deleted = self.client.delete(
            f"/api/jobs/{company_job_id}", headers=self._headers(self.owner_token)
        )
        admin_deleted = self.client.delete(
            f"/api/admin/jobs/{admin_job_id}", headers=self._headers(self.admin_token)
        )
        self.assertEqual(company_deleted.status_code, 200, company_deleted.get_json())
        self.assertEqual(admin_deleted.status_code, 200, admin_deleted.get_json())

        with app.app_context():
            for job_id, application_id in (
                (company_job_id, company_application_id),
                (admin_job_id, admin_application_id),
            ):
                self.assertEqual(db.session.get(Job, job_id).status, "archived")
                self.assertIsNotNone(db.session.get(Application, application_id))
                self.assertEqual(
                    ApplicationStatusEvent.query.filter_by(application_id=application_id).count(), 1
                )

    def test_admin_detail_uses_candidate_user_email_and_persisted_moderation(self):
        job_id = self._job(active=True)
        self._application_with_event(job_id)

        detail = self.client.get(
            f"/api/admin/jobs/{job_id}", headers=self._headers(self.admin_token)
        )
        self.assertEqual(detail.status_code, 200, detail.get_json())
        self.assertEqual(
            detail.get_json()["applications"][0]["candidate_email"],
            "candidate-wave4@example.com",
        )

        featured = self.client.put(
            f"/api/admin/jobs/{job_id}/featured",
            json={"is_featured": True},
            headers=self._headers(self.admin_token),
        )
        closed = self.client.put(
            f"/api/admin/jobs/{job_id}/status",
            json={"status": "closed"},
            headers=self._headers(self.admin_token),
        )
        self.assertEqual(featured.status_code, 200, featured.get_json())
        self.assertEqual(closed.status_code, 200, closed.get_json())
        with app.app_context():
            db.session.expire_all()
            job = db.session.get(Job, job_id)
            self.assertTrue(job.is_featured)
            self.assertEqual(job.status, "closed")
            self.assertFalse(job.is_active)

    def test_admin_permissions_manage_jobs_and_approve_companies(self):
        job_id = self._job(active=True)
        with app.app_context():
            membership = CompanySite.query.filter_by(
                company_id=self.other_company_id, site_id=self.site_id
            ).one()
            membership.status = CompanyStatus.PENDING
            db.session.commit()

        blocked_job = self.client.put(
            f"/api/admin/jobs/{job_id}",
            json={"title": "Blocked"},
            headers=self._headers(self.denied_admin_token),
        )
        blocked_approval = self.client.post(
            f"/api/admin/companies/{self.other_company_id}/approve",
            headers=self._headers(self.denied_admin_token),
        )
        self.assertEqual(blocked_job.status_code, 403, blocked_job.get_json())
        self.assertEqual(blocked_approval.status_code, 403, blocked_approval.get_json())

        approved = self.client.post(
            f"/api/admin/companies/{self.other_company_id}/approve",
            headers=self._headers(self.admin_token),
        )
        self.assertEqual(approved.status_code, 200, approved.get_json())
        with app.app_context():
            self.assertNotEqual(db.session.get(Job, job_id).title, "Blocked")
            self.assertEqual(
                CompanySite.query.filter_by(
                    company_id=self.other_company_id, site_id=self.site_id
                ).one().status,
                CompanyStatus.APPROVED,
            )

    def test_payload_validation_and_pagination_cap(self):
        skills_catalog = self.client.get("/api/config/skills", headers=self.HOST)
        self.assertEqual(skills_catalog.status_code, 200, skills_catalog.get_json())
        self.assertEqual(
            {item["id"] for item in skills_catalog.get_json()},
            {self.python_id, self.flask_id, self.sql_id},
        )

        duplicate_tax_id = self.client.post(
            "/api/auth/register/company",
            headers=self.HOST,
            json={
                "email": "new-company-wave4@example.com",
                "password": "Wave4!Valid2026",
                "trade_name": "Duplicate Tax ID",
                "tax_id": "WAVE4-OWNER-TAX",
            },
        )
        self.assertEqual(duplicate_tax_id.status_code, 409, duplicate_tax_id.get_json())
        self.assertNotIn("SQL", str(duplicate_tax_id.get_json()))

        malformed = self.client.post(
            "/api/jobs/",
            data="null",
            content_type="application/json",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(malformed.status_code, 400, malformed.get_json())

        invalid_cases = (
            {"title": "", "description": "ok"},
            {"title": "Valid", "description": "ok", "is_active": "true"},
            {"title": "Valid", "description": "ok", "work_mode": "teleport"},
            {"title": "Valid", "description": "ok", "salary_min": -1},
            {"title": "Valid", "description": "ok", "salary_min": 20, "salary_max": 10},
            {"title": "Valid", "description": "ok", "skills": [999999]},
        )
        for payload in invalid_cases:
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/jobs/", json=payload, headers=self._headers(self.owner_token)
                )
                self.assertEqual(response.status_code, 400, response.get_json())

        self._job(active=True)
        bounded = self.client.get("/api/jobs/?page=1&per_page=10000", headers=self.HOST)
        invalid_page = self.client.get("/api/jobs/?page=0", headers=self.HOST)
        self.assertEqual(bounded.status_code, 200, bounded.get_json())
        self.assertEqual(bounded.get_json()["per_page"], 100)
        self.assertEqual(invalid_page.status_code, 400, invalid_page.get_json())


if __name__ == "__main__":
    unittest.main()
