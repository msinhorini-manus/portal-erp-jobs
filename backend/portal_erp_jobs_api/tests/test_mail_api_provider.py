"""Contract tests for Portal ERP transactional mail; no main app, DB or network.

Run from backend/portal_erp_jobs_api:
    .venv/bin/python -m unittest discover -s tests -p test_mail_api_provider.py -v

All credentials, recipients and message links are fictional. The two mail API
origins below are the contract's allowlisted literals, never contacted here.
"""
from __future__ import annotations

import io
import json
import logging
import traceback
import unittest
from contextlib import ExitStack
from html import escape
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, OpenerDirector, Request

from flask import Flask

from src.services import email as email_service


BASE_URL = "https://links.portalerp.com"
TOKEN = "mail_" + "0123456789abcdef" * 3
RECIPIENT = "destinatario@example.invalid"
RESET_TOKEN = "fictitious-reset-token-20261118"
INVITATION_TOKEN = "fictitious-invitation-token-20261118"
RESET_URL = f"https://jobs-ar.example.invalid/ar/redefinir-senha?token={RESET_TOKEN}&locale=es-AR"
INVITATION_URL = f"https://jobs-br.example.invalid/br/convites/{INVITATION_TOKEN}?locale=pt-BR&source=test"
MAX_RESPONSE_BYTES = 64 * 1024
MAX_HTML_BYTES = 2 * 1024 * 1024


class FakeResponse:
    """Small HTTP response double that records bounded read requests."""

    def __init__(self, *, status=201, body=None, read_error=None):
        self.status = status
        self.code = status
        self.body = (
            json.dumps({"success": True, "id": 123, "status": "PENDENTE"}).encode("utf-8")
            if body is None else body
        )
        self.read_error = read_error
        self.read_sizes = []
        self.closed = False
        self._stream = io.BytesIO(self.body)

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()
        return False

    def getcode(self):
        return self.status

    def read(self, size=-1):
        self.read_sizes.append(size)
        if self.read_error is not None:
            raise self.read_error
        return self._stream.read(size)

    def close(self):
        self.closed = True


class MailApiProviderTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask("isolated-mail-api-contract-tests")
        self.app.config.update(
            TESTING=True,
            EMAIL_PROVIDER="portal_erp_api",
            MAIL_API_BASE_URL=BASE_URL,
            MAIL_API_TOKEN=TOKEN,
            MAIL_API_TIMEOUT_SECONDS=10,
            MAIL_API_SENSITIVE_LINKS_APPROVED=True,
        )
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(self.app.app_context())
        # Defense in depth: a missed transport mock must fail, not touch a host.
        self.stack.enter_context(patch("socket.create_connection", side_effect=AssertionError("Network forbidden in mail tests")))
        self.stack.enter_context(patch("socket.socket.connect", side_effect=AssertionError("Network forbidden in mail tests")))
        self.stack.enter_context(patch("urllib.request.urlopen", side_effect=AssertionError("urlopen forbidden in mail tests")))
        if hasattr(email_service, "urlopen"):
            self.stack.enter_context(patch.object(email_service, "urlopen", side_effect=AssertionError("urlopen forbidden in mail tests")))
        self.smtp = self.stack.enter_context(patch.object(email_service, "_send_smtp", side_effect=AssertionError("SMTP fallback forbidden")))
        self.resend = self.stack.enter_context(patch.object(email_service, "_send_resend", side_effect=AssertionError("Resend fallback forbidden")))

    def _send(self, **overrides):
        values = {
            "recipient": RECIPIENT,
            "subject": "Mensagem de teste — São Paulo",
            "text": "Texto local de teste, não enviado ao endpoint HTML.",
            "html": "<p>Olá, equipe fictícia! Ação e inovação.</p>",
        }
        values.update(overrides)
        return email_service.send_transactional_email(**values)

    def _payload(self, opener):
        request = opener.call_args.args[0]
        self.assertIsInstance(request, Request)
        self.assertIsInstance(request.data, bytes)
        return request, json.loads(request.data.decode("utf-8"))

    def _assert_no_fallback(self):
        self.smtp.assert_not_called()
        self.resend.assert_not_called()

    def _assert_rejected_before_transport(self, **values):
        with patch.object(email_service, "_open_mail_api_request") as opener:
            with self.assertRaises(email_service.EmailDeliveryUnavailable) as caught:
                self._send(**values)
            self.assertNotIsInstance(caught.exception, email_service.EmailAcceptanceUnknown)
            opener.assert_not_called()
            self._assert_no_fallback()

    def _assert_failure(self, *, response=None, error=None, unknown=False):
        with patch.object(email_service, "_open_mail_api_request", return_value=response, side_effect=error) as opener:
            with self.assertRaises(email_service.EmailDeliveryUnavailable) as caught:
                self._send()
            if unknown is True:
                self.assertIsInstance(caught.exception, email_service.EmailAcceptanceUnknown)
            elif unknown is False:
                self.assertNotIsInstance(caught.exception, email_service.EmailAcceptanceUnknown)
            opener.assert_called_once()
            self._assert_no_fallback()
            self.assertIsNone(caught.exception.__cause__)
            self.assertTrue(caught.exception.__context__ is None or caught.exception.__suppress_context__)
            return caught.exception

    def test_provider_configured_without_email_from(self):
        self.assertNotIn("EMAIL_FROM", self.app.config)
        self.assertEqual(email_service.configured_email_provider(), "portal_erp_api")
        self.app.config["EMAIL_FROM"] = ""
        self.assertEqual(email_service.configured_email_provider(), "portal_erp_api")

    def test_allowlisted_https_origins_and_timeout_boundaries(self):
        for base in (BASE_URL, BASE_URL + "/", BASE_URL + ":443", "https://www.perpbr.com", "https://www.perpbr.com:443/"):
            for timeout in (1, 1.5, 10, 30):
                with self.subTest(base=base, timeout=timeout):
                    self.app.config.update(MAIL_API_BASE_URL=base, MAIL_API_TIMEOUT_SECONDS=timeout)
                    self.assertEqual(email_service.configured_email_provider(), "portal_erp_api")

    def test_invalid_api_base_is_not_configured(self):
        invalid = (
            None, "", "http://links.portalerp.com", "//links.portalerp.com",
            "https://mail.example.invalid", "https://links.portalerp.com.example.invalid",
            "https://example.invalid@links.portalerp.com", "https://user:pass@links.portalerp.com",
            "https://links.portalerp.com@evil.example.invalid", "https://links.portalerp.com:80",
            "https://links.portalerp.com:444", "https://links.portalerp.com:bogus",
            "https://links.portalerp.com/api", "https://links.portalerp.com//",
            "https://links.portalerp.com/?debug=1", "https://links.portalerp.com/#section",
            "https://links.portalerp.com/../", "https://links.portalerp.com\\@evil.example.invalid",
            "https://127.0.0.1", "https://[::1]", "https://links.portalerp.com\n.example.invalid",
        )
        for base in invalid:
            with self.subTest(base=base):
                self.app.config["MAIL_API_BASE_URL"] = base
                self.assertIsNone(email_service.configured_email_provider())

    def test_invalid_token_is_not_configured(self):
        for token in (None, "", "mail_" + "a" * 47, "mail_" + "a" * 49,
                      "mail_" + "A" * 48, "mail_" + "g" * 48, "mail_" + "á" * 48,
                      "bearer_" + "a" * 48, "mail_" + "a" * 48 + "\n", 123, True):
            with self.subTest(token_type=type(token).__name__, token_length=len(str(token))):
                self.app.config["MAIL_API_TOKEN"] = token
                self.assertIsNone(email_service.configured_email_provider())

    def test_invalid_timeout_is_not_configured(self):
        for timeout in (None, "", "not-a-number", 0, -1, 0.99, 30.01, 31,
                        float("nan"), float("inf"), float("-inf"), True, False, [], {}):
            with self.subTest(timeout=repr(timeout)):
                self.app.config["MAIL_API_TIMEOUT_SECONDS"] = timeout
                self.assertIsNone(email_service.configured_email_provider())

    def test_missing_each_required_config_prevents_send_without_fallback(self):
        for key in ("MAIL_API_BASE_URL", "MAIL_API_TOKEN"):
            with self.subTest(key=key):
                original = self.app.config.pop(key)
                try:
                    with patch.object(email_service, "_open_mail_api_request") as opener:
                        with self.assertRaises(email_service.EmailDeliveryUnavailable):
                            self._send()
                        opener.assert_not_called()
                        self._assert_no_fallback()
                finally:
                    self.app.config[key] = original

    def test_unknown_provider_never_falls_back(self):
        self.app.config.update(EMAIL_PROVIDER="unknown-test-provider", EMAIL_FROM="sender@example.invalid", SMTP_HOST="smtp.example.invalid", RESEND_API_KEY="fictitious-resend-key")
        self.assertIsNone(email_service.configured_email_provider())
        with patch.object(email_service, "_open_mail_api_request") as opener:
            with self.assertRaises(email_service.EmailDeliveryUnavailable):
                self._send()
            opener.assert_not_called()
        self._assert_no_fallback()

    def test_payload_unicode_authentication_headers_endpoint_and_return_none(self):
        html = "<p>Olá São Paulo — Gestão, ação e inovação 🌱</p>"
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            result = self._send(subject="Redefinição — Equipe Fictícia", html=html)
        self.assertIsNone(result)
        opener.assert_called_once()
        request, payload = self._payload(opener)
        self.assertEqual(request.full_url, BASE_URL + "/api/v1/enviar")
        self.assertEqual(request.get_method(), "POST")
        headers = {name.lower(): value for name, value in request.header_items()}
        self.assertEqual(headers["authorization"], f"Bearer {TOKEN}")
        self.assertEqual(headers["content-type"].split(";")[0], "application/json")
        self.assertEqual(opener.call_args.kwargs["timeout"], 10)
        self.assertEqual(payload, {"email": RECIPIENT, "assunto": "Redefinição — Equipe Fictícia", "mensagem": html})
        self._assert_no_fallback()

    def test_trailing_slash_normalizes_endpoint(self):
        self.app.config["MAIL_API_BASE_URL"] = BASE_URL + "/"
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send()
        self.assertEqual(opener.call_args.args[0].full_url, BASE_URL + "/api/v1/enviar")

    def test_configured_timeout_passed_once_to_transport(self):
        self.app.config["MAIL_API_TIMEOUT_SECONDS"] = 2.5
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send()
        self.assertEqual(opener.call_args.kwargs["timeout"], 2.5)
        opener.assert_called_once()

    def test_subject_crlf_normalized_to_spaces(self):
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send(subject="Teste\r\nX-Test: fictício\nContinuação\rFim")
        subject = self._payload(opener)[1]["assunto"]
        self.assertNotIn("\r", subject)
        self.assertNotIn("\n", subject)
        self.assertIn("Teste", subject)
        self.assertIn(" X-Test: fictício", subject)
        self.assertIn(" Continuação", subject)
        self.assertIn(" Fim", subject)

    def test_accepted_pending_and_sent_return_none(self):
        for status in ("PENDENTE", "ENVIADO"):
            with self.subTest(status=status):
                response = FakeResponse(body=json.dumps({"success": True, "id": 1, "status": status}).encode("utf-8"))
                with patch.object(email_service, "_open_mail_api_request", return_value=response) as opener:
                    self.assertIsNone(self._send())
                opener.assert_called_once()
                self._assert_no_fallback()

    def test_acceptance_unknown_is_delivery_unavailable_subclass(self):
        self.assertTrue(issubclass(email_service.EmailAcceptanceUnknown, email_service.EmailDeliveryUnavailable))

    def test_http_rejections_including_authentication_and_rate_limit(self):
        for status in (400, 401, 403, 404, 409, 422, 429):
            with self.subTest(status=status):
                error = HTTPError(BASE_URL + "/api/v1/enviar", status, "fictitious rejection", {}, io.BytesIO(b"not for logs"))
                self._assert_failure(error=error, unknown=False)

    def test_http_500_and_502_are_acceptance_unknown(self):
        for status in (500, 502):
            with self.subTest(status=status):
                error = HTTPError(BASE_URL + "/api/v1/enviar", status, "fictitious failure", {}, io.BytesIO(b"not for logs"))
                self._assert_failure(error=error, unknown=True)

    def test_response_object_rejections_match_http_error_classification(self):
        for status in (400, 401, 403, 422, 429, 500, 502):
            with self.subTest(status=status):
                self._assert_failure(response=FakeResponse(status=status), unknown=status in (500, 502))

    def test_redirects_are_rejected_without_second_request(self):
        for status in (301, 302, 303, 307, 308):
            with self.subTest(status=status):
                error = HTTPError(BASE_URL + "/api/v1/enviar", status, "redirect", {"Location": "https://redirect.example.invalid/steal"}, io.BytesIO())
                self._assert_failure(error=error)

    def test_redirect_response_is_not_success(self):
        for status in (301, 302, 303, 307, 308):
            with self.subTest(status=status):
                self._assert_failure(response=FakeResponse(status=status))

    def test_other_2xx_is_not_success(self):
        for status in (200, 202, 204, 206):
            with self.subTest(status=status):
                # Acceptance is not confirmed; the contract only mandates that
                # these statuses cannot be considered successful.
                self._assert_failure(response=FakeResponse(status=status), unknown=None)

    def test_timeout_urlerror_and_oserror_are_unknown_without_retry(self):
        for error in (TimeoutError("fictitious timeout"), URLError("fictitious network issue"), OSError("fictitious transport issue")):
            with self.subTest(error_type=type(error).__name__):
                self._assert_failure(error=error, unknown=True)

    def test_response_read_failure_is_acceptance_unknown(self):
        for error in (TimeoutError("fictitious read timeout"), URLError("fictitious read issue"), OSError("fictitious read failure")):
            with self.subTest(error_type=type(error).__name__):
                self._assert_failure(response=FakeResponse(read_error=error), unknown=True)

    def test_malformed_201_body_is_acceptance_unknown(self):
        for body in (b"", b"not-json", b"{", b"<html>upstream failure</html>", b"\xff", b'{"success":true} trailing'):
            with self.subTest(body_length=len(body)):
                self._assert_failure(response=FakeResponse(body=body), unknown=True)

    def test_201_non_dictionary_is_acceptance_unknown(self):
        for value in (None, [], [1], "success", True, 123):
            with self.subTest(value_type=type(value).__name__):
                self._assert_failure(response=FakeResponse(body=json.dumps(value).encode("utf-8")), unknown=True)

    def test_201_requires_literal_true(self):
        for value in (False, None, 1, "true", "True", [], {}):
            with self.subTest(value_type=type(value).__name__):
                body = json.dumps({"success": value, "id": 123, "status": "PENDENTE"}).encode("utf-8")
                self._assert_failure(response=FakeResponse(body=body), unknown=True)

    def test_201_requires_positive_integer_id_not_bool(self):
        for value in (True, False, 0, -1, 1.0, "123", None, [], {}):
            with self.subTest(value_type=type(value).__name__, value=repr(value)):
                body = json.dumps({"success": True, "id": value, "status": "PENDENTE"}).encode("utf-8")
                self._assert_failure(response=FakeResponse(body=body), unknown=True)

    def test_201_requires_known_uppercase_status(self):
        for value in (None, "", "pendente", "enviado", "ERRO", "CANCELADO", " PENDENTE ", True, 123):
            with self.subTest(value=repr(value)):
                body = json.dumps({"success": True, "id": 123, "status": value}).encode("utf-8")
                self._assert_failure(response=FakeResponse(body=body), unknown=True)

    def test_201_requires_all_acceptance_fields(self):
        for missing in ("success", "id", "status"):
            with self.subTest(missing=missing):
                value = {"success": True, "id": 123, "status": "PENDENTE"}
                value.pop(missing)
                self._assert_failure(response=FakeResponse(body=json.dumps(value).encode("utf-8")), unknown=True)

    def test_response_read_has_64kib_plus_one_bound(self):
        response = FakeResponse()
        with patch.object(email_service, "_open_mail_api_request", return_value=response):
            self._send()
        self.assertEqual(response.read_sizes, [MAX_RESPONSE_BYTES + 1])

    def test_response_exactly_64kib_accepted(self):
        body = FakeResponse().body
        response = FakeResponse(body=body + b" " * (MAX_RESPONSE_BYTES - len(body)))
        with patch.object(email_service, "_open_mail_api_request", return_value=response):
            self.assertIsNone(self._send())
        self.assertEqual(response.read_sizes, [MAX_RESPONSE_BYTES + 1])

    def test_response_larger_than_64kib_is_unknown(self):
        body = FakeResponse().body
        response = FakeResponse(body=body + b" " * (MAX_RESPONSE_BYTES + 100 - len(body)))
        self._assert_failure(response=response, unknown=True)
        self.assertEqual(response.read_sizes, [MAX_RESPONSE_BYTES + 1])

    def test_single_recipient_at_255_character_boundary(self):
        recipient = "a" * (255 - len("@example.invalid")) + "@example.invalid"
        self.assertEqual(len(recipient), 255)
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send(recipient=recipient)
        self.assertEqual(self._payload(opener)[1]["email"], recipient)

    def test_recipient_over_255_or_multiple_rejected_locally(self):
        for recipient in (
            "a" * (256 - len("@example.invalid")) + "@example.invalid",
            "one@example.invalid,two@example.invalid",
            "one@example.invalid;two@example.invalid",
            "one@example.invalid\r\nBcc: two@example.invalid",
            ["one@example.invalid", "two@example.invalid"],
        ):
            with self.subTest(recipient_type=type(recipient).__name__, recipient_length=len(recipient)):
                self._assert_rejected_before_transport(recipient=recipient)

    def test_recipient_ascii_controls_and_del_rejected_locally(self):
        for code in (*range(32), 127):
            with self.subTest(ascii_code=code):
                self._assert_rejected_before_transport(recipient=f"local{chr(code)}part@example.invalid")

    def test_subject_at_255_unicode_characters_accepted(self):
        subject = "á" * 255
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send(subject=subject)
        self.assertEqual(self._payload(opener)[1]["assunto"], subject)

    def test_subject_over_255_characters_rejected_locally(self):
        self._assert_rejected_before_transport(subject="á" * 256)

    def test_html_at_2mib_utf8_boundary_accepted(self):
        html = "á" * (MAX_HTML_BYTES // 2)
        self.assertEqual(len(html.encode("utf-8")), MAX_HTML_BYTES)
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self.assertIsNone(self._send(html=html))
        self.assertEqual(self._payload(opener)[1]["mensagem"], html)

    def test_html_utf8_byte_limit_not_character_limit(self):
        for html in ("a" * (MAX_HTML_BYTES + 1), "á" * (MAX_HTML_BYTES // 2 + 1)):
            with self.subTest(encoded_bytes=len(html.encode("utf-8"))):
                self._assert_rejected_before_transport(html=html)

    def test_unknown_double_braces_rejected_in_subject_or_html(self):
        for field in ("subject", "html"):
            for placeholder in ("{{unknown}}", "{{ reset_token }}", "{{invitation_url}}", "{{nome}}", "{{email}}"):
                with self.subTest(field=field, placeholder=placeholder):
                    self._assert_rejected_before_transport(**{field: "Teste " + placeholder})

    def test_local_tokens_and_single_braces_are_preserved(self):
        html = f'<p>{{texto literal}}</p><a href="{escape(RESET_URL, quote=True)}">Redefinir</a>'
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send(html=html)
        payload = self._payload(opener)[1]
        self.assertEqual(payload["mensagem"], html)
        self.assertIn(RESET_TOKEN, payload["mensagem"])

    def test_unknown_braces_in_unused_plain_text_do_not_reach_api(self):
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self._send(text="Texto alternativo local {{unused_plain_text}}")
        self.assertNotIn("unused_plain_text", opener.call_args.args[0].data.decode("utf-8"))

    def test_sensitive_links_require_literal_true_before_transport(self):
        calls = (
            (email_service.send_password_reset_email, {"recipient": RECIPIENT, "reset_url": RESET_URL, "site_name": "Portal Fictício"}),
            (email_service.send_company_invitation_email, {"recipient": RECIPIENT, "invitation_url": INVITATION_URL, "company_name": "Empresa Fictícia", "role": "viewer", "site_name": "Portal Fictício"}),
        )
        for approved in (False, None, "true", "false", 1, 0):
            self.app.config["MAIL_API_SENSITIVE_LINKS_APPROVED"] = approved
            for function, arguments in calls:
                with self.subTest(approved=repr(approved), wrapper=function.__name__):
                    with patch.object(email_service, "_open_mail_api_request") as opener:
                        with self.assertRaises(email_service.EmailDeliveryUnavailable) as caught:
                            function(**arguments)
                        self.assertNotIsInstance(caught.exception, email_service.EmailAcceptanceUnknown)
                        opener.assert_not_called()
                        self._assert_no_fallback()

    def test_missing_sensitive_approval_blocks_both_wrappers(self):
        self.app.config.pop("MAIL_API_SENSITIVE_LINKS_APPROVED")
        with patch.object(email_service, "_open_mail_api_request") as opener:
            with self.assertRaises(email_service.EmailDeliveryUnavailable):
                email_service.send_password_reset_email(recipient=RECIPIENT, reset_url=RESET_URL, site_name="Portal Fictício")
            with self.assertRaises(email_service.EmailDeliveryUnavailable):
                email_service.send_company_invitation_email(recipient=RECIPIENT, invitation_url=INVITATION_URL, company_name="Empresa Fictícia", role="viewer", site_name="Portal Fictício")
            opener.assert_not_called()
        self._assert_no_fallback()

    def test_unapproved_provider_remains_configured_for_nonsensitive_mail(self):
        self.app.config["MAIL_API_SENSITIVE_LINKS_APPROVED"] = False
        self.assertEqual(email_service.configured_email_provider(), "portal_erp_api")
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            self.assertIsNone(self._send())
        opener.assert_called_once()
        self._assert_no_fallback()

    def test_password_reset_routes_to_api_preserving_regional_link_and_token(self):
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            result = email_service.send_password_reset_email(recipient=RECIPIENT, reset_url=RESET_URL, site_name="Portal Fictício Argentina")
        self.assertIsNone(result)
        opener.assert_called_once()
        _, payload = self._payload(opener)
        self.assertEqual(payload["email"], RECIPIENT)
        self.assertIn("Redefinição de senha", payload["assunto"])
        self.assertIn(escape(RESET_URL, quote=True), payload["mensagem"])
        self.assertIn("/ar/redefinir-senha", payload["mensagem"])
        self.assertIn(RESET_TOKEN, payload["mensagem"])
        self.assertNotIn("{{", payload["mensagem"])
        self._assert_no_fallback()

    def test_password_reset_escapes_site_name_and_link_attribute(self):
        site_name = '<script>site fictício</script> & "Equipe"'
        reset_url = RESET_URL + '&label="fictício"'
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            email_service.send_password_reset_email(recipient=RECIPIENT, reset_url=reset_url, site_name=site_name)
        html = self._payload(opener)[1]["mensagem"]
        self.assertIn(escape(site_name), html)
        self.assertIn(f'href="{escape(reset_url, quote=True)}"', html)
        self.assertNotIn("<script>", html)
        self.assertNotIn('&label="fictício"', html)

    def test_company_invitation_routes_to_api_with_local_token_and_escapes(self):
        company_name = '<script>Empresa fictícia</script> & "Companhia"'
        role = 'gestor <admin> & "revisor"'
        site_name = 'Portal <Fictício> & "BR"'
        invitation_url = INVITATION_URL + '&label="fictício"'
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()) as opener:
            result = email_service.send_company_invitation_email(recipient=RECIPIENT, invitation_url=invitation_url, company_name=company_name, role=role, site_name=site_name)
        self.assertIsNone(result)
        opener.assert_called_once()
        _, payload = self._payload(opener)
        self.assertIn("Convite para a equipe", payload["assunto"])
        for value in (company_name, role, site_name):
            self.assertIn(escape(value), payload["mensagem"])
        self.assertIn(f'href="{escape(invitation_url, quote=True)}"', payload["mensagem"])
        self.assertIn(INVITATION_TOKEN, payload["mensagem"])
        self.assertNotIn("<script>", payload["mensagem"])
        self.assertNotIn("{{", payload["mensagem"])
        self.assertIn("72 horas", payload["mensagem"])
        self.assertNotIn("7 dias", payload["mensagem"])
        self._assert_no_fallback()

    def test_ambiguous_error_is_sanitized_in_exception_traceback_and_logs(self):
        secret_body = "fictitious-confidential-body-marker"
        subject = "fictitious-private-subject-marker"
        raw_message = f"{TOKEN} {RECIPIENT} {RESET_URL} {secret_body} {subject}"
        logs = []

        class Capture(logging.Handler):
            def emit(self, record):
                logs.append(self.format(record))

        handler = Capture()
        root = logging.getLogger()
        root.addHandler(handler)
        self.addCleanup(root.removeHandler, handler)
        with patch.object(email_service, "_open_mail_api_request", side_effect=URLError(raw_message)) as opener:
            with self.assertRaises(email_service.EmailAcceptanceUnknown) as caught:
                self._send(subject=subject, html=f'<p>{secret_body}</p><a href="{escape(RESET_URL, quote=True)}">Link</a>')
        opener.assert_called_once()
        rendered = "".join(traceback.format_exception(type(caught.exception), caught.exception, caught.exception.__traceback__))
        output = str(caught.exception) + repr(caught.exception) + rendered + "\n".join(logs)
        for forbidden in (TOKEN, RECIPIENT, RESET_URL, RESET_TOKEN, secret_body, subject):
            self.assertNotIn(forbidden, output)
        self.assertIsNone(caught.exception.__cause__)
        self.assertTrue(caught.exception.__context__ is None or caught.exception.__suppress_context__)
        self._assert_no_fallback()

    def test_invalid_response_and_http_error_body_not_disclosed(self):
        private_marker = f"{TOKEN} {RECIPIENT} {RESET_URL}"
        for response, error in (
            (FakeResponse(body=private_marker.encode("utf-8")), None),
            (None, HTTPError(BASE_URL + "/api/v1/enviar", 401, private_marker, {}, io.BytesIO(private_marker.encode("utf-8")))),
        ):
            with self.subTest(source="response" if response else "http_error"):
                exc = self._assert_failure(response=response, error=error, unknown=response is not None)
                for value in (TOKEN, RECIPIENT, RESET_URL):
                    self.assertNotIn(value, str(exc))
                    self.assertNotIn(value, repr(exc))

    def test_success_does_not_log_payload_secret_or_pii(self):
        with patch.object(email_service, "_open_mail_api_request", return_value=FakeResponse()):
            with patch.object(logging.Logger, "_log") as logger:
                self._send(html=f'<a href="{escape(RESET_URL, quote=True)}">fictitious-private-body</a>')
        output = repr(logger.call_args_list)
        for value in (TOKEN, RECIPIENT, RESET_TOKEN, "fictitious-private-body"):
            self.assertNotIn(value, output)

    def test_helper_constructs_opener_with_no_redirect_policy(self):
        """Exercise helper construction only; OpenerDirector.open is mocked."""
        request = Request(BASE_URL + "/api/v1/enviar", data=b"{}", method="POST")
        captured = []
        response = FakeResponse()

        def fake_open(opener, req, *args, **kwargs):
            captured.append((opener, req, args, kwargs))
            return response

        with patch.object(OpenerDirector, "open", autospec=True, side_effect=fake_open):
            self.assertIs(email_service._open_mail_api_request(request, timeout=10), response)
        self.assertEqual(len(captured), 1)
        opener, actual_request, args, kwargs = captured[0]
        self.assertIs(actual_request, request)
        self.assertEqual(kwargs.get("timeout", args[-1] if args else None), 10)
        handlers = [handler for handler in opener.handlers if isinstance(handler, HTTPRedirectHandler)]
        # No redirect handler at all is safe, as is an explicit deny handler.
        for handler in handlers:
            for status in (301, 302, 303, 307, 308):
                with self.subTest(status=status, handler=type(handler).__name__):
                    try:
                        redirected = handler.redirect_request(request, response, status, "redirect", {}, "https://redirect.example.invalid/steal")
                    except HTTPError:
                        continue
                    self.assertIsNone(redirected, "Mail API opener must not follow redirects or forward bearer tokens")

    def test_smtp_and_resend_configurations_still_require_sender(self):
        for provider, config in (("smtp", {"SMTP_HOST": "smtp.example.invalid"}), ("resend", {"RESEND_API_KEY": "fictitious-resend-key"})):
            with self.subTest(provider=provider):
                self.app.config.update(EMAIL_PROVIDER=provider, EMAIL_FROM="", **config)
                self.assertIsNone(email_service.configured_email_provider())
                self.app.config["EMAIL_FROM"] = "sender@example.invalid"
                self.assertEqual(email_service.configured_email_provider(), provider)

    def test_existing_smtp_and_resend_routing_preserved(self):
        values = {"recipient": RECIPIENT, "subject": "Teste legado", "text": "Texto legado", "html": "<p>Legado</p>"}
        self.smtp.side_effect = None
        self.resend.side_effect = None
        for provider, config in (("smtp", {"SMTP_HOST": "smtp.example.invalid"}), ("resend", {"RESEND_API_KEY": "fictitious-resend-key"})):
            with self.subTest(provider=provider):
                self.smtp.reset_mock()
                self.resend.reset_mock()
                self.app.config.update(EMAIL_PROVIDER=provider, EMAIL_FROM="sender@example.invalid", **config)
                with patch.object(email_service, "_open_mail_api_request") as opener:
                    self.assertIsNone(email_service.send_transactional_email(**values))
                    opener.assert_not_called()
                selected = self.smtp if provider == "smtp" else self.resend
                other = self.resend if provider == "smtp" else self.smtp
                selected.assert_called_once_with(**values)
                other.assert_not_called()

    def test_sensitive_approval_gate_does_not_change_smtp_or_resend_wrappers(self):
        self.app.config["MAIL_API_SENSITIVE_LINKS_APPROVED"] = False
        self.smtp.side_effect = None
        self.resend.side_effect = None
        for provider, config in (("smtp", {"SMTP_HOST": "smtp.example.invalid"}), ("resend", {"RESEND_API_KEY": "fictitious-resend-key"})):
            with self.subTest(provider=provider):
                self.smtp.reset_mock()
                self.resend.reset_mock()
                self.app.config.update(EMAIL_PROVIDER=provider, EMAIL_FROM="sender@example.invalid", **config)
                with patch.object(email_service, "_open_mail_api_request") as opener:
                    self.assertIsNone(email_service.send_password_reset_email(recipient=RECIPIENT, reset_url=RESET_URL, site_name="Portal Fictício"))
                    self.assertIsNone(email_service.send_company_invitation_email(recipient=RECIPIENT, invitation_url=INVITATION_URL, company_name="Empresa Fictícia", role="viewer", site_name="Portal Fictício"))
                    opener.assert_not_called()
                selected = self.smtp if provider == "smtp" else self.resend
                other = self.resend if provider == "smtp" else self.smtp
                self.assertEqual(selected.call_count, 2)
                other.assert_not_called()


if __name__ == "__main__":
    unittest.main()
