"""Transactional email transports; provider acceptance is not inbox delivery."""
from __future__ import annotations

import json
import math
import re
from html import escape
from http.client import HTTPException
import smtplib
import ssl
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener, urlopen

from flask import current_app


class EmailDeliveryUnavailable(RuntimeError):
    """Raised when no provider is configured or submission fails."""


class EmailAcceptanceUnknown(EmailDeliveryUnavailable):
    """A message may have been accepted: do not automatically repeat it."""


_MAIL_API_HOSTS = frozenset({"links.portalerp.com", "www.perpbr.com"})
_MAIL_HTML_LIMIT = 2 * 1024 * 1024
_MAIL_RESPONSE_LIMIT = 64 * 1024


def _mail_api_settings() -> tuple[str, str, float] | None:
    """Accept only the HTTPS origins explicitly supplied for this integration."""
    base = str(current_app.config.get("MAIL_API_BASE_URL", "")).strip()
    token = str(current_app.config.get("MAIL_API_TOKEN", ""))
    try:
        parsed = urlsplit(base)
        raw_timeout = current_app.config.get("MAIL_API_TIMEOUT_SECONDS", 10)
        if isinstance(raw_timeout, bool):
            return None
        timeout = float(raw_timeout)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in _MAIL_API_HOSTS
            or parsed.port not in (None, 443)
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment
            or "?" in base or "#" in base
            or not re.fullmatch(r"mail_[0-9a-f]{48}", token)
            or not math.isfinite(timeout) or not 1 <= timeout <= 30
        ):
            return None
    except (ValueError, TypeError):
        return None
    return f"https://{parsed.hostname}", token, timeout


def configured_email_provider() -> str | None:
    """Return a fully configured provider name, otherwise ``None``."""
    provider = str(current_app.config.get("EMAIL_PROVIDER", "")).strip().lower()
    if provider == "portal_erp_api":
        return provider if _mail_api_settings() else None
    sender = str(current_app.config.get("EMAIL_FROM", "")).strip()
    if provider == "smtp" and sender and current_app.config.get("SMTP_HOST"):
        return provider
    if provider == "resend" and sender and current_app.config.get("RESEND_API_KEY"):
        return provider
    return None


def email_transport_allows_sensitive_links() -> bool:
    return (configured_email_provider() != "portal_erp_api"
            or current_app.config.get("MAIL_API_SENSITIVE_LINKS_APPROVED") is True)


def _require_sensitive_transport_approval() -> None:
    if not email_transport_allows_sensitive_links():
        raise EmailDeliveryUnavailable("Transporte de links sensíveis ainda não aprovado")


def send_password_reset_email(*, recipient: str, reset_url: str, site_name: str) -> None:
    """Send a PT-BR password reset message through the configured provider."""
    provider = configured_email_provider()
    if provider is None:
        raise EmailDeliveryUnavailable("Provedor de e-mail não configurado")
    _require_sensitive_transport_approval()
    subject = f"Redefinição de senha — {site_name}"
    text = (
        f"Recebemos uma solicitação para redefinir sua senha no {site_name}.\n\n"
        f"Use este link em até 1 hora:\n{reset_url}\n\n"
        "Se você não solicitou a alteração, ignore esta mensagem."
    )
    html = (
        f"<p>Recebemos uma solicitação para redefinir sua senha no {escape(site_name)}.</p>"
        f'<p><a href="{escape(reset_url, quote=True)}">Redefinir minha senha</a></p>'
        "<p>O link expira em 1 hora. Se você não solicitou a alteração, ignore esta mensagem.</p>"
    )
    send_transactional_email(recipient=recipient, subject=subject, text=text, html=html)


def send_company_invitation_email(*, recipient: str, invitation_url: str, company_name: str, role: str, site_name: str) -> None:
    """Send a company-team invitation without embedding credentials."""
    _require_sensitive_transport_approval()
    subject = f"Convite para a equipe {company_name} — {site_name}"
    text = (
        f"Você foi convidado para participar da equipe {company_name} no {site_name} "
        f"com o papel {role}.\n\nAceite o convite em até 72 horas:\n{invitation_url}\n\n"
        "Se você não esperava este convite, ignore esta mensagem."
    )
    html = (
        f"<p>Você foi convidado para participar da equipe <strong>{escape(company_name)}</strong> "
        f"no {escape(site_name)} com o papel <strong>{escape(role)}</strong>.</p>"
        f'<p><a href="{escape(invitation_url, quote=True)}">Aceitar convite</a></p>'
        "<p>O link expira em 72 horas. Se você não esperava este convite, ignore esta mensagem.</p>"
    )
    send_transactional_email(recipient=recipient, subject=subject, text=text, html=html)


def send_transactional_email(*, recipient: str, subject: str, text: str, html: str) -> None:
    """Submit once to the selected provider, never fallback after ambiguity."""
    provider = configured_email_provider()
    if provider is None:
        raise EmailDeliveryUnavailable("Provedor de e-mail não configurado")
    if provider == "smtp":
        _send_smtp(recipient=recipient, subject=subject, text=text, html=html)
    elif provider == "resend":
        _send_resend(recipient=recipient, subject=subject, text=text, html=html)
    elif provider == "portal_erp_api":
        _send_portal_erp_api(recipient=recipient, subject=subject, text=text, html=html)


def _send_smtp(*, recipient: str, subject: str, text: str, html: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["EMAIL_FROM"]
    message["To"] = recipient
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    host = current_app.config["SMTP_HOST"]
    port = int(current_app.config.get("SMTP_PORT", 587))
    username = current_app.config.get("SMTP_USERNAME")
    password = current_app.config.get("SMTP_PASSWORD")
    use_tls = bool(current_app.config.get("SMTP_USE_TLS", True))
    use_ssl = bool(current_app.config.get("SMTP_USE_SSL", False))
    try:
        client_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with client_class(host, port, timeout=10) as smtp:
            if use_tls and not use_ssl:
                smtp.starttls(context=ssl.create_default_context())
            if username:
                smtp.login(username, password or "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryUnavailable("Falha no envio SMTP") from exc


def _send_resend(*, recipient: str, subject: str, text: str, html: str) -> None:
    payload = json.dumps({"from": current_app.config["EMAIL_FROM"], "to": [recipient],
                          "subject": subject, "text": text, "html": html}).encode("utf-8")
    request = Request("https://api.resend.com/emails", data=payload, method="POST", headers={
        "Authorization": f"Bearer {current_app.config['RESEND_API_KEY']}",
        "Content-Type": "application/json", "User-Agent": "PortalERPJobs/1.0",
    })
    try:
        with urlopen(request, timeout=10) as response:
            if response.status < 200 or response.status >= 300:
                raise EmailDeliveryUnavailable("Falha no envio Resend")
    except (HTTPError, URLError, OSError) as exc:
        raise EmailDeliveryUnavailable("Falha no envio Resend") from exc


class _NoMailApiRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _open_mail_api_request(request: Request, *, timeout: float):
    """Do not forward the Bearer token to redirects or environment proxies."""
    return build_opener(ProxyHandler({}), _NoMailApiRedirect()).open(request, timeout=timeout)


def _mail_api_payload(recipient: str, subject: str, html: str) -> bytes:
    if (not isinstance(recipient, str) or len(recipient) > 255
        or any(ord(c) < 32 or ord(c) == 127 for c in recipient)
        or not re.fullmatch(r"[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+", recipient)):
        raise EmailDeliveryUnavailable("Destinatário transacional inválido")
    if not isinstance(subject, str) or not isinstance(html, str):
        raise EmailDeliveryUnavailable("Conteúdo transacional inválido")
    subject = re.sub(r"[\r\n]+", " ", subject).strip()
    if not subject or len(subject) > 255 or any(ord(c) < 32 for c in subject):
        raise EmailDeliveryUnavailable("Assunto transacional inválido")
    if not html.strip() or re.search(r"\{\{.*?\}\}", subject + html, flags=re.DOTALL):
        raise EmailDeliveryUnavailable("Template transacional deve estar totalmente renderizado")
    try:
        if len(html.encode("utf-8")) > _MAIL_HTML_LIMIT:
            raise EmailDeliveryUnavailable("Mensagem transacional excede o limite")
        return json.dumps({"email": recipient, "assunto": subject, "mensagem": html},
                          ensure_ascii=False).encode("utf-8")
    except UnicodeError:
        raise EmailDeliveryUnavailable("Conteúdo transacional UTF-8 inválido") from None


def _send_portal_erp_api(*, recipient: str, subject: str, text: str, html: str) -> None:
    settings = _mail_api_settings()
    if settings is None:
        raise EmailDeliveryUnavailable("Portal ERP API não configurada")
    base, token, timeout = settings
    payload = _mail_api_payload(recipient, subject, html)
    request = Request(base + "/api/v1/enviar", data=payload, method="POST", headers={
        "Authorization": "Bearer " + token, "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json", "User-Agent": "PortalERPJobs/1.0",
    })
    try:
        with _open_mail_api_request(request, timeout=timeout) as response:
            if response.status != 201:
                if response.status >= 500 or 200 <= response.status < 300:
                    raise EmailAcceptanceUnknown("Aceite da Portal ERP API não confirmado; não repetir automaticamente")
                raise EmailDeliveryUnavailable("Portal ERP API recusou a solicitação")
            body = response.read(_MAIL_RESPONSE_LIMIT + 1)
    except HTTPError as exc:
        if exc.code >= 500:
            raise EmailAcceptanceUnknown("Aceite da Portal ERP API não confirmado; não repetir automaticamente") from None
        raise EmailDeliveryUnavailable(f"Portal ERP API recusou a solicitação (HTTP {int(exc.code)})") from None
    except (URLError, OSError, HTTPException):
        raise EmailAcceptanceUnknown("Aceite da Portal ERP API não confirmado; não repetir automaticamente") from None
    try:
        if len(body) > _MAIL_RESPONSE_LIMIT:
            raise ValueError
        result = json.loads(body)
        valid = (isinstance(result, dict) and result.get("success") is True
                 and type(result.get("id")) is int and 0 < result["id"] <= 9223372036854775807
                 and result.get("status") in ("PENDENTE", "ENVIADO"))
        if not valid:
            raise ValueError
    except (ValueError, UnicodeError, TypeError, RecursionError):
        raise EmailAcceptanceUnknown("Aceite da Portal ERP API não confirmado; não repetir automaticamente") from None
    # Only non-sensitive provider receipt fields are logged; never the recipient,
    # request/response bodies, reset/invitation URLs or Authorization header.
    current_app.logger.info("Portal ERP API accepted transactional mail: id=%s status=%s",
                            result["id"], result["status"])
