"""Transactional email delivery for password recovery."""
from __future__ import annotations

import json
import smtplib
import ssl
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app


class EmailDeliveryUnavailable(RuntimeError):
    """Raised when no provider is configured or delivery fails."""


def configured_email_provider() -> str | None:
    """Return a fully configured provider name, otherwise ``None``."""
    provider = str(current_app.config.get("EMAIL_PROVIDER", "")).strip().lower()
    sender = str(current_app.config.get("EMAIL_FROM", "")).strip()
    if provider == "smtp" and sender and current_app.config.get("SMTP_HOST"):
        return provider
    if provider == "resend" and sender and current_app.config.get("RESEND_API_KEY"):
        return provider
    return None


def send_password_reset_email(*, recipient: str, reset_url: str, site_name: str) -> None:
    """Send a PT-BR password reset message through the configured provider."""
    provider = configured_email_provider()
    if provider is None:
        raise EmailDeliveryUnavailable("Provedor de e-mail não configurado")

    subject = f"Redefinição de senha — {site_name}"
    text = (
        f"Recebemos uma solicitação para redefinir sua senha no {site_name}.\n\n"
        f"Use este link em até 1 hora:\n{reset_url}\n\n"
        "Se você não solicitou a alteração, ignore esta mensagem."
    )
    html = (
        f"<p>Recebemos uma solicitação para redefinir sua senha no {site_name}.</p>"
        f'<p><a href="{reset_url}">Redefinir minha senha</a></p>'
        "<p>O link expira em 1 hora. Se você não solicitou a alteração, ignore esta mensagem.</p>"
    )

    if provider == "smtp":
        _send_smtp(recipient=recipient, subject=subject, text=text, html=html)
    else:
        _send_resend(recipient=recipient, subject=subject, text=text, html=html)


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
    payload = json.dumps(
        {
            "from": current_app.config["EMAIL_FROM"],
            "to": [recipient],
            "subject": subject,
            "text": text,
            "html": html,
        }
    ).encode("utf-8")
    request = Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {current_app.config['RESEND_API_KEY']}",
            "Content-Type": "application/json",
            "User-Agent": "PortalERPJobs/1.0",
        },
    )
    try:
        with urlopen(request, timeout=10) as response:
            if response.status < 200 or response.status >= 300:
                raise EmailDeliveryUnavailable("Falha no envio Resend")
    except (HTTPError, URLError, OSError) as exc:
        raise EmailDeliveryUnavailable("Falha no envio Resend") from exc
