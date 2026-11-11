"""Regional public company URL identity. Run alone (global Flask fixtures)."""
import unittest

import test_jobs_wave4 as fixtures
from src.config import db
from src.main import app
from src.job_slugs import public_company_slug
from src.models import Admin, Application, Company, CompanySite, CompanyStatus, Job, Site, SiteDomain, SiteLocale, User


class CompanyUrlTests(unittest.TestCase):
    HOST = fixtures.JobsWave4Tests.HOST
    setUpClass = classmethod(fixtures.JobsWave4Tests.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.JobsWave4Tests.tearDownClass.__func__)
    setUp = fixtures.JobsWave4Tests.setUp
    _token = fixtures.JobsWave4Tests._token
    _headers = fixtures.JobsWave4Tests._headers
    _job = fixtures.JobsWave4Tests._job
    _application_with_event = fixtures.JobsWave4Tests._application_with_event

    def _membership(self):
        return CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one()

    def public_company(self):
        response = self.client.get(f"/api/companies/{self.company_id}", headers=self.HOST)
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertNotIn("Location", response.headers)
        return response.get_json()

    def test_normalization_regional_precedence_accents_blank_unicode_and_length(self):
        for regional, global_name, expected in (
            ("Mega_Sóft SÃO Paulo", "Legal Name", "mega-soft-sao-paulo"),
            ("  ", "Global_Áção", "global-acao"),
            (None, "Global_Áção", "global-acao"),
            ("Ｄｅｖ ERP", "Legal", "dev-erp"),
            ("東京 数据 🚀", "Legal", "empresa"),
            ("___---!!!", "Legal", "empresa"),
            (None, None, "empresa"), ("", "", "empresa"),
        ):
            with self.subTest(regional=regional, global_name=global_name):
                self.assertEqual(public_company_slug(regional, global_name), expected)
        for name in ("Á" * 300, "a-" * 200, "a" * 139 + "_suffix"):
            slug = public_company_slug(name, "Legal")
            self.assertLessEqual(len(slug), 140)
            self.assertRegex(slug, r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

    def test_new_orm_company_membership_job_graph_snapshots_in_same_flush(self):
        with app.app_context():
            for regional, global_name, expected in (
                ("Marca_Regional São Paulo", "Identidade Global", "marca-regional-sao-paulo"),
                ("  ", "Global_Áção", "global-acao"),
                (None, "東京", "empresa"),
            ):
                owner = User(email=f"graph-{expected}@example.invalid", user_type="company")
                company = Company(company_name=global_name, user=owner)
                membership = CompanySite(company=company, site=db.session.get(Site, self.site_id),
                                         display_name=regional, status=CompanyStatus.APPROVED)
                job = Job(company=company, site_id=self.site_id, title="Vaga_Áção", description="Fixture")
                db.session.add_all([membership, job])
                db.session.flush()
                self.assertEqual(membership.public_profile_slug, expected)
                self.assertEqual(job.public_identity_dict()["company_profile_slug"], expected)
                self.assertEqual(company.to_public_dict(membership)["site_id"], self.site_id)
            db.session.commit()

    def test_snapshot_rename_does_not_change_company_identity_or_existing_job_urls(self):
        old_job_id = self._job(title="Consultor ERP Sênior")
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            membership = self._membership()
            original = membership.public_profile_slug
            company.company_name = "Global Renamed"
            membership.display_name = "Nova_Marca Áção"
            db.session.commit()
        new_job_id = self._job(title="Vaga nova")
        with app.app_context():
            membership = self._membership()
            self.assertEqual(membership.public_profile_slug, original)
            old_job = db.session.get(Job, old_job_id)
            new_job = db.session.get(Job, new_job_id)
            self.assertEqual(old_job.public_company_slug, "wave-4-company-br")
            self.assertEqual(old_job.public_title_slug, "consultor-erp-senior")
            self.assertEqual(new_job.public_company_slug, "nova-marca-acao")
            self.assertEqual(new_job.public_identity_dict()["company_profile_slug"], original)
            old_job.title = "Another title"
            db.session.commit()
            self.assertEqual(old_job.public_title_slug, "consultor-erp-senior")
        payload = self.public_company()
        self.assertEqual(payload["company_name"], "Nova_Marca Áção")
        self.assertEqual(payload["public_profile_slug"], original)
        self.assertEqual(payload["site_id"], self.site_id)
        self.assertEqual(payload["site_code"], "BR")

    def test_duplicate_profile_slugs_need_no_uniqueness_because_company_id_is_identity(self):
        with app.app_context():
            other = CompanySite.query.filter_by(company_id=self.other_company_id, site_id=self.site_id).one()
            # Simulate an independently created identically named public profile.
            db.session.delete(other)
            db.session.flush()
            other = CompanySite(company_id=self.other_company_id, site_id=self.site_id,
                                display_name="Wave 4 Company BR", status=CompanyStatus.APPROVED)
            db.session.add(other)
            db.session.commit()
            self.assertEqual(other.public_profile_slug, self._membership().public_profile_slug)
        for company_id in (self.company_id, self.other_company_id):
            response = self.client.get(f"/api/companies/{company_id}", headers=self.HOST)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()["id"], company_id)
            self.assertEqual(response.get_json()["public_profile_slug"], "wave-4-company-br")

    def test_owner_and_admin_name_edits_cannot_set_or_clear_snapshot(self):
        with app.app_context():
            admin = Admin.query.first()
            admin.permissions = {**admin.permissions, "manage_companies": True}
            db.session.commit()
        for path, token in (("/api/companies/", self.owner_token),
                            (f"/api/admin/companies/{self.company_id}", self.admin_token)):
            for value in ("injected-profile", None):
                with self.subTest(path=path, value=value):
                    response = self.client.put(path, headers=self._headers(token), json={
                        "name": "Empresa Renomeada", "public_profile_slug": value,
                        "company_profile_slug": value,
                    })
                    self.assertEqual(response.status_code, 200, response.get_json())
                    self.assertEqual(self.public_company()["public_profile_slug"], "wave-4-company-br")
        with app.app_context():
            membership = self._membership()
            self.assertEqual(membership.public_profile_slug, "wave-4-company-br")
            db.session.execute(db.text("UPDATE company_sites SET public_profile_slug=NULL WHERE id=:id"), {"id": membership.id})
            db.session.commit()
        self.client.put("/api/companies/", headers=self._headers(self.owner_token), json={"name": "Legacy name edit"})
        self.assertEqual(self.public_company()["public_profile_slug"], "legacy-name-edit")
        with app.app_context():
            self.assertIsNone(self._membership().public_profile_slug)

    def test_registration_ignores_forged_snapshot_and_preserves_pending_access_guards(self):
        response = self.client.post("/api/auth/register/company", headers=self.HOST, json={
            "email": "company-snapshot@example.invalid", "password": "ValidPassword123",
            "trade_name": "MegaSóft_Áção", "tax_id": "SNAPSHOT-FIXTURE",
            "accept_terms": True, "accept_privacy": True,
            "public_profile_slug": "injected", "status": "approved",
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        payload = response.get_json()
        company_id = payload["user"]["company_id"]
        with app.app_context():
            membership = CompanySite.query.filter_by(company_id=company_id, site_id=self.site_id).one()
            self.assertEqual(membership.public_profile_slug, "megasoft-acao")
            self.assertEqual(membership.status, CompanyStatus.PENDING)
            self.assertIsNone(membership.approved_by)
            self.assertIsNone(membership.approved_at)
        self.assertEqual(self.client.get(f"/api/companies/{company_id}", headers=self.HOST).status_code, 404)
        token_headers = self._headers(payload["access_token"])
        # Existing private profile reads are allowed before approval.
        private = self.client.get("/api/companies/", headers=token_headers)
        self.assertEqual(private.status_code, 200)
        self.assertNotIn("public_profile_slug", private.get_json())
        self.assertEqual(self.client.post("/api/jobs/", headers=token_headers,
                                        json={"title": "Blocked", "description": "Blocked"}).status_code, 403)

    def test_null_legacy_fallback_is_readonly_across_company_job_application_dtos(self):
        job_id = self._job(title="Consultor ERP Sênior")
        application_id = self._application_with_event(job_id)
        with app.app_context():
            membership = self._membership()
            membership.display_name = "  "
            company = db.session.get(Company, self.company_id)
            company.company_name = "Global_Áção"
            db.session.commit()
            db.session.execute(db.text("UPDATE company_sites SET public_profile_slug=NULL WHERE id=:id"), {"id": membership.id})
            db.session.commit()
            before = (membership.updated_at, company.updated_at, db.session.get(Job, job_id).updated_at)
            self.assertEqual(company.to_public_dict(membership)["public_profile_slug"], "global-acao")
            self.assertFalse(db.session.is_modified(membership))
            self.assertEqual(db.session.get(Application, application_id).to_dict()["company_profile_slug"], "global-acao")
        self.assertEqual(self.public_company()["public_profile_slug"], "global-acao")
        search = self.client.get("/api/companies/search", headers=self.HOST)
        self.assertEqual(search.status_code, 200)
        self.assertEqual(next(c for c in search.get_json()["companies"] if c["id"] == self.company_id)["public_profile_slug"], "global-acao")
        detail = self.client.get(f"/api/jobs/{job_id}", headers=self.HOST).get_json()
        self.assertEqual(detail["company_profile_slug"], "global-acao")
        self.assertEqual(detail["public_company_slug"], "wave-4-company-br")
        self.assertEqual(detail["company"]["public_profile_slug"], "global-acao")
        application = self.client.get(f"/api/applications/{application_id}", headers=self._headers(self.candidate_token))
        self.assertEqual(application.status_code, 200)
        self.assertEqual(application.get_json()["job"]["company_profile_slug"], "global-acao")
        with app.app_context():
            membership = self._membership()
            self.assertIsNone(membership.public_profile_slug)
            self.assertEqual((membership.updated_at, db.session.get(Company, self.company_id).updated_at,
                              db.session.get(Job, job_id).updated_at), before)

    def test_same_host_regions_have_independent_profiles_and_foreign_ids_fail_closed(self):
        with app.app_context():
            br = db.session.get(Site, self.site_id)
            br.domains.append(SiteDomain(hostname="jobs.portalerp.com", url_prefix="/br", is_primary=False))
            mx = Site(code="MX", name="Mexico", country_code="MX", default_locale="es-MX",
                      currency_code="MXN", timezone="UTC", canonical_origin="https://jobs.portalerp.com", is_active=True)
            mx.domains.append(SiteDomain(hostname="jobs.portalerp.com", url_prefix="/mx", is_primary=True))
            mx.locales.append(SiteLocale(locale="es-MX", is_default=True))
            db.session.add(mx)
            db.session.flush()
            mx_id = mx.id
            db.session.add(CompanySite(company_id=self.company_id, site=mx, display_name="Marca_México",
                                       status=CompanyStatus.APPROVED))
            foreign_company = Company(company_name="Only Mexico", user=User(email="only-mx@example.invalid", user_type="company"))
            db.session.add(CompanySite(company=foreign_company, site=mx, status=CompanyStatus.APPROVED))
            db.session.flush()
            foreign_id = foreign_company.id
            mx_job = Job(company_id=self.company_id, site_id=mx.id, title="Mexico job", description="Fixture", is_active=True)
            db.session.add(mx_job)
            db.session.commit()
            mx_job_id = mx_job.id
        br_job_id = self._job(title="Brasil job")
        for prefix, site_id, slug, own_job_id, foreign_job_id in (
            ("/br", self.site_id, "wave-4-company-br", br_job_id, mx_job_id),
            ("/mx", mx_id, "marca-mexico", mx_job_id, br_job_id),
        ):
            headers = {"Host": "127.0.0.1:5000", "X-Regional-Host": "jobs.portalerp.com", "X-Regional-Prefix": prefix}
            response = self.client.get(f"/api/companies/{self.company_id}", headers=headers)
            self.assertEqual(response.status_code, 200, response.get_json())
            payload = response.get_json()
            self.assertEqual(payload["site_id"], site_id)
            self.assertEqual(payload["public_profile_slug"], slug)
            self.assertEqual([j["id"] for j in payload["jobs"]], [own_job_id])
            self.assertEqual(payload["jobs"][0]["company_profile_slug"], slug)
            jobs = self.client.get("/api/jobs/", headers=headers).get_json()["jobs"]
            self.assertEqual([j["id"] for j in jobs], [own_job_id])
            self.assertEqual(jobs[0]["company_profile_slug"], slug)
            self.assertEqual(self.client.get(f"/api/jobs/{foreign_job_id}", headers=headers).status_code, 404)
            search = self.client.get("/api/companies/search", headers=headers).get_json()["companies"]
            self.assertTrue(all(c["site_id"] == site_id for c in search))
            status = self.client.get(f"/api/companies/{foreign_id}", headers=headers).status_code
            self.assertEqual(status, 404 if prefix == "/br" else 200)
        self.assertEqual(self.client.get("/api/companies/", headers={"Host": "127.0.0.1:5000",
                         "X-Regional-Host": "jobs.portalerp.com", "X-Regional-Prefix": "/mx",
                         "Authorization": f"Bearer {self.owner_token}"}).status_code, 403)
        with app.app_context():
            membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=mx_id).one()
            membership.status = CompanyStatus.SUSPENDED
            db.session.commit()
            self.assertEqual(membership.public_profile_slug, "marca-mexico")
        for prefix, expected in (("/br", 200), ("/mx", 404)):
            headers = {"Host": "127.0.0.1:5000", "X-Regional-Host": "jobs.portalerp.com", "X-Regional-Prefix": prefix}
            self.assertEqual(self.client.get(f"/api/companies/{self.company_id}", headers=headers).status_code, expected)
            own_job = br_job_id if prefix == "/br" else mx_job_id
            self.assertEqual(self.client.get(f"/api/jobs/{own_job}", headers=headers).status_code, expected)

    def test_pending_rejected_suspended_profiles_and_jobs_remain_inaccessible(self):
        job_id = self._job(title="Public only when approved")
        for status in (CompanyStatus.PENDING, CompanyStatus.REJECTED, CompanyStatus.SUSPENDED):
            with self.subTest(status=status):
                with app.app_context():
                    self._membership().status = status
                    db.session.commit()
                detail = self.client.get(f"/api/companies/{self.company_id}", headers=self.HOST)
                self.assertEqual(detail.status_code, 404)
                self.assertNotIn("public_profile_slug", detail.get_json())
                search = self.client.get("/api/companies/search", headers=self.HOST).get_json()["companies"]
                self.assertNotIn(self.company_id, [c["id"] for c in search])
                self.assertEqual(self.client.get(f"/api/jobs/{job_id}", headers=self.HOST).status_code, 404)
                self.assertEqual(self.client.get("/api/jobs/", headers=self.HOST).get_json()["jobs"], [])
                self.assertEqual(self.client.put("/api/companies/", headers=self._headers(self.owner_token),
                                                json={"name": "Allowed private profile edit"}).status_code, 200)
                self.assertEqual(self.client.post("/api/admin/jobs", headers=self._headers(self.admin_token),
                                                 json={"company_id": self.company_id, "title": "Blocked", "description": "Blocked"}).status_code, 403)
                with app.app_context():
                    self.assertEqual(self._membership().public_profile_slug, "wave-4-company-br")

    def test_hidden_jobs_do_not_expose_profile_snapshot_in_any_shared_dto(self):
        job_id = self._job(title="Confidential job")
        application_id = self._application_with_event(job_id)
        with app.app_context():
            job = db.session.get(Job, job_id)
            job.is_company_hidden = True
            membership = self._membership()
            membership.public_profile_slug = "sensitive-profile-snapshot"
            admin = Admin.query.first()
            admin.permissions = {**admin.permissions, "manage_companies": True, "manage_candidates": True}
            db.session.commit()
            self.assertEqual(job.public_company_slug, "wave-4-company-br")
            for payload in (job.public_identity_dict(), job.to_dict(), job.to_dict(include_details=True),
                            db.session.get(Application, application_id).to_dict()):
                self.assertIsNone(payload["company_profile_slug"])
                self.assertNotIn("sensitive-profile-snapshot", str(payload))
                self.assertEqual(payload["public_company_slug"], "empresa-confidencial")
        endpoints = [
            (f"/api/jobs/{job_id}", None, lambda d: d),
            ("/api/jobs/", None, lambda d: d["jobs"][0]),
            (f"/api/jobs/my-jobs/{job_id}", self.owner_token, lambda d: d),
            (f"/api/admin/jobs/{job_id}", self.admin_token, lambda d: d),
            (f"/api/admin/companies/{self.company_id}", self.admin_token, lambda d: d["jobs"][0]),
            (f"/api/admin/companies/{self.company_id}/jobs", self.admin_token, lambda d: d["jobs"][0]),
            (f"/api/admin/candidates/{self.candidate_id}", self.admin_token, lambda d: d["applications"][0]),
            (f"/api/applications/{application_id}", self.candidate_token, lambda d: d["job"]),
            ("/api/applications/", self.candidate_token, lambda d: d["applications"][0]["job"]),
            ("/api/applications/company", self.owner_token, lambda d: d["applications"][0]["job"]),
        ]
        for path, token, extract in endpoints:
            with self.subTest(path=path):
                response = self.client.get(path, headers=self._headers(token))
                self.assertEqual(response.status_code, 200, response.get_json())
                payload = extract(response.get_json())
                self.assertIsNone(payload["company_profile_slug"])
                self.assertIsNone(payload["company_name"])
                self.assertNotIn("sensitive-profile-snapshot", str(payload))
                self.assertEqual(payload["public_company_slug"], "empresa-confidencial")
        self.assertEqual(self.public_company()["jobs"], [])
        # Null fallback is masked too; returning to visible restores only the
        # profile identity, never regenerating the existing job URL snapshot.
        with app.app_context():
            membership = self._membership()
            membership.public_profile_slug = None
            db.session.commit()
            job = db.session.get(Job, job_id)
            self.assertIsNone(job.public_identity_dict()["company_profile_slug"])
            job.is_company_hidden = False
            db.session.commit()
            self.assertEqual(job.public_identity_dict()["company_profile_slug"], "wave-4-company-br")
            self.assertEqual(job.public_company_slug, "wave-4-company-br")
            self.assertIsNone(membership.public_profile_slug)
        for path, token in (("/api/jobs/", self.owner_token), ("/api/admin/jobs", self.admin_token)):
            response = self.client.post(path, headers=self._headers(token), json={
                "company_id": self.company_id, "title": "Hidden on insert", "description": "Fixture",
                "is_company_hidden": True,
            })
            self.assertEqual(response.status_code, 201, response.get_json())
            payload = response.get_json()["job"]
            self.assertIsNone(payload["company_profile_slug"])
            self.assertEqual(payload["public_company_slug"], "empresa-confidencial")
            with app.app_context():
                hidden = db.session.get(Job, payload["id"])
                self.assertEqual(hidden.public_company_slug, "empresa-confidencial")
                self.assertIsNone(hidden.public_identity_dict()["company_profile_slug"])


if __name__ == "__main__":
    unittest.main()
