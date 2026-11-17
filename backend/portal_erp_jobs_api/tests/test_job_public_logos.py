"""Public job logo DTO contract. Run alone with PYTHONPATH=tests:."""
import unittest
from unittest.mock import PropertyMock, patch

import test_jobs_wave4 as fixtures
from src.config import db
from src.main import app
from src.models import Company, CompanySite, CompanyStatus, Job, Site


class JobPublicLogoTests(unittest.TestCase):
    HOST = fixtures.JobsWave4Tests.HOST
    setUpClass = classmethod(fixtures.JobsWave4Tests.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.JobsWave4Tests.tearDownClass.__func__)
    setUp = fixtures.JobsWave4Tests.setUp
    _token = fixtures.JobsWave4Tests._token
    _job = fixtures.JobsWave4Tests._job

    LOGO = "https://assets.example.invalid/wave-4-company-logo.png"
    REGIONAL_LOGO = "https://assets.example.invalid/regional-logo.png"

    def make_logo_job(self):
        job_id = self._job(title="Consultor ERP")
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            company.logo_url = self.LOGO
            db.session.commit()
        return job_id

    def assert_logo_blocked(self, job):
        for details in (False, True):
            with self.subTest(include_details=details):
                payload = job.to_dict(include_details=details)
                self.assertIn("company_logo_url", payload)
                self.assertIsNone(payload["company_logo_url"])
                self.assertIsNone(payload["company_profile_slug"])

    def test_approved_company_has_logo_in_list_and_detail_dtos_and_endpoints(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            for details in (False, True):
                payload = job.to_dict(include_details=details)
                self.assertEqual(payload["company_logo_url"], self.LOGO)
                self.assertEqual(payload["company_profile_slug"], "wave-4-company-br")
                self.assertEqual(payload["company_name"], "Wave 4 Company BR")
                for private in ("user_id", "cnpj", "phone", "approval_reason"):
                    self.assertNotIn(private, payload)
                if details:
                    self.assertEqual(payload["company"], job.company.to_public_dict(
                        job.company.site_memberships[0]
                    ))
                    self.assertEqual(payload["company"]["logo_url"], self.LOGO)
                    for private in ("user_id", "cnpj", "phone", "max_active_jobs"):
                        self.assertNotIn(private, payload["company"])
                else:
                    self.assertNotIn("company", payload)
                    self.assertNotIn("description", payload)
        listed = self.client.get("/api/jobs/", headers=self.HOST)
        detail = self.client.get(f"/api/jobs/{job_id}", headers=self.HOST)
        self.assertEqual(listed.status_code, 200, listed.get_json())
        self.assertEqual(detail.status_code, 200, detail.get_json())
        self.assertEqual(listed.get_json()["jobs"][0]["company_logo_url"], self.LOGO)
        self.assertEqual(detail.get_json()["company_logo_url"], self.LOGO)
        self.assertEqual(detail.get_json()["company"]["logo_url"], self.LOGO)

    def test_confidential_company_drops_logo_name_and_urls_in_dtos_and_endpoints(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            job.is_company_hidden = True
            db.session.commit()
            self.assert_logo_blocked(job)
            for details in (False, True):
                payload = job.to_dict(include_details=details)
                self.assertIsNone(payload["company_name"])
                self.assertEqual(payload["public_company_slug"], "empresa-confidencial")
                self.assertNotIn(self.LOGO, str(payload))
                self.assertNotIn("wave-4-company", str(payload).lower())
                if details:
                    self.assertIsNone(payload["company"])
        listed = self.client.get("/api/jobs/", headers=self.HOST)
        detail = self.client.get(f"/api/jobs/{job_id}", headers=self.HOST)
        self.assertEqual(listed.status_code, 200, listed.get_json())
        self.assertEqual(detail.status_code, 200, detail.get_json())
        for payload in (listed.get_json()["jobs"][0], detail.get_json()):
            self.assertIsNone(payload["company_logo_url"])
            self.assertIsNone(payload["company_name"])
            self.assertIsNone(payload["company_profile_slug"])
            self.assertNotIn(self.LOGO, str(payload))
            self.assertNotIn("wave-4-company", str(payload).lower())
        self.assertIsNone(detail.get_json()["company"])

    def assert_status_blocks_logo(self, status):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            job.company.site_memberships[0].status = status
            db.session.commit()
            self.assert_logo_blocked(job)
        listed = self.client.get("/api/jobs/", headers=self.HOST)
        detail = self.client.get(f"/api/jobs/{job_id}", headers=self.HOST)
        self.assertEqual(listed.status_code, 200, listed.get_json())
        self.assertEqual(listed.get_json()["jobs"], [])
        self.assertEqual(detail.status_code, 404, detail.get_json())

    def test_pending_membership_drops_logo(self):
        self.assert_status_blocks_logo(CompanyStatus.PENDING)

    def test_rejected_membership_drops_logo(self):
        self.assert_status_blocks_logo(CompanyStatus.REJECTED)

    def test_suspended_membership_drops_logo(self):
        self.assert_status_blocks_logo(CompanyStatus.SUSPENDED)

    def test_inactive_owner_drops_logo_without_changing_existing_company_dto(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            job.company.user.is_active = False
            db.session.commit()
            self.assert_logo_blocked(job)
            # The nested company DTO is existing behavior, not a new projection.
            payload = job.to_dict(include_details=True)
            self.assertEqual(payload["company"], job.company.to_public_dict(
                job.company.site_memberships[0]
            ))
            self.assertIsNone(payload["company"]["public_profile_slug"])

    def test_missing_regional_membership_drops_logo_without_global_fallback(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            # An inconsistent legacy/read-only object must fail closed. Do not
            # persist a job without its required company/site foreign key.
            other_site = Site(id=self.site_id + 100, code="MX", country_code="MX")
            with db.session.no_autoflush, patch.dict(job.__dict__, {
                "site_id": other_site.id, "site": other_site,
            }):
                self.assert_logo_blocked(job)
                self.assertIsNone(job.to_dict(include_details=True)["company"])

    def test_absent_malformed_unreserved_or_wrong_owner_snapshot_drops_logo(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            membership = job.company.site_memberships[0]
            for snapshot in (None, "", "Bad/Slug", "unreserved-company", "other-company-br"):
                with self.subTest(snapshot=snapshot):
                    # Simulate invalid legacy snapshots in memory only; database
                    # identity guards and reservations remain untouched.
                    with db.session.no_autoflush, patch.dict(membership.__dict__, {
                        "public_profile_slug": snapshot,
                    }):
                        self.assert_logo_blocked(job)
            self.assertFalse(db.session.is_modified(membership))

    def test_approved_company_without_logo_returns_none(self):
        job_id = self._job(title="Empresa sem logo")
        with app.app_context():
            job = db.session.get(Job, job_id)
            for details in (False, True):
                payload = job.to_dict(include_details=details)
                self.assertIsNone(payload["company_logo_url"])
                self.assertEqual(payload["company_profile_slug"], "wave-4-company-br")

    def test_new_logo_matches_regional_detail_projection_and_fallback(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            membership = job.company.site_memberships[0]
            membership.logo_url = self.REGIONAL_LOGO
            db.session.commit()
            payload = job.to_dict(include_details=True)
            self.assertEqual(payload["company_logo_url"], self.REGIONAL_LOGO)
            self.assertEqual(payload["company"]["logo_url"], self.REGIONAL_LOGO)
            job.company.logo_url = None
            db.session.commit()
            payload = job.to_dict(include_details=True)
            self.assertEqual(payload["company_logo_url"], self.REGIONAL_LOGO)
            self.assertEqual(payload["company"]["logo_url"], self.REGIONAL_LOGO)
            membership.logo_url = ""
            job.company.logo_url = self.LOGO
            db.session.commit()
            self.assertEqual(job.to_dict()["company_logo_url"], "")
            membership.logo_url = None
            db.session.commit()
            self.assertEqual(job.to_dict()["company_logo_url"], self.LOGO)

    def test_logo_reuses_identity_resolution_without_additional_eligibility_lookup(self):
        job_id = self.make_logo_job()
        with app.app_context():
            job = db.session.get(Job, job_id)
            with patch.object(CompanySite, "resolved_public_profile_slug",
                              new_callable=PropertyMock,
                              return_value="wave-4-company-br") as resolved:
                self.assertEqual(job.to_dict()["company_logo_url"], self.LOGO)
                self.assertEqual(resolved.call_count, 1)
                resolved.reset_mock()
                self.assertEqual(job.to_dict(include_details=True)["company_logo_url"], self.LOGO)
                # Existing identity + existing company.to_public_dict, not a
                # third lookup for the new field.
                self.assertEqual(resolved.call_count, 2)


if __name__ == "__main__":
    unittest.main()
