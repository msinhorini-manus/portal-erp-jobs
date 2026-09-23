import atexit
import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch

from flask_jwt_extended import create_access_token

fd, database_path = tempfile.mkstemp(prefix="portal-erp-jobs-resume-wave4-", suffix=".db")
os.close(fd)
atexit.register(lambda: os.path.exists(database_path) and os.unlink(database_path))

os.environ["SECRET_KEY"] = "test-secret-key-that-is-longer-than-thirty-two-characters"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-that-is-longer-than-thirty-two-characters"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path}"
os.environ["CORS_ORIGINS"] = "https://jobs.portalerp.com.br"
os.environ["ALLOW_ADMIN_SETUP"] = "false"
os.environ["FLASK_ENV"] = "testing"

from src.config import db  # noqa: E402
from src.main import app  # noqa: E402
from src.models.candidate import Candidate, CandidateSite  # noqa: E402
from src.models.experience import Experience  # noqa: E402
from src.models.session_family import SessionFamily  # noqa: E402
from src.models.site import Site, SiteDomain  # noqa: E402
from src.models.user import User  # noqa: E402


class ResumeWaveFourTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()
        with app.app_context():
            db.create_all()
            site = Site(
                code="BR",
                name="Brasil",
                country_code="BR",
                default_locale="pt-BR",
                currency_code="BRL",
                timezone="America/Sao_Paulo",
                canonical_origin="https://jobs.portalerp.com.br",
                is_active=True,
            )
            site.domains.append(SiteDomain(
                hostname="jobs.portalerp.com.br",
                is_primary=True,
                is_active=True,
            ))
            db.session.add(site)
            db.session.flush()
            for index in (1, 2):
                user = User(
                    email=f"resume-owner-{index}@example.com",
                    user_type="candidate",
                    is_active=True,
                )
                user.set_password("ValidPassword123")
                db.session.add(user)
                db.session.flush()
                candidate = Candidate(
                    user_id=user.id,
                    first_name=f"Pessoa{index}",
                    last_name="Currículo",
                    professional_summary=f"Resumo preservado {index}",
                )
                db.session.add(candidate)
                db.session.flush()
                db.session.add(CandidateSite(
                    candidate_id=candidate.id,
                    site_id=site.id,
                    is_active=True,
                    is_discoverable=False,
                ))
            db.session.commit()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        with app.app_context():
            SessionFamily.query.delete()
            for candidate in Candidate.query.all():
                candidate.professional_summary = f"Resumo preservado {candidate.id}"
            for membership in CandidateSite.query.all():
                membership.is_active = True
                membership.is_discoverable = False
            for model in (
                db.Model.metadata.tables["experiences"],
                db.Model.metadata.tables["educations"],
                db.Model.metadata.tables["candidate_skills"],
                db.Model.metadata.tables["certifications"],
                db.Model.metadata.tables["projects"],
                db.Model.metadata.tables["languages"],
            ):
                db.session.execute(model.delete())
            db.session.commit()

    def _token(self, user_index=1):
        with app.app_context():
            site = Site.query.filter_by(code="BR").one()
            user = User.query.filter_by(email=f"resume-owner-{user_index}@example.com").one()
            family_id = str(uuid.uuid4())
            claims = {
                "user_type": "candidate",
                "site_id": site.id,
                "site_code": site.code,
                "candidate_id": user.candidate.id,
                "family_id": family_id,
            }
            db.session.add(SessionFamily(
                user_id=user.id,
                site_id=site.id,
                family_id=family_id,
                current_refresh_jti=str(uuid.uuid4()),
                expires_at=datetime.utcnow() + timedelta(days=1),
            ))
            token = create_access_token(identity=str(user.id), additional_claims=claims)
            db.session.commit()
            return token

    @staticmethod
    def _headers(token):
        return {"Authorization": f"Bearer {token}", "Host": "jobs.portalerp.com.br"}

    def _request(self, method, path, token, payload=None):
        return getattr(self.client, method)(path, json=payload, headers=self._headers(token))

    def _assert_crud(self, section, response_key, create_payload, update_payload, changed_field, changed_value):
        token = self._token()
        created = self._request("post", f"/api/resume/{section}", token, create_payload)
        self.assertEqual(created.status_code, 201, created.get_json())
        created_item = created.get_json()[response_key]
        self.assertIsInstance(created_item["id"], int)
        item_id = created_item["id"]

        listed = self._request("get", f"/api/resume/{section}", token)
        self.assertEqual(listed.status_code, 200, listed.get_json())
        self.assertEqual([item["id"] for item in listed.get_json()[section]], [item_id])

        updated = self._request("put", f"/api/resume/{section}/{item_id}", token, update_payload)
        self.assertEqual(updated.status_code, 200, updated.get_json())
        self.assertEqual(updated.get_json()[response_key]["id"], item_id)
        self.assertEqual(updated.get_json()[response_key][changed_field], changed_value)

        deleted = self._request("delete", f"/api/resume/{section}/{item_id}", token)
        self.assertEqual(deleted.status_code, 200, deleted.get_json())
        listed = self._request("get", f"/api/resume/{section}", token)
        self.assertEqual(listed.get_json()[section], [])

    def test_complete_resume_is_symmetric_and_partial_put_preserves_summary(self):
        token = self._token()
        initial = self._request("get", "/api/resume/complete", token)
        self.assertEqual(initial.status_code, 200, initial.get_json())
        original_summary = initial.get_json()["candidate"]["professional_summary"]
        self.assertTrue(original_summary)

        changed = self._request("put", "/api/resume/complete", token, {
            "first_name": "Nome",
            "last_name": "Atualizado",
            "phone": "+55 11 99999-9999",
            "city": "São Paulo",
            "state": "SP",
            "country": "Brasil",
            "linkedin_url": "https://www.linkedin.com/in/teste",
            "github_url": "https://github.com/teste",
            "portfolio_url": "https://portfolio.example.com",
        })
        self.assertEqual(changed.status_code, 200, changed.get_json())
        self.assertEqual(changed.get_json()["candidate"]["professional_summary"], original_summary)

        reloaded = self._request("get", "/api/resume/complete", token)
        self.assertEqual(reloaded.get_json()["candidate"]["professional_summary"], original_summary)
        self.assertEqual(reloaded.get_json()["candidate"]["first_name"], "Nome")

    def test_experience_full_crud(self):
        self._assert_crud(
            "experiences", "experience",
            {
                "job_title": "Analista ERP", "company_name": "Empresa A", "city": "São Paulo",
                "state": "SP", "country": "Brasil", "start_date": "2024-01-01",
                "end_date": "2025-01-01", "is_current_job": False, "description": "Implantação",
            },
            {"job_title": "Consultora ERP", "end_date": None, "is_current_job": True},
            "job_title", "Consultora ERP",
        )

    def test_education_full_crud(self):
        self._assert_crud(
            "educations", "education",
            {
                "degree_name": "Bacharelado", "major": "Sistemas", "institution_name": "Universidade ERP",
                "start_date": "2020-01-01", "completion_date": "2024-12-01", "grade": "9,0",
            },
            {"major": "Sistemas de Informação"},
            "major", "Sistemas de Informação",
        )

    def test_skill_full_crud_and_duplicate_rejected(self):
        token = self._token()
        created = self._request("post", "/api/resume/skills", token, {
            "name": "Python Wave4", "category": "language", "proficiency_level": 3,
        })
        self.assertEqual(created.status_code, 201, created.get_json())
        item_id = created.get_json()["skill"]["id"]
        duplicate = self._request("post", "/api/resume/skills", token, {
            "name": "Python Wave4", "proficiency_level": 2,
        })
        self.assertEqual(duplicate.status_code, 409, duplicate.get_json())
        updated = self._request("put", f"/api/resume/skills/{item_id}", token, {
            "name": "Python Wave4 Avançado", "proficiency_level": 4,
        })
        self.assertEqual(updated.status_code, 200, updated.get_json())
        self.assertEqual(updated.get_json()["skill"]["id"], item_id)
        self.assertEqual(updated.get_json()["skill"]["skill_name"], "Python Wave4 Avançado")
        self.assertEqual(updated.get_json()["skill"]["proficiency_level"], 4)
        deleted = self._request("delete", f"/api/resume/skills/{item_id}", token)
        self.assertEqual(deleted.status_code, 200, deleted.get_json())
        self.assertEqual(self._request("get", "/api/resume/skills", token).get_json()["skills"], [])

    def test_certification_full_crud(self):
        self._assert_crud(
            "certifications", "certification",
            {
                "name": "ERP Certified", "issuing_organization": "Portal ERP",
                "issue_date": "2025-01-01", "expiration_date": "2027-01-01",
                "credential_id": "SAFE-ID", "credential_url": "https://cert.example.com/id",
                "description": "Certificação profissional",
            },
            {"credential_url": "https://cert.example.com/updated"},
            "credential_url", "https://cert.example.com/updated",
        )

    def test_project_full_crud(self):
        self._assert_crud(
            "projects", "project",
            {
                "name": "Projeto ERP", "description": "Integração completa", "role": "Líder",
                "technologies": "Python, React", "start_date": "2024-02-01", "end_date": "2025-02-01",
                "is_current": False, "project_url": "https://project.example.com",
                "repository_url": "https://github.com/example/project",
            },
            {"description": "Integração atualizada", "end_date": None, "is_current": True},
            "description", "Integração atualizada",
        )

    def test_language_full_crud(self):
        self._assert_crud(
            "languages", "language",
            {
                "name": "Inglês", "proficiency": "Avançado", "can_read": True,
                "can_write": True, "can_speak": True, "can_listen": True,
            },
            {"proficiency": "Fluente", "can_write": False},
            "proficiency", "Fluente",
        )

    def test_validation_rejects_json_types_limits_urls_dates_and_booleans(self):
        token = self._token()
        cases = (
            ("post", "/api/resume/experiences", ["not", "object"], 400),
            ("post", "/api/resume/experiences", {"job_title": 10, "company_name": "Empresa"}, 422),
            ("post", "/api/resume/experiences", {"job_title": "A" * 201, "company_name": "Empresa"}, 422),
            ("post", "/api/resume/experiences", {"job_title": "Cargo", "company_name": "Empresa", "start_date": "2026-02"}, 422),
            ("post", "/api/resume/experiences", {"job_title": "Cargo", "company_name": "Empresa", "start_date": "2026-2-01"}, 422),
            ("post", "/api/resume/experiences", {"job_title": "Cargo", "company_name": "Empresa", "start_date": "2026-02-31"}, 422),
            ("post", "/api/resume/experiences", {"job_title": "Cargo", "company_name": "Empresa", "start_date": "2026-02-01", "end_date": "2026-01-01"}, 422),
            ("post", "/api/resume/experiences", {"job_title": "Cargo", "company_name": "Empresa", "is_current_job": "false"}, 422),
            ("post", "/api/resume/certifications", {"name": "Cert", "issuing_organization": "Org", "credential_url": "javascript:alert(1)"}, 422),
            ("post", "/api/resume/projects", {"name": "Projeto", "description": "Descrição", "url": "https://alias.invalid"}, 422),
            ("post", "/api/resume/languages", {"name": "Inglês", "proficiency": "quase bom"}, 422),
            ("post", "/api/resume/skills", {"name": "Skill inválida", "proficiency_level": 9}, 422),
            ("put", "/api/resume/complete", {"first_name": "Nome", "professional_summary": "X" * 1501}, 422),
        )
        for method, path, payload, status in cases:
            with self.subTest(path=path, payload=payload):
                response = self._request(method, path, token, payload)
                self.assertEqual(response.status_code, status, response.get_json())

    def test_ownership_blocks_other_candidate_read_update_and_delete_by_id(self):
        owner_token = self._token(1)
        other_token = self._token(2)
        created = self._request("post", "/api/resume/experiences", owner_token, {
            "job_title": "Privado", "company_name": "Segredo Ltda",
        })
        item_id = created.get_json()["experience"]["id"]
        listed = self._request("get", "/api/resume/experiences", other_token)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.get_json()["experiences"], [])
        updated = self._request("put", f"/api/resume/experiences/{item_id}", other_token, {"job_title": "Ataque"})
        deleted = self._request("delete", f"/api/resume/experiences/{item_id}", other_token)
        self.assertEqual(updated.status_code, 404)
        self.assertEqual(deleted.status_code, 404)
        with app.app_context():
            self.assertEqual(db.session.get(Experience, item_id).job_title, "Privado")

    def test_privacy_accepts_only_literal_json_booleans(self):
        token = self._token()
        enabled = self._request("patch", "/api/candidates/me/privacy", token, {"curriculo_publico": True})
        self.assertEqual(enabled.status_code, 200, enabled.get_json())
        self.assertIs(enabled.get_json()["curriculo_publico"], True)
        for value in ("false", 0, 1, None, {}, []):
            with self.subTest(value=value):
                response = self._request("patch", "/api/candidates/me/privacy", token, {"curriculo_publico": value})
                self.assertIn(response.status_code, (400, 422), response.get_json())
        still_enabled = self._request("get", "/api/candidates/me/privacy", token)
        self.assertIs(still_enabled.get_json()["curriculo_publico"], True)
        disabled = self._request("patch", "/api/candidates/me/privacy", token, {"is_discoverable": False})
        self.assertEqual(disabled.status_code, 200, disabled.get_json())
        self.assertIs(disabled.get_json()["is_discoverable"], False)

    def test_internal_error_response_does_not_echo_pii(self):
        token = self._token()
        pii = "private.person@example.com +55-11-99999-9999 SUMMARY-SECRET"
        with patch("src.routes.resume.db.session.commit", side_effect=RuntimeError(pii)):
            response = self._request("post", "/api/resume/experiences", token, {
                "job_title": "Cargo", "company_name": pii,
            })
        self.assertEqual(response.status_code, 500, response.get_json())
        body = response.get_data(as_text=True)
        self.assertNotIn("private.person@example.com", body)
        self.assertNotIn("99999", body)
        self.assertNotIn("SUMMARY-SECRET", body)
        self.assertNotIn("RuntimeError", body)


if __name__ == "__main__":
    unittest.main()
