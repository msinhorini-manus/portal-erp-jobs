"""Country identity, transactionality and fail-closed public route regressions.
Run in its own subprocess; no production providers or databases.
"""
from concurrent.futures import ThreadPoolExecutor
import re
import unittest
import uuid

import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError
import test_jobs_wave4 as fixtures
from src.config import db
from src.main import app
from src.company_slug_policy_v12 import RESERVED, alphabetic, base_slug, valid_slug
from src.models import Company, CompanySite, CompanyStatus, Job, Site, SiteDomain, User
from src.models.company import company_slug_reservations


class CompanyCountrySlugTests(unittest.TestCase):
    HOST = fixtures.JobsWave4Tests.HOST
    setUpClass = classmethod(fixtures.JobsWave4Tests.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.JobsWave4Tests.tearDownClass.__func__)
    setUp = fixtures.JobsWave4Tests.setUp
    _token = fixtures.JobsWave4Tests._token
    _headers = fixtures.JobsWave4Tests._headers
    _job = fixtures.JobsWave4Tests._job

    def make_company(self, name, *, site=None, sector=None, city=None, status="pending"):
        company = Company(company_name=name, user=User(email=f"slug-{uuid.uuid4()}@example.invalid", user_type="company"), sector=sector, city=city)
        membership = CompanySite(company=company, site=site or db.session.get(Site, self.site_id), status=status)
        db.session.add(membership)
        db.session.flush()
        return company, membership

    def new_site(self, code, country, active=True):
        code = code.replace("2", "SECOND")
        site = Site(code=code, name=code, country_code=country, default_locale="pt-BR", currency_code="BRL", timezone="UTC", is_active=active)
        site.domains.append(SiteDomain(hostname=f"{code.lower()}.example.invalid", is_primary=True))
        db.session.add(site)
        db.session.flush()
        return site

    def lookup(self, slug, headers=None):
        return self.client.get(f"/api/companies/by-slug/{slug}", headers=headers or self.HOST)

    def test_normalization_strict_policy_reserved_and_numeric_names(self):
        for name in ("Mégasoft", "Me\u0301gasoft", "Ｍｅｇａｓｏｆｔ", "MEGASOFT", "megasoft!!!"):
            self.assertEqual(base_slug(name, None), "megasoft")
        for name in ("１２３", "123", "api", "search", "東京", "---"):
            self.assertEqual(base_slug(name, None), "empresa")
        for value in [None, "", "A", "MegaSoft", "é", "123", "001", "a--b", "a_", "-a", "a-", "a/b", "a.b", "a" * 141, *RESERVED]:
            self.assertFalse(valid_slug(value), value)
        self.assertTrue(valid_slug("brand-123"))
        self.assertEqual([alphabetic(i) for i in (0, 25, 26, 27, 701, 702)], ["a", "z", "aa", "ab", "zz", "aaa"])

    def test_unicode_duplicates_country_scoped_across_two_site_ids_and_all_statuses(self):
        with app.app_context():
            br2 = self.new_site("BR2", "BR")
            mx = self.new_site("MX", "MX", active=False)
            names = ["Mégasoft", "Me\u0301gasoft", "Ｍｅｇａｓｏｆｔ", "MEGASOFT"]
            slugs = []
            for index, (name, status) in enumerate(zip(names, CompanyStatus.ALL)):
                _, membership = self.make_company(name, site=br2 if index % 2 else None, status=status)
                slugs.append(membership.public_profile_slug)
            self.assertEqual(slugs, ["megasoft", "megasoft-a", "megasoft-b", "megasoft-c"])
            _, membership = self.make_company("Mégasoft", site=mx)
            self.assertEqual(membership.public_profile_slug, "megasoft")
            # Same global owner may reuse the exact country reservation in two sites.
            owner = CompanySite.query.filter_by(public_profile_slug="megasoft", site_id=self.site_id).one()
            same = CompanySite(company_id=owner.company_id, site=br2, display_name="Mégasoft")
            db.session.add(same)
            db.session.commit()
            self.assertEqual(same.public_profile_slug, "megasoft")
            self.assertEqual(db.session.execute(sa.select(sa.func.count()).select_from(company_slug_reservations).where(
                company_slug_reservations.c.country_code == "BR", company_slug_reservations.c.slug == "megasoft")).scalar_one(), 1)

    def test_sector_city_then_alphabetic_qualifiers_and_bounded_length(self):
        with app.app_context():
            values = []
            for _ in range(5):
                _, membership = self.make_company("Megasoft", sector="Software", city="São Paulo")
                values.append(membership.public_profile_slug)
            self.assertEqual(values, ["megasoft", "megasoft-software", "megasoft-sao-paulo", "megasoft-software-sao-paulo", "megasoft-software-sao-paulo-a"])
            for _ in range(3):
                _, membership = self.make_company("Á" * 300, sector="S" * 100, city="C" * 50)
                self.assertTrue(valid_slug(membership.public_profile_slug))
                self.assertLessEqual(len(membership.public_profile_slug), 140)
            db.session.commit()

    def test_stable_rename_status_changes_and_reject_snapshot_or_identity_reassignment(self):
        with app.app_context():
            membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one()
            original = membership.public_profile_slug
            membership.company.company_name = "Global renamed"
            membership.display_name = "Different brand"
            for status in CompanyStatus.ALL:
                membership.status = status
                db.session.commit()
                self.assertEqual(membership.public_profile_slug, original)
            membership_id = membership.id
            other_site_id = self.new_site("BR2", "BR").id
            db.session.commit()
            for sql, params in (
                ("UPDATE company_sites SET public_profile_slug=:slug WHERE id=:id", {"id": membership_id, "slug": None}),
                ("UPDATE company_sites SET public_profile_slug=:slug WHERE id=:id", {"id": membership_id, "slug": "new-brand"}),
                ("UPDATE company_sites SET company_id=:owner WHERE id=:id", {"id": membership_id, "owner": self.other_company_id}),
                ("UPDATE company_sites SET site_id=:site WHERE id=:id", {"id": membership_id, "site": other_site_id}),
                ("UPDATE sites SET country_code='MX' WHERE id=:site", {"site": self.site_id}),
            ):
                with self.assertRaises(IntegrityError):
                    db.session.execute(sa.text(sql), params)
                db.session.rollback()
            self.assertEqual(db.session.get(CompanySite, membership_id).public_profile_slug, original)

    def test_deleted_membership_and_hard_deleted_company_keep_tombstones(self):
        with app.app_context():
            company, membership = self.make_company("Deleted Brand")
            company_id = company.id
            db.session.commit()
            db.session.delete(membership)
            db.session.commit()
            _, other = self.make_company("Deleted Brand")
            self.assertEqual(other.public_profile_slug, "deleted-brand-a")
            restored = CompanySite(company=company, site=db.session.get(Site, self.site_id))
            db.session.add(restored)
            db.session.flush()
            self.assertEqual(restored.public_profile_slug, "deleted-brand")
            db.session.delete(company)
            db.session.commit()
            owner = db.session.execute(sa.select(company_slug_reservations.c.company_id).where(
                company_slug_reservations.c.country_code == "BR", company_slug_reservations.c.slug == "deleted-brand")).scalar_one()
            self.assertIsNone(owner)
            self.assertIsNone(db.session.get(Company, company_id))
            _, fresh = self.make_company("Deleted Brand")
            self.assertEqual(fresh.public_profile_slug, "deleted-brand-b")
            db.session.commit()
            for statement in (
                "DELETE FROM company_slug_reservations WHERE slug='deleted-brand'",
                f"UPDATE company_slug_reservations SET company_id={fresh.company_id} WHERE slug='deleted-brand'",
                "UPDATE company_slug_reservations SET slug='freed-brand' WHERE slug='deleted-brand'",
            ):
                with self.assertRaises(IntegrityError):
                    db.session.execute(sa.text(statement))
                db.session.rollback()

    def test_by_slug_matches_numeric_flat_dto_and_contains_no_private_pii_or_hidden_jobs(self):
        visible = self._job(title="Public job")
        hidden = self._job(title="Confidential job")
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            company.phone = "PRIVATE-FIXTURE-PHONE"
            company.cnpj = "PRIVATE-FIXTURE-TAX"
            db.session.get(Job, hidden).is_company_hidden = True
            db.session.commit()
        response = self.lookup("wave-4-company-br")
        self.assertEqual(response.status_code, 200)
        numeric = self.client.get(f"/api/companies/{self.company_id}", headers=self.HOST)
        self.assertEqual(response.get_json(), numeric.get_json())
        payload = response.get_json()
        self.assertEqual(payload["id"], self.company_id)
        self.assertEqual(payload["site_id"], self.site_id)
        self.assertEqual(payload["site_code"], "BR")
        self.assertEqual([item["id"] for item in payload["jobs"]], [visible])
        for private in ("user_id", "phone", "cnpj", "street_address", "zip_code", "approved_by", "approval_reason"):
            self.assertNotIn(private, payload)
        self.assertNotIn("PRIVATE-FIXTURE", str(payload))
        self.assertNotIn("Location", response.headers)

    def test_directory_detail_and_employer_links_share_public_eligibility(self):
        job_id = self._job(title="Preserved internal job")
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            company.user.is_active = False
            legacy = Company(company_name="Legacy absent slug", user=User(
                email=f"legacy-{uuid.uuid4()}@example.invalid", user_type="company",
            ))
            db.session.add(legacy)
            db.session.flush()
            legacy_id = legacy.id
            # Exact rollback-only legacy writer path: no ORM slug allocator.
            db.session.execute(sa.insert(CompanySite.__table__).values(
                company_id=legacy_id, site_id=self.site_id, status="approved", public_profile_slug=None,
            ))
            db.session.commit()
            job = db.session.get(Job, job_id)
            snapshots = (job.public_company_slug, job.public_title_slug)
            dto = job.to_dict(include_details=True)
            self.assertEqual(dto["id"], job_id)
            self.assertIsNone(dto["company_profile_slug"])
            self.assertIsNone(dto["company"]["public_profile_slug"])
            self.assertEqual((job.public_company_slug, job.public_title_slug), snapshots)
        directory = self.client.get("/api/companies/search?per_page=100", headers=self.HOST)
        self.assertEqual(directory.status_code, 200)
        ids = {item["id"] for item in directory.get_json()["companies"]}
        self.assertNotIn(self.company_id, ids)
        self.assertNotIn(legacy_id, ids)
        self.assertEqual(self.lookup("wave-4-company-br").status_code, 404)
        for ident in (self.company_id, legacy_id):
            self.assertEqual(self.client.get(f"/api/companies/{ident}", headers=self.HOST).status_code, 404)

    def test_by_slug_pending_rejected_suspended_inactive_owner_and_region_are_404(self):
        for status in ("pending", "rejected", "suspended"):
            with app.app_context():
                membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one()
                membership.status = status
                db.session.commit()
            self.assertEqual(self.lookup("wave-4-company-br").status_code, 404)
        with app.app_context():
            membership.status = "approved"
            db.session.add(membership)
            membership.company.user.is_active = False
            db.session.commit()
        self.assertEqual(self.lookup("wave-4-company-br").status_code, 404)
        with app.app_context():
            db.session.get(Company, self.company_id).user.is_active = True
            mx = self.new_site("MX", "MX", active=False)
            _, mx_member = self.make_company("Only Mexico", site=mx, status="approved")
            db.session.commit()
        self.assertEqual(self.lookup("only-mexico").status_code, 404)
        self.assertEqual(self.lookup("only-mexico", {"Host": "mx.example.invalid"}).status_code, 404)
        with app.app_context():
            db.session.get(Site, self.site_id).is_active = False
            db.session.commit()
        self.assertEqual(self.lookup("wave-4-company-br").status_code, 404)

    def test_by_slug_malformed_and_untrusted_region_fail_without_persistence(self):
        with app.app_context():
            before = db.session.execute(sa.text("SELECT id,public_profile_slug,updated_at FROM company_sites ORDER BY id")).all()
            reservations = db.session.execute(sa.select(company_slug_reservations)).all()
        for slug in ("MegaSoft", "123", "api", "a--b", "megásoft", "a" * 141, "unknown", "foo%2Fbar"):
            self.assertEqual(self.lookup(slug).status_code, 404, slug)
        for _ in range(3):
            self.assertEqual(self.lookup("wave-4-company-br").status_code, 200)
        spoofed = self.client.get("/api/companies/by-slug/wave-4-company-br", headers={"Host": "jobs.portalerp.com.br", "X-Regional-Host": "mx.example.invalid"}, environ_overrides={"REMOTE_ADDR": "203.0.113.30"})
        self.assertEqual(spoofed.status_code, 400)
        self.assertEqual(self.lookup("wave-4-company-br", {"Host": "unknown.example.invalid"}).status_code, 404)
        with app.app_context():
            self.assertEqual(db.session.execute(sa.text("SELECT id,public_profile_slug,updated_at FROM company_sites ORDER BY id")).all(), before)
            self.assertEqual(db.session.execute(sa.select(company_slug_reservations)).all(), reservations)

    def test_concurrent_colliding_registration_is_atomic_and_pending(self):
        def register(number):
            with app.test_client() as client:
                response = client.post("/api/auth/register/company", headers=self.HOST, json={
                    "email": f"concurrent-{number}@example.invalid", "password": "ValidPassword123",
                    "trade_name": "Concurrent Mégasoft", "tax_id": f"CONCURRENT-{number}",
                    "accept_terms": True, "accept_privacy": True,
                    "public_profile_slug": "forged", "status": "approved",
                })
                self.assertEqual(response.status_code, 201, response.get_json())
                return response.get_json()["user"]["company_id"]
        with ThreadPoolExecutor(max_workers=6) as executor:
            ids = list(executor.map(register, range(6)))
        with app.app_context():
            memberships = CompanySite.query.filter(CompanySite.company_id.in_(ids)).all()
            self.assertEqual({item.public_profile_slug for item in memberships}, {"concurrent-megasoft", *(f"concurrent-megasoft-{letter}" for letter in "abcde")})
            self.assertTrue(all(item.status == "pending" and item.approved_at is None for item in memberships))
            for item in memberships:
                self.assertEqual(item.resolved_public_profile_slug, item.public_profile_slug)
                self.assertNotIn(str(item.company_id), item.public_profile_slug)
        for slug in ("concurrent-megasoft", "concurrent-megasoft-a"):
            self.assertEqual(self.lookup(slug).status_code, 404)


if __name__ == "__main__":
    unittest.main()
