"""Run alone: PYTHONPATH=tests:. python -m unittest test_company_logo_uploads.

Force a private temporary SQLite database BEFORE importing the global Flask app.
Never run this module in a process that has already initialized src.config.
"""
import io
import os
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import PropertyMock, patch
import zlib

if "src.config" in sys.modules:
    raise RuntimeError("Company logo tests require their own isolated process")

_fd, _db_path = tempfile.mkstemp(prefix="company-logos-isolated-", suffix=".db")
os.close(_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "company-logos-test-secret-key-only-123456789"
os.environ["JWT_SECRET_KEY"] = "company-logos-test-jwt-secret-key-only-123456789"
os.environ["FLASK_ENV"] = "testing"

import test_jobs_wave4 as fixtures  # noqa: E402
os.unlink(fixtures.database_path)
fixtures.database_path = _db_path
from PIL import Image, PngImagePlugin  # noqa: E402
from flask import g  # noqa: E402
from werkzeug.exceptions import RequestEntityTooLarge  # noqa: E402
from werkzeug.test import EnvironBuilder  # noqa: E402
from werkzeug.wrappers import Request  # noqa: E402
from src import company_logo_storage as storage  # noqa: E402
from src.config import BASE_DIR, db  # noqa: E402
from src.main import app  # noqa: E402
from src.models import Company, CompanySite, CompanyStatus, CompanyUser, Job, Site, SiteDomain, User  # noqa: E402


def image_bytes(fmt="PNG", size=(64, 32), **options):
    output = io.BytesIO()
    Image.new("RGB", size, "blue").save(output, format=fmt, **options)
    return output.getvalue()


class CompanyLogoTests(unittest.TestCase):
    HOST = fixtures.JobsWave4Tests.HOST
    setUpClass = classmethod(fixtures.JobsWave4Tests.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.JobsWave4Tests.tearDownClass.__func__)
    _headers = fixtures.JobsWave4Tests._headers
    _job = fixtures.JobsWave4Tests._job

    def _token(self, user, user_type, **claims):
        self.site = db.session.get(Site, self.site_id if hasattr(self, "site_id") else self.site.id)
        return fixtures.JobsWave4Tests._token(self, user, user_type, **claims)

    def setUp(self):
        fixtures.JobsWave4Tests.setUp(self)
        del self.membership  # Base fixtures use this name for an ORM instance.
        self.directory = tempfile.TemporaryDirectory(prefix="company-logos-files-")
        app.config["COMPANY_LOGO_UPLOAD_DIR"] = str(Path(self.directory.name) / "logos")
        with app.app_context():
            site = db.session.get(Site, self.site_id)
            site.domains.append(SiteDomain(hostname="jobs.portalerp.com", url_prefix="/br", is_primary=True))
            site.domains[0].is_primary = False
            site.canonical_origin = "https://jobs.portalerp.com"
            db.session.commit()
        self.mx_id = None

    def tearDown(self):
        app.config.pop("COMPANY_LOGO_UPLOAD_DIR", None)
        self.directory.cleanup()

    def membership(self):
        return CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one()

    def upload(self, data=None, filename="logo.png", token=None, headers=None):
        return self.client.post("/api/companies/logo", headers=headers or self._headers(token or self.owner_token),
                                data={"logo": (io.BytesIO(data if data is not None else image_bytes()), filename)})

    def path(self, url):
        return "/api/companies/logos/" + url.rsplit("/", 1)[1]

    def file(self, url):
        return Path(app.config["COMPANY_LOGO_UPLOAD_DIR"]) / url.rsplit("/", 1)[1]

    def add_mx(self, *, approved=True):
        with app.app_context():
            mx = Site(code="MX", name="Mexico", country_code="MX", default_locale="es-MX",
                      currency_code="MXN", timezone="UTC", canonical_origin="https://jobs.portalerp.com", is_active=True)
            mx.domains.append(SiteDomain(hostname="jobs.portalerp.com", url_prefix="/mx", is_primary=True))
            db.session.add(mx)
            db.session.flush()
            db.session.add(CompanySite(company_id=self.company_id, site=mx,
                                       status=CompanyStatus.APPROVED if approved else CompanyStatus.PENDING,
                                       is_member=True, display_name="Marca Mexico"))
            db.session.commit()
            self.mx_id = mx.id
        return {"Host": "127.0.0.1:5000", "X-Regional-Host": "jobs.portalerp.com", "X-Regional-Prefix": "/mx"}

    def test_real_formats_normalize_absolute_trusted_url_and_safe_headers(self):
        for fmt, extension in (("PNG", ".png"), ("JPEG", ".jpg"), ("WEBP", ".webp")):
            with self.subTest(format=fmt):
                response = self.upload(image_bytes(fmt), "../../client-name" + extension,
                                       headers={**self._headers(self.owner_token), "X-Forwarded-Host": "attacker.invalid"})
                self.assertEqual(response.status_code, 200, response.get_json())
                payload = response.get_json()
                self.assertEqual(set(payload), {"company", "logo_url", "message"})
                url = payload["logo_url"]
                self.assertRegex(url, r"^https://jobs\.portalerp\.com/br/api/companies/logos/[a-f0-9]{32}\.png$")
                self.assertEqual(payload["company"]["logo_url"], url)
                public = self.client.get(self.path(url), headers=self.HOST)
                self.assertEqual(public.status_code, 200)
                self.assertEqual(public.headers["Content-Type"], "image/png")
                self.assertEqual(public.headers["Cache-Control"], "no-store")
                self.assertEqual(public.headers["X-Content-Type-Options"], "nosniff")
                self.assertNotIn("ETag", public.headers)
                with Image.open(io.BytesIO(public.data)) as normalized:
                    self.assertEqual(normalized.format, "PNG")
                    self.assertEqual(normalized.size, (64, 32))
                self.assertEqual(self.file(url).stat().st_mode & 0o777, 0o600)
                self.assertEqual(self.file(url).parent.stat().st_mode & 0o777, 0o700)
                public.close()

    def test_normalized_size_orientation_and_metadata_removed(self):
        exif = Image.Exif()
        exif[274] = 6
        exif[270] = "private metadata"
        response = self.upload(image_bytes("JPEG", (2048, 512), exif=exif), "logo.jpeg")
        self.assertEqual(response.status_code, 200)
        with Image.open(self.file(response.get_json()["logo_url"])) as normalized:
            self.assertEqual(normalized.size, (256, 1024))
            self.assertFalse(normalized.getexif())
            self.assertFalse(normalized.info)
        text = PngImagePlugin.PngInfo()
        text.add_text("secret", "not-public")
        response = self.upload(image_bytes(pnginfo=text))
        with Image.open(self.file(response.get_json()["logo_url"])) as normalized:
            self.assertFalse(normalized.info)

    def test_invalid_formats_svg_gif_bmp_fake_and_truncated_rejected(self):
        for data, filename in ((b"<svg xmlns='http://www.w3.org/2000/svg'/>", "logo.png"),
                               (image_bytes("GIF"), "logo.png"), (image_bytes("BMP"), "logo.png"),
                               (b"not image", "logo.webp"), (image_bytes()[:40], "logo.png"),
                               (image_bytes(), "logo.svg"), (b"", "logo.png")):
            with self.subTest(filename=filename, prefix=data[:12]):
                response = self.upload(data, filename)
                self.assertEqual(response.status_code, 400, response.get_json())
        self.assertFalse(Path(app.config["COMPANY_LOGO_UPLOAD_DIR"]).exists())

    def test_animated_png_and_webp_rejected(self):
        for fmt, extension in (("PNG", "png"), ("WEBP", "webp")):
            data = io.BytesIO()
            Image.new("RGB", (20, 20), "blue").save(data, format=fmt, save_all=True,
                append_images=[Image.new("RGB", (20, 20), "red")], duration=100, loop=0)
            self.assertEqual(self.upload(data.getvalue(), "logo." + extension).status_code, 400)

    def test_bytes_pixel_bombs_and_exact_size_boundary(self):
        png = image_bytes()
        accepted = self.upload(png + b"\0" * (storage.MAX_UPLOAD_BYTES - len(png)))
        self.assertEqual(accepted.status_code, 200, accepted.get_json())
        self.assertEqual(self.upload(png + b"\0" * (storage.MAX_UPLOAD_BYTES + 1 - len(png))).status_code, 413)
        self.assertEqual(self.upload(image_bytes(size=(4001, 4000))).status_code, 400)
        # Minimal huge PNG header fails before allocating raster memory.
        chunk = b"IHDR" + struct.pack(">IIBBBBB", 100000, 100000, 8, 2, 0, 0, 0)
        bomb = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", zlib.crc32(chunk))
        self.assertEqual(self.upload(bomb).status_code, 400)

    def test_endpoint_local_parser_missing_duplicate_extra_and_unknown_length(self):
        headers = self._headers(self.owner_token)
        for data in ({}, {"file": (io.BytesIO(image_bytes()), "a.png")},
                     {"logo": [(io.BytesIO(image_bytes()), "a.png"), (io.BytesIO(image_bytes()), "b.png")]},
                     {"logo": (io.BytesIO(image_bytes()), "a.png"), "company_id": self.other_company_id}):
            response = self.client.post("/api/companies/logo", headers=headers, data=data)
            self.assertIn(response.status_code, (400, 413))
        self.assertEqual(self.client.post("/api/companies/logo", headers=headers, json={"logo": "https://example.invalid/a.png"}).status_code, 400)
        self.assertIsNone(app.config.get("MAX_CONTENT_LENGTH"))
        for size, expected in ((64, None), (storage.MAX_UPLOAD_BYTES + 1, RequestEntityTooLarge)):
            builder = EnvironBuilder(method="POST", data={"logo": (io.BytesIO(image_bytes() + b"\0" * size), "a.png")})
            environ = builder.get_environ()
            environ.pop("CONTENT_LENGTH", None)
            environ["wsgi.input_terminated"] = True
            request = Request(environ)
            if expected:
                with self.assertRaises(expected):
                    storage.read_logo_upload(request)
            else:
                self.assertTrue(storage.read_logo_upload(request).startswith(b"\x89PNG"))
            builder.close()

    def test_pending_logo_cannot_be_relinked_by_another_company_profile_put(self):
        with app.app_context():
            self.membership().status = CompanyStatus.PENDING
            db.session.commit()
        url = self.upload().get_json()["logo_url"]
        response = self.client.put("/api/companies/", headers=self._headers(self.other_token), json={"logo_url": url})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        unchanged = self.client.put("/api/companies/", headers=self._headers(self.owner_token), json={"logo_url": url})
        self.assertEqual(unchanged.status_code, 200)
        with app.app_context():
            other = CompanySite.query.filter_by(company_id=self.other_company_id, site_id=self.site_id).one()
            self.assertIsNone(other.logo_url)

    def test_auth_denies_anonymous_candidate_platform_admin_and_cross_company(self):
        response = self.client.post("/api/companies/logo", headers=self.HOST, data={"logo": (io.BytesIO(image_bytes()), "logo.png")})
        self.assertEqual(response.status_code, 401)
        for token in (self.candidate_token, self.admin_token):
            self.assertEqual(self.upload(token=token).status_code, 403)
            self.assertEqual(self.client.delete("/api/companies/logo", headers=self._headers(token)).status_code, 403)
        with app.app_context():
            user = db.session.get(Company, self.company_id).user
            token = self._token(user, "company", company_id=self.other_company_id)
        self.assertEqual(self.upload(token=token).status_code, 401)
        self.assertFalse(Path(app.config["COMPANY_LOGO_UPLOAD_DIR"]).exists())

    def test_team_admin_allowed_viewer_hr_inactive_and_unaccepted_denied(self):
        with app.app_context():
            user = User(email="team-logo@example.invalid", user_type="company")
            db.session.add(user)
            db.session.flush()
            member = CompanyUser(user_id=user.id, company_id=self.company_id, role="admin", name="Team admin",
                                 is_active=True, invitation_accepted=True)
            db.session.add(member)
            db.session.commit()
            member_id = member.id
            token = self._token(user, "company", company_id=self.company_id)
        self.assertEqual(self.upload(token=token).status_code, 200)
        self.assertEqual(self.client.delete("/api/companies/logo", headers=self._headers(token)).status_code, 200)
        for role in ("viewer", "hr"):
            with app.app_context():
                db.session.get(CompanyUser, member_id).role = role
                db.session.commit()
            self.assertEqual(self.upload(token=token).status_code, 403)
            self.assertEqual(self.client.delete("/api/companies/logo", headers=self._headers(token)).status_code, 403)
        for field in ("is_active", "invitation_accepted"):
            with app.app_context():
                member = db.session.get(CompanyUser, member_id)
                member.role = "admin"
                setattr(member, field, False)
                db.session.commit()
            self.assertEqual(self.upload(token=token).status_code, 401)
            with app.app_context():
                setattr(db.session.get(CompanyUser, member_id), field, True)
                db.session.commit()

    def test_pending_can_prepare_but_never_publish_approve_or_gain_membership(self):
        with app.app_context():
            self.membership().status = CompanyStatus.PENDING
            db.session.commit()
        response = self.upload()
        self.assertEqual(response.status_code, 200, response.get_json())
        url = response.get_json()["logo_url"]
        self.assertTrue(self.file(url).exists())
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        self.assertEqual(self.client.get(f"/api/companies/{self.company_id}", headers=self.HOST).status_code, 404)
        with app.app_context():
            membership = self.membership()
            self.assertEqual(membership.status, CompanyStatus.PENDING)
            self.assertFalse(membership.is_member)
            self.assertIsNone(membership.approved_at)
            self.assertFalse(membership.company.to_public_dict(membership)["is_member"])
            membership.status = CompanyStatus.APPROVED
            db.session.commit()
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 200)

    def test_serving_revoked_pending_rejected_suspended_inactive_owner_and_site(self):
        url = self.upload().get_json()["logo_url"]
        for status in (CompanyStatus.PENDING, CompanyStatus.REJECTED, CompanyStatus.SUSPENDED):
            with app.app_context():
                self.membership().status = status
                db.session.commit()
            response = self.client.get(self.path(url), headers=self.HOST)
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.headers["Cache-Control"], "no-store")
        with app.app_context():
            self.membership().status = CompanyStatus.APPROVED
            self.membership().company.user.is_active = False
            db.session.commit()
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        self.assertEqual(self.upload().status_code, 401)
        with app.app_context():
            self.membership().company.user.is_active = True
            db.session.get(Site, self.site_id).is_active = False
            db.session.commit()
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)

    def test_serving_invalid_slug_unknown_files_traversal_and_wrong_region_closed(self):
        url = self.upload().get_json()["logo_url"]
        mx_headers = self.add_mx()
        self.assertEqual(self.client.get(self.path(url), headers=mx_headers).status_code, 404)
        self.assertEqual(self.upload(headers={**mx_headers, "Authorization": f"Bearer {self.owner_token}"}).status_code, 403)
        for opaque in ("unknown", "0" * 32, "../app", "%2e%2e%2fapp"):
            self.assertEqual(self.client.get(f"/api/companies/logos/{opaque}.png", headers=self.HOST).status_code, 404)
        with patch.object(CompanySite, "resolved_public_profile_slug", new_callable=PropertyMock, return_value=None):
            self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        self.assertEqual(self.client.get(self.path(url), headers={"Host": "unregistered.invalid"}).status_code, 404)

    def test_future_region_prefix_and_trusted_base_fail_closed(self):
        mx_headers = self.add_mx()
        with app.app_context():
            token = self._token(db.session.get(Company, self.company_id).user, "company", company_id=self.company_id,
                                site_id=self.mx_id, site_code="MX")
        response = self.upload(headers={**mx_headers, "Authorization": f"Bearer {token}"})
        self.assertEqual(response.status_code, 200, response.get_json())
        url = response.get_json()["logo_url"]
        self.assertIn("/mx/api/companies/logos/", url)
        self.assertEqual(self.client.get(self.path(url), headers=mx_headers).status_code, 200)
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        with patch("src.company_logo_storage.trusted_regional_base_url", return_value=None):
            self.assertEqual(self.upload().status_code, 503)
            self.assertEqual(self.client.get(self.path(url), headers=mx_headers).status_code, 404)

    def test_removal_and_replacement_preserve_files_without_global_fallback(self):
        with app.app_context():
            db.session.get(Company, self.company_id).logo_url = "https://legacy.invalid/logo.png"
            db.session.commit()
        first = self.upload().get_json()["logo_url"]
        second = self.upload().get_json()["logo_url"]
        self.assertNotEqual(first, second)
        self.assertTrue(self.file(first).exists())
        self.assertEqual(self.client.get(self.path(first), headers=self.HOST).status_code, 404)
        response = self.client.delete("/api/companies/logo", headers=self._headers(self.owner_token))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["logo_url"], "")
        self.assertEqual(response.get_json()["company"]["logo_url"], "")
        self.assertEqual(self.client.get(self.path(second), headers=self.HOST).status_code, 404)
        self.assertTrue(self.file(second).exists())
        with app.app_context():
            self.assertEqual(self.membership().logo_url, "")
            self.assertEqual(self.membership().company.logo_url, "https://legacy.invalid/logo.png")
            self.membership().logo_url = first
            db.session.commit()
        self.assertEqual(self.client.get(self.path(first), headers=self.HOST).status_code, 200)

    def test_symlink_and_static_directory_blocked(self):
        url = self.upload().get_json()["logo_url"]
        path = self.file(url)
        path.unlink()
        path.symlink_to(Path(BASE_DIR) / "src" / "main.py")
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        app.config["COMPANY_LOGO_UPLOAD_DIR"] = str(Path(self.directory.name) / "link")
        Path(app.config["COMPANY_LOGO_UPLOAD_DIR"]).symlink_to(Path(self.directory.name) / "logos", target_is_directory=True)
        self.assertEqual(self.upload().status_code, 500)
        app.config["COMPANY_LOGO_UPLOAD_DIR"] = str(Path(app.static_folder) / "company_logos")
        self.assertEqual(self.upload().status_code, 500)
        self.assertFalse((Path(app.static_folder) / "company_logos").exists())

    def test_storage_env_default_permissions_and_nonregular_file_fail_closed(self):
        configured = app.config.pop("COMPANY_LOGO_UPLOAD_DIR")
        with app.app_context(), patch.dict(os.environ, {"COMPANY_LOGO_UPLOAD_DIR": configured}):
            opaque = storage.store_logo(image_bytes())
            with storage.open_logo(opaque) as stream:
                self.assertEqual(stream.read(), image_bytes())
        app.config["COMPANY_LOGO_UPLOAD_DIR"] = configured
        url = self.upload().get_json()["logo_url"]
        path = self.file(url)
        path.chmod(0o644)
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        path.unlink()
        os.mkfifo(path, mode=0o600)
        self.assertEqual(self.client.get(self.path(url), headers=self.HOST).status_code, 404)
        path.unlink()
        app.config.pop("COMPANY_LOGO_UPLOAD_DIR")
        with app.app_context(), patch.dict(os.environ, {"COMPANY_LOGO_UPLOAD_DIR": ""}), \
                patch("src.company_logo_storage.os.open", side_effect=FileNotFoundError) as opened:
            with self.assertRaises(FileNotFoundError):
                storage._directory_fd()
            self.assertEqual(opened.call_args.args[0], "/")
        self.assertEqual(Path(storage.BASE_DIR) / "database" / "company_logos", Path(BASE_DIR) / "database" / "company_logos")
        app.config["COMPANY_LOGO_UPLOAD_DIR"] = configured

    def test_uuid_collision_does_not_overwrite_an_existing_logo(self):
        first = self.upload().get_json()["logo_url"]
        opaque = first.rsplit("/", 1)[1].removesuffix(".png")
        before = self.file(first).read_bytes()
        with patch("src.company_logo_storage.uuid.uuid4", return_value=type("FixedUUID", (), {"hex": opaque})()):
            self.assertEqual(self.upload(image_bytes("PNG", (20, 20))).status_code, 500)
        self.assertEqual(self.file(first).read_bytes(), before)
        self.assertFalse(list(self.file(first).parent.glob(".*.tmp")))

    def test_atomic_storage_and_commit_failures_leave_previous_override_intact(self):
        first = self.upload().get_json()["logo_url"]
        for operation in ("os.link", "os.fsync"):
            with patch("src.company_logo_storage." + operation, side_effect=OSError("injected write failure")):
                self.assertEqual(self.upload().status_code, 500)
            with app.app_context():
                self.assertEqual(self.membership().logo_url, first)
            self.assertEqual(list(self.file(first).parent.glob("*.png")), [self.file(first)])
            self.assertFalse(list(self.file(first).parent.glob(".*.tmp")))
        with patch("src.routes.companies.db.session.commit", side_effect=RuntimeError("injected commit failure")):
            self.assertEqual(self.upload().status_code, 500)
            self.assertEqual(self.client.delete("/api/companies/logo", headers=self._headers(self.owner_token)).status_code, 500)
        with app.app_context():
            self.assertEqual(self.membership().logo_url, first)
        self.assertTrue(self.file(first).exists())
        self.assertEqual(len(list(self.file(first).parent.glob("*.png"))), 2)
        for orphan in self.file(first).parent.glob("*.png"):
            if orphan != self.file(first):
                self.assertEqual(self.client.get("/api/companies/logos/" + orphan.name, headers=self.HOST).status_code, 404)

    def test_regional_member_bool_contract_never_global_fallback_or_forged_input(self):
        job_id = self._job(title="Public member contract")
        with app.app_context():
            company = db.session.get(Company, self.company_id)
            company.is_member = True
            self.membership().is_member = False
            db.session.commit()
        response = self.client.put("/api/companies/", headers=self._headers(self.owner_token),
                                   json={"is_member": True, "company_is_member": True, "status": "approved"})
        self.assertEqual(response.status_code, 200)
        for endpoint, extract in ((f"/api/companies/{self.company_id}", lambda p: p["is_member"]),
                                  ("/api/companies/by-slug/wave-4-company-br", lambda p: p["is_member"]),
                                  ("/api/companies/search", lambda p: next(c["is_member"] for c in p["companies"] if c["id"] == self.company_id)),
                                  (f"/api/jobs/{job_id}", lambda p: p["company_is_member"])):
            public_response = self.client.get(endpoint, headers=self.HOST)
            self.assertIs(extract(public_response.get_json()), False)
            if endpoint.startswith("/api/companies/"):
                self.assertEqual(public_response.headers["Cache-Control"], "no-store")
        with app.app_context():
            self.membership().is_member = True
            db.session.commit()
            job = db.session.get(Job, job_id)
            for details in (False, True):
                self.assertIs(job.to_dict(include_details=details)["company_is_member"], True)
            self.assertIs(job.company.to_public_dict(self.membership())["is_member"], True)
            with patch.object(CompanySite, "resolved_public_profile_slug", new_callable=PropertyMock,
                              return_value="wave-4-company-br") as resolved:
                self.assertIs(job.to_dict()["company_is_member"], True)
                self.assertEqual(resolved.call_count, 1)
                resolved.reset_mock()
                self.assertIs(job.to_dict(include_details=True)["company_is_member"], True)
                self.assertEqual(resolved.call_count, 2)

    def test_membership_hidden_pending_inactive_invalid_and_wrong_company_closed(self):
        job_id = self._job(title="Ineligible member")
        with app.app_context():
            job = db.session.get(Job, job_id)
            membership = self.membership()
            membership.is_member = True
            db.session.commit()
            for values in ({"status": "pending"}, {"public_profile_slug": None},
                           {"public_profile_slug": "Bad/Slug"}, {"public_profile_slug": "unreserved"},
                           {"public_profile_slug": "other-company-br"}, {"company_id": self.other_company_id}):
                with db.session.no_autoflush, patch.dict(membership.__dict__, values):
                    self.assertIs(job.to_dict()["company_is_member"], False)
                    self.assertIs(job.company.to_public_dict(membership)["is_member"], False)
            with db.session.no_autoflush, patch.dict(job.__dict__, {"is_company_hidden": True}):
                payload = job.to_dict(include_details=True)
                self.assertIs(payload["company_is_member"], False)
                self.assertIsNone(payload["company"])
                self.assertIsNone(payload["company_logo_url"])
            with db.session.no_autoflush, patch.dict(job.company.user.__dict__, {"is_active": False}):
                self.assertIs(job.to_dict()["company_is_member"], False)
                self.assertIs(job.company.to_public_dict(membership)["is_member"], False)
        mx_headers = self.add_mx()
        with app.test_request_context("/api/jobs/", headers=self.HOST):
            g.site = db.session.get(Site, self.mx_id)
            job = db.session.get(Job, job_id)
            self.assertIs(job.to_dict()["company_is_member"], False)
            self.assertIs(job.company.to_public_dict(self.membership())["is_member"], False)
        with app.app_context():
            membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.mx_id).one()
            membership.is_member = False
            db.session.commit()
        self.assertIs(self.client.get(f"/api/companies/{self.company_id}", headers=mx_headers).get_json()["is_member"], False)


if __name__ == "__main__":
    unittest.main()
