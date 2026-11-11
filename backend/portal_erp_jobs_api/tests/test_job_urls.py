"""Job URL snapshot contract. Run in its own process (global Flask fixtures)."""
import unittest
from datetime import datetime, timedelta

import test_jobs_wave4 as fixtures
from src.config import db
from src.main import app
from src.models import Admin, Application, Company, CompanySite, CompanyStatus, Job, Site, User
from src.job_slugs import public_slug


class JobUrlTests(unittest.TestCase):
    HOST = fixtures.JobsWave4Tests.HOST
    setUpClass = classmethod(fixtures.JobsWave4Tests.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.JobsWave4Tests.tearDownClass.__func__)
    setUp = fixtures.JobsWave4Tests.setUp
    _token = fixtures.JobsWave4Tests._token
    _headers = fixtures.JobsWave4Tests._headers
    _job = fixtures.JobsWave4Tests._job
    _application_with_event = fixtures.JobsWave4Tests._application_with_event

    def assert_identity(self, payload, company="wave-4-company-br", title="consultor-erp-senior"):
        self.assertEqual(payload["public_company_slug"], company)
        self.assertEqual(payload["public_title_slug"], title)
        self.assertEqual(payload["site_code"], "BR")

    def test_expired_job_has_no_public_card_or_detail_but_private_record_is_preserved(self):
        live_id = self._job(title="Vaga vigente")
        expired_id = self._job(title="Vaga vencida")
        with app.app_context():
            expired = db.session.get(Job, expired_id)
            expired.expires_at = datetime.utcnow() - timedelta(days=1)
            db.session.commit()
            self.assertIsNotNone(expired.to_dict()["expires_at"])
        response = self.client.get("/api/jobs/", headers=self._headers())
        self.assertEqual(response.status_code, 200)
        ids = {job["id"] for job in response.get_json()["jobs"]}
        self.assertIn(live_id, ids)
        self.assertNotIn(expired_id, ids)
        self.assertEqual(self.client.get(f"/api/jobs/{expired_id}", headers=self._headers()).status_code, 404)
        with app.app_context():
            self.assertTrue(db.session.get(Job, expired_id).is_active)
            self.assertEqual(Job.query.count(), 2)

    def test_normalization_unicode_underscores_empty_and_length(self):
        cases = [
            ("  São_Paulo / AÇÃO++ Sênior  ", "sao-paulo-acao-senior"),
            ("Ｄｅｖ ERP", "dev-erp"), ("東京 数据 🚀", "vaga"),
            ("___---!!!", "vaga"), ("", "vaga"), (None, "vaga"),
        ]
        for value, expected in cases:
            with self.subTest(value=value):
                self.assertEqual(public_slug(value, "vaga"), expected)
        self.assertEqual(public_slug(None, "empresa"), "empresa")
        for value in ("Á" * 300, "a-" * 200, "a" * 139 + "_suffix"):
            slug = public_slug(value, "vaga")
            self.assertLessEqual(len(slug), 140)
            self.assertRegex(slug, r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            self.assertEqual(slug, public_slug(value, "vaga"))

    def test_orm_fixture_snapshots_and_id_resolves_collisions(self):
        first = self._job(title="Consultor ERP Sênior")
        second = self._job(title="Consultor ERP Sênior")
        self.assertNotEqual(first, second)
        with app.app_context():
            for job_id in (first, second):
                job = db.session.get(Job, job_id)
                self.assert_identity(job.to_dict())
                self.assertEqual(job.public_company_slug, "wave-4-company-br")
                self.assertEqual(job.public_title_slug, "consultor-erp-senior")
        urls = [f"/br/vagas/wave-4-company-br/consultor-erp-senior/{job_id}" for job_id in (first, second)]
        self.assertEqual(len(set(urls)), 2)

    def test_new_company_membership_and_job_graph_snapshots_in_same_flush(self):
        with app.app_context():
            owner = User(email="graph@example.invalid", user_type="company")
            company = Company(company_name="Identidade Global", user=owner)
            membership = CompanySite(
                company=company, site=db.session.get(Site, self.site_id),
                display_name="Marca_Regional São Paulo", status=CompanyStatus.APPROVED,
            )
            job = Job(company=company, site_id=self.site_id, title="", description="Fixture")
            db.session.add_all([membership, job])
            db.session.commit()
            self.assertEqual(job.public_company_slug, "marca-regional-sao-paulo")
            self.assertEqual(job.public_title_slug, "vaga")
            self.assertEqual(job.to_dict()["public_company_slug"], job.public_company_slug)

    def test_company_and_admin_crud_freezes_slugs_on_title_and_company_name_edits(self):
        for path, token in (("/api/jobs/", self.owner_token), ("/api/admin/jobs", self.admin_token)):
            with self.subTest(path=path):
                response = self.client.post(path, headers=self._headers(token), json={
                    "company_id": self.company_id, "title": "Consultor ERP Sênior",
                    "description": "Descrição sem PII", "is_active": False,
                })
                self.assertEqual(response.status_code, 201, response.get_json())
                created = response.get_json()["job"]
                self.assert_identity(created)
                job_id = created["id"]
                self._application_with_event(job_id)
                edit_path = f"/api/admin/jobs/{job_id}" if "admin" in path else f"/api/jobs/{job_id}"
                response = self.client.put(edit_path, headers=self._headers(token), json={"title": "Novo título"})
                self.assertEqual(response.status_code, 200, response.get_json())
                self.assert_identity(response.get_json()["job"])
                response = self.client.delete(edit_path, headers=self._headers(token))
                self.assertEqual(response.status_code, 200, response.get_json())
                self.assert_identity(response.get_json()["job"])
                with app.app_context():
                    self.assertEqual(Application.query.filter_by(job_id=job_id).count(), 1)
        response = self.client.put("/api/companies/", headers=self._headers(self.owner_token), json={"name": "Novo nome público"})
        self.assertEqual(response.status_code, 200, response.get_json())
        with app.app_context():
            for job in Job.query.all():
                self.assert_identity(job.to_dict())
                self.assertEqual(job.to_dict()["company_name"], "Novo nome público")
            admin = Admin.query.first()
            admin.permissions = {**admin.permissions, "manage_companies": True}
            db.session.commit()
        response = self.client.put(f"/api/admin/companies/{self.company_id}", headers=self._headers(self.admin_token), json={"name": "Empresa renomeada pelo Admin"})
        self.assertEqual(response.status_code, 200, response.get_json())
        with app.app_context():
            for job in Job.query.all():
                self.assert_identity(job.to_dict())

    def test_common_payloads_cannot_set_or_clear_public_slugs(self):
        job_id = self._job(title="Consultor ERP Sênior")
        paths = [
            ("post", "/api/jobs/", self.owner_token),
            ("post", "/api/admin/jobs", self.admin_token),
            ("put", f"/api/jobs/{job_id}", self.owner_token),
            ("put", f"/api/admin/jobs/{job_id}", self.admin_token),
        ]
        for field in ("public_company_slug", "public_title_slug"):
            for value in ("injected", None):
                for method, path, token in paths:
                    with self.subTest(method=method, path=path, field=field, value=value):
                        response = getattr(self.client, method)(path, headers=self._headers(token), json={
                            "title": "Alterado", "description": "Descrição", "company_id": self.company_id,
                            field: value,
                        })
                        self.assertEqual(response.status_code, 400, response.get_json())
        with app.app_context():
            self.assert_identity(db.session.get(Job, job_id).to_dict())

    def test_hidden_insert_and_public_to_hidden_masks_private_snapshot_in_every_dto(self):
        for path, token in (("/api/jobs/", self.owner_token), ("/api/admin/jobs", self.admin_token)):
            response = self.client.post(path, headers=self._headers(token), json={
                "title": "Consultor ERP Sênior", "description": "Descrição",
                "company_id": self.company_id, "is_company_hidden": True,
            })
            self.assertEqual(response.status_code, 201, response.get_json())
            self.assert_identity(response.get_json()["job"], company="empresa-confidencial")
            with app.app_context():
                self.assertEqual(db.session.get(Job, response.get_json()["job"]["id"]).public_company_slug, "empresa-confidencial")
        job_id = self._job(title="Consultor ERP Sênior")
        application_id = self._application_with_event(job_id)
        response = self.client.put(f"/api/jobs/{job_id}", headers=self._headers(self.owner_token), json={"is_company_hidden": True})
        self.assertEqual(response.status_code, 200, response.get_json())
        with app.app_context():
            job = db.session.get(Job, job_id)
            self.assertEqual(job.public_company_slug, "wave-4-company-br")
            for details in (False, True):
                payload = job.to_dict(include_details=details)
                self.assert_identity(payload, company="empresa-confidencial")
                self.assertIsNone(payload["company_name"])
                self.assertNotIn("wave-4-company", str(payload).lower())
            admin = Admin.query.first()
            admin.permissions = {**admin.permissions, "manage_companies": True, "manage_candidates": True}
            db.session.commit()
        endpoints = [
            (f"/api/jobs/{job_id}", None, lambda d: d),
            ("/api/jobs/", None, lambda d: next(j for j in d["jobs"] if j["id"] == job_id)),
            (f"/api/jobs/my-jobs/{job_id}", self.owner_token, lambda d: d),
            (f"/api/admin/jobs/{job_id}", self.admin_token, lambda d: d),
            (f"/api/admin/companies/{self.company_id}", self.admin_token, lambda d: next(j for j in d["jobs"] if j["id"] == job_id)),
            (f"/api/admin/companies/{self.company_id}/jobs", self.admin_token, lambda d: next(j for j in d["jobs"] if j["id"] == job_id)),
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
                self.assert_identity(payload, company="empresa-confidencial")
                self.assertIsNone(payload["company_name"])
                self.assertNotIn("wave-4-company", str(payload).lower())
        response = self.client.get(f"/api/companies/{self.company_id}", headers=self.HOST)
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertNotIn(job_id, [j["id"] for j in response.get_json()["jobs"]])
        with app.app_context():
            base = db.session.get(Application, application_id).to_dict()
            self.assertEqual(base["public_company_slug"], "empresa-confidencial")
        response = self.client.put(f"/api/admin/jobs/{job_id}", headers=self._headers(self.admin_token), json={"is_company_hidden": False})
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assert_identity(response.get_json()["job"])
        response = self.client.put(f"/api/admin/jobs/{job_id}", headers=self._headers(self.admin_token), json={"is_company_hidden": True})
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assert_identity(response.get_json()["job"], company="empresa-confidencial")
        response = self.client.put(f"/api/jobs/{job_id}", headers=self._headers(self.owner_token), json={"is_company_hidden": "true"})
        self.assertEqual(response.status_code, 400, response.get_json())

    def test_legacy_null_fallback_is_readonly_and_pending_company_protection_unchanged(self):
        job_id = self._job(title="Consultor ERP Sênior")
        with app.app_context():
            db.session.execute(db.text("UPDATE jobs SET public_company_slug=NULL, public_title_slug=NULL WHERE id=:id"), {"id": job_id})
            db.session.commit()
            job = db.session.get(Job, job_id)
            before = job.updated_at
            self.assert_identity(job.to_dict())
            self.assertFalse(db.session.is_modified(job))
        for path in ("/api/jobs/", f"/api/jobs/{job_id}"):
            response = self.client.get(path, headers=self.HOST)
            self.assertEqual(response.status_code, 200, response.get_json())
        with app.app_context():
            job = db.session.get(Job, job_id)
            self.assertIsNone(job.public_company_slug)
            self.assertIsNone(job.public_title_slug)
            self.assertEqual(job.updated_at, before)
            membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one()
            membership.status = CompanyStatus.PENDING
            db.session.commit()
        self.assertEqual(self.client.get(f"/api/jobs/{job_id}", headers=self.HOST).status_code, 404)
        self.assertEqual(self.client.get("/api/jobs/", headers=self.HOST).get_json()["jobs"], [])
        response = self.client.post("/api/admin/jobs", headers=self._headers(self.admin_token), json={
            "company_id": self.company_id, "title": "Blocked", "description": "Blocked",
        })
        self.assertEqual(response.status_code, 403, response.get_json())

    def test_orm_empty_names_and_titles_use_fallback_and_remain_frozen(self):
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one()
            company.company_name = ""
            membership.display_name = "  "
            job = Job(company_id=self.company_id, site_id=self.site_id, title="東京", description="Descrição")
            db.session.add(job)
            db.session.commit()
            self.assertEqual(job.public_company_slug, "empresa")
            self.assertEqual(job.public_title_slug, "vaga")
            company.company_name = "Agora preenchido"
            membership.display_name = "Agora regional"
            job.title = "Título preenchido"
            db.session.commit()
            self.assertEqual(job.public_company_slug, "empresa")
            self.assertEqual(job.public_title_slug, "vaga")


if __name__ == "__main__":
    unittest.main()
