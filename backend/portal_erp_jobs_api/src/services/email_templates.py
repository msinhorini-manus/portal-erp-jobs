"""Validation and rendering for the editorial email-template center.

This module deliberately has no transport, outbox, worker, or candidate lookup.
It validates the small authorized catalog and renders only fictional preview
values or a trusted regional dashboard URL.
"""
from __future__ import annotations

import copy
import html as html_module
import posixpath
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any
from urllib.parse import unquote, urlparse

from src.models.email_template import EmailTemplate
from src.models.site import normalize_host, normalize_origin
from src.services.regional_urls import trusted_regional_base_url


TEMPLATE_KEY = "application.created.company"
EVENT_KEY = "application.created"
AUDIENCE = "company"
SUPPORTED_LOCALES = ("pt-BR", "en", "es")
ALLOWED_VARIABLES = (
    "responsavel_nome",
    "empresa_nome",
    "vaga_titulo",
    "data_candidatura",
    "painel_url",
)

VARIABLES = [
    {
        "key": "responsavel_nome",
        "label": "Nome do responsável",
        "description": "Nome fictício do responsável principal elegível da empresa.",
        "example": "Ana Ribeiro",
    },
    {
        "key": "empresa_nome",
        "label": "Nome da empresa",
        "description": "Nome fictício da empresa no escopo regional.",
        "example": "AgroTech Brasil",
    },
    {
        "key": "vaga_titulo",
        "label": "Título da vaga",
        "description": "Título fictício da vaga que recebeu a candidatura.",
        "example": "Analista de Sistemas ERP",
    },
    {
        "key": "data_candidatura",
        "label": "Data da candidatura",
        "description": "Data fictícia da candidatura, sem horário ou dado pessoal.",
        "example": "18/11/2026",
    },
    {
        "key": "painel_url",
        "label": "URL do painel",
        "description": "URL regional confiável do painel empresarial, sem token ou query.",
        "example": "https://jobs.portalerp.com.br/br/empresa/dashboard",
    },
]

# The catalog is intentionally editorial data only. It is copied on every read
# so callers cannot mutate the process-wide fallback and GET never writes it.
CATALOG = {
    "pt-BR": {
        "name": "Nova candidatura — responsável empresarial",
        "subject": "Nova candidatura para {{vaga_titulo}} — Portal ERP Jobs",
        "html": (
            "<p>Olá, {{responsavel_nome}}.</p>"
            "<p>Sua empresa recebeu uma nova candidatura para a vaga "
            "<strong>{{vaga_titulo}}</strong>.</p>"
            '<p><a href="{{painel_url}}">Ver candidaturas no painel</a></p>'
            "<p>Portal ERP Jobs</p>"
        ),
        "text": (
            "Olá, {{responsavel_nome}}. Sua empresa recebeu uma nova candidatura "
            "para {{vaga_titulo}}. Consulte o painel: {{painel_url}}. "
            "Portal ERP Jobs."
        ),
        "country_code": "BR",
    },
    "en": {
        "name": "New application — company contact",
        "subject": "New application for {{vaga_titulo}} — Portal ERP Jobs",
        "html": (
            "<p>Hello, {{responsavel_nome}}.</p>"
            "<p>Your company has received a new application for "
            "<strong>{{vaga_titulo}}</strong>.</p>"
            '<p><a href="{{painel_url}}">View applications in your dashboard</a></p>'
            "<p>Portal ERP Jobs</p>"
        ),
        "text": (
            "Hello, {{responsavel_nome}}. Your company has received a new application "
            "for {{vaga_titulo}}. View your dashboard: {{painel_url}}. "
            "Portal ERP Jobs."
        ),
        "country_code": None,
    },
    "es": {
        "name": "Nueva candidatura — responsable empresarial",
        "subject": "Nueva candidatura para {{vaga_titulo}} — Portal ERP Jobs",
        "html": (
            "<p>Hola, {{responsavel_nome}}.</p>"
            "<p>Su empresa ha recibido una nueva candidatura para "
            "<strong>{{vaga_titulo}}</strong>.</p>"
            '<p><a href="{{painel_url}}">Ver candidaturas en el panel</a></p>'
            "<p>Portal ERP Jobs</p>"
        ),
        "text": (
            "Hola, {{responsavel_nome}}. Su empresa ha recibido una nueva candidatura "
            "para {{vaga_titulo}}. Consulte el panel: {{painel_url}}. "
            "Portal ERP Jobs."
        ),
        "country_code": None,
    },
}

MAX_NAME = 255
MAX_SUBJECT = 255
MAX_HTML_BYTES = 2 * 1024 * 1024
MAX_TEXT_BYTES = 2 * 1024 * 1024

_ALLOWED_TAGS = frozenset(
    {
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "th",
        "td",
        "ul",
        "ol",
        "li",
        "a",
    }
)
_VOID_TAGS = frozenset({"br"})
_ALLOWED_ATTRIBUTES = {
    "a": frozenset({"href", "title", "aria-label"}),
}
_MARKER = re.compile(r"\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}")
_UNKNOWN_TEMPLATE_SYNTAX = re.compile(r"(?:\{\{|\}\}|\{%|%\}|<%|%>|\$\{|\[\[|\]\])")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_LITERAL_HTTP_URL = re.compile(r"(?i)https?://[^\s<>\"']+")
_UNSAFE_PATH_SEGMENTS = frozenset(
    {
        "cadastro",
        "convite",
        "invite",
        "login",
        "password",
        "reset",
        "signup",
        "token",
        "verify",
        "verification",
    }
)


class TemplateValidationError(ValueError):
    """Validation failure carrying field-level safe messages."""

    def __init__(self, fields: dict[str, str]):
        self.fields = fields
        super().__init__("Template validation failed")


@dataclass(frozen=True)
class MemoryTemplate:
    """A non-persistent catalog fallback used by read and preview responses."""

    locale: str
    country_code: str | None
    values: dict[str, str]

    @property
    def revision(self):
        return 0

    @property
    def is_inactive(self):
        return False

    @property
    def has_draft(self):
        return True

    @property
    def latest_version(self):
        return None

    @property
    def status(self):
        return "draft"

    @property
    def updated_at(self):
        return None

    @property
    def updated_by_admin(self):
        return None


def catalog_definition(locale: str) -> dict[str, Any]:
    if locale not in SUPPORTED_LOCALES:
        raise KeyError(locale)
    return copy.deepcopy(CATALOG[locale])


def memory_template(locale: str) -> MemoryTemplate:
    values = catalog_definition(locale)
    return MemoryTemplate(locale, values.pop("country_code"), values)


def _safe_control_free(value: str) -> bool:
    return not _CONTROL_CHARS.search(value)


def _marker_error(value: str, field: str) -> str | None:
    """Reject unknown, broken, or alternate template syntaxes."""
    if not isinstance(value, str):
        return "deve ser texto"
    if not _safe_control_free(value):
        return "não pode conter caracteres de controle"
    for match in _MARKER.finditer(value):
        if match.group(1) not in ALLOWED_VARIABLES:
            return f"variável não permitida: {match.group(1)}"
    stripped = _MARKER.sub("", value)
    if _UNKNOWN_TEMPLATE_SYNTAX.search(stripped):
        return "contém marcador desconhecido ou quebrado"
    # A single brace is not a supported marker either. This also catches
    # malformed values such as '{{ nome }' without rejecting ordinary text.
    if "{" in stripped or "}" in stripped:
        return "contém marcador desconhecido ou quebrado"
    return None


def _trusted_hosts(site) -> set[str]:
    hosts: set[str] = set()
    try:
        origin = normalize_origin(site.canonical_origin)
        if origin:
            hosts.add(urlparse(origin).hostname or "")
    except (TypeError, ValueError):
        pass
    for domain in getattr(site, "domains", ()):
        if getattr(domain, "is_active", False):
            try:
                hosts.add(normalize_host(domain.hostname))
            except (TypeError, ValueError):
                continue
    return {host for host in hosts if host}


def trusted_panel_url(site) -> str:
    """Build a canonical dashboard URL from server-owned site configuration."""
    base = trusted_regional_base_url(site)
    primary = site.primary_domain
    if not base or not primary:
        raise ValueError("site has no trusted regional base")
    prefix = primary.url_prefix
    if not isinstance(prefix, str) or not prefix.startswith("/") and prefix != "":
        raise ValueError("site has an unsafe regional prefix")
    return f"{base}/empresa/dashboard"


def _safe_href(value: str, site) -> bool:
    marker = _MARKER.fullmatch(value) if isinstance(value, str) else None
    if marker and marker.group(1) == "painel_url":
        return True
    if not isinstance(value, str) or not value or any(char.isspace() for char in value):
        return False
    try:
        parsed = urlparse(value)
        parsed_hostname = parsed.hostname
        parsed_port = parsed.port
        panel = urlparse(trusted_panel_url(site))
        panel_hostname = panel.hostname
        panel_port = panel.port
        regional_base = urlparse(trusted_regional_base_url(site) or "")
    except (TypeError, ValueError):
        return False
    if parsed.scheme != "https" or not parsed_hostname or not panel_hostname:
        return False
    if (
        parsed.username
        or parsed.password
        or parsed.params
        or parsed.query
        or parsed.fragment
        or not regional_base.hostname
    ):
        return False
    try:
        host = normalize_host(parsed_hostname)
        panel_host = normalize_host(panel_hostname)
    except ValueError:
        return False
    if host not in _trusted_hosts(site):
        return False
    if (parsed_port or 443) != (panel_port or 443):
        return False

    path = parsed.path or "/"
    panel_path = panel.path or "/"
    if host == panel_host and path == panel_path:
        return True

    base_path = (regional_base.path or "").rstrip("/")
    if not base_path:
        base_path = ""
    prefixes = tuple(f"{base_path}/{segment}" for segment in ("empresa", "candidato", "candidatos"))
    if not any(path == prefix or path.startswith(f"{prefix}/") for prefix in prefixes):
        return False
    if "%" in path:
        return False
    normalized_path = posixpath.normpath(path)
    if normalized_path != path:
        return False
    try:
        decoded_segments = [unquote(segment).lower() for segment in path.split("/")]
    except Exception:
        return False
    return not any(segment in _UNSAFE_PATH_SEGMENTS for segment in decoded_segments)


class _SafeHTMLParser(HTMLParser):
    def __init__(self, site):
        super().__init__(convert_charrefs=False)
        self.site = site
        self.errors: list[str] = []
        self.stack: list[str] = []
        self.parts: list[str] = []

    def _error(self, message: str):
        if not self.errors:
            self.errors.append(message)

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag not in _ALLOWED_TAGS:
            self._error(f"tag HTML não permitida: {tag}")
            return
        allowed_attrs = _ALLOWED_ATTRIBUTES.get(tag, frozenset())
        seen = set()
        rendered = []
        for name, value in attrs:
            name = (name or "").lower()
            if name in seen or name not in allowed_attrs:
                self._error(f"atributo HTML não permitido: {name}")
                return
            seen.add(name)
            value = "" if value is None else value
            if name == "href":
                if not _safe_href(value, self.site):
                    self._error("URL de link não permitida")
                    return
            elif _MARKER.search(value) or _marker_error(value, name):
                self._error("atributo HTML contém marcador não permitido")
                return
            rendered.append(
                f' {name}="{html_module.escape(value, quote=True)}"'
            )
        self.parts.append(f"<{tag}{''.join(rendered)}>")
        if tag not in _VOID_TAGS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if not self.errors and tag.lower() in _VOID_TAGS:
            # Keep output stable and safe; no XML-style arbitrary element is
            # accepted, but <br/> is represented as <br>.
            if self.parts and self.parts[-1].endswith(">"):
                return

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag not in _ALLOWED_TAGS or tag in _VOID_TAGS:
            self._error(f"tag de fechamento não permitida: {tag}")
            return
        if not self.stack or self.stack[-1] != tag:
            self._error("estrutura HTML inválida")
            return
        self.stack.pop()
        self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        marker_error = _marker_error(data, "html")
        if marker_error:
            self._error(marker_error)
            return
        self.parts.append(data)

    def handle_entityref(self, name):
        self.parts.append(f"&{name};")

    def handle_charref(self, name):
        self.parts.append(f"&#{name};")

    def handle_comment(self, _data):
        self._error("comentários HTML não permitidos")

    def handle_decl(self, _decl):
        self._error("declarações HTML não permitidas")

    def unknown_decl(self, _data):
        self._error("declaração HTML não permitida")

    def handle_pi(self, _data):
        self._error("processamento HTML não permitido")


def validate_html(value: str, site) -> None:
    if not isinstance(value, str) or not value.strip():
        raise TemplateValidationError({"html": "é obrigatório"})
    if len(value.encode("utf-8")) > MAX_HTML_BYTES:
        raise TemplateValidationError({"html": "excede o limite de 2 MiB"})
    parser = _SafeHTMLParser(site)
    try:
        parser.feed(value)
        parser.close()
    except (ValueError, AssertionError):
        parser._error("HTML inválido")
    if parser.stack and not parser.errors:
        parser._error("HTML contém tags não fechadas")
    if parser.errors:
        raise TemplateValidationError({"html": parser.errors[0]})


def validate_content(payload: dict[str, Any], site) -> dict[str, str]:
    """Validate editor fields and return the original content unchanged."""
    fields: dict[str, str] = {}
    values = {}
    for key in ("name", "subject", "html", "text"):
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            fields[key] = "é obrigatório e deve ser texto"
            continue
        values[key] = value
        if not _safe_control_free(value):
            fields[key] = "não pode conter caracteres de controle"
        marker_message = _marker_error(value, key)
        if marker_message:
            fields[key] = marker_message
        elif key == "name" and _MARKER.search(value):
            fields[key] = "não aceita variáveis"
        if key == "subject" and ("\r" in value or "\n" in value):
            fields[key] = "não pode conter quebra de linha"
    if isinstance(values.get("name"), str) and len(values["name"]) > MAX_NAME:
        fields["name"] = "excede 255 caracteres"
    if isinstance(values.get("subject"), str) and len(values["subject"]) > MAX_SUBJECT:
        fields["subject"] = "excede 255 caracteres"
    if isinstance(values.get("html"), str) and len(values["html"].encode("utf-8")) > MAX_HTML_BYTES:
        fields["html"] = "excede o limite de 2 MiB"
    if isinstance(values.get("text"), str) and len(values["text"].encode("utf-8")) > MAX_TEXT_BYTES:
        fields["text"] = "excede o limite de 2 MiB"
    if not fields and isinstance(values.get("html"), str):
        try:
            validate_html(values["html"], site)
        except TemplateValidationError as exc:
            fields.update(exc.fields)
    if not fields and isinstance(values.get("text"), str):
        for match in _LITERAL_HTTP_URL.finditer(values["text"]):
            literal_url = match.group(0).rstrip(".,;:!?)]}")
            if not literal_url or not _safe_href(literal_url, site):
                fields["text"] = "contém URL não permitida"
                break
    if fields:
        raise TemplateValidationError(fields)
    return {key: values[key] for key in ("name", "subject", "html", "text")}


def _render_text(value: str, values: dict[str, str], *, html_context: bool) -> str:
    def replacement(match):
        key = match.group(1)
        raw = values[key]
        return html_module.escape(raw, quote=True) if html_context else raw.replace("\r", " ").replace("\n", " ")

    return _MARKER.sub(replacement, value)


def render_html(value: str, values: dict[str, str], site) -> str:
    """Render safe HTML and escape variables for text/attribute context."""
    parser = _SafeHTMLParser(site)
    parser.feed(value)
    parser.close()
    if parser.errors or parser.stack:
        raise TemplateValidationError({"html": parser.errors[0] if parser.errors else "HTML inválido"})

    # Re-parse the validated source with a renderer rather than replacing raw
    # HTML, so a variable can never become a tag or an attribute boundary.
    class Renderer(_SafeHTMLParser):
        def handle_data(self, data):
            marker_error = _marker_error(data, "html")
            if marker_error:
                self._error(marker_error)
                return
            self.parts.append(_render_text(data, values, html_context=True))

        def handle_starttag(self, tag, attrs):
            tag = tag.lower()
            if tag not in _ALLOWED_TAGS:
                self._error(f"tag HTML não permitida: {tag}")
                return
            allowed_attrs = _ALLOWED_ATTRIBUTES.get(tag, frozenset())
            rendered = []
            seen = set()
            for name, attr_value in attrs:
                name = (name or "").lower()
                if name in seen or name not in allowed_attrs:
                    self._error(f"atributo HTML não permitido: {name}")
                    return
                seen.add(name)
                attr_value = "" if attr_value is None else attr_value
                if name == "href":
                    marker = _MARKER.fullmatch(attr_value)
                    if marker and marker.group(1) == "painel_url":
                        attr_value = values["painel_url"]
                    elif not _safe_href(attr_value, self.site):
                        self._error("URL de link não permitida")
                        return
                elif _MARKER.search(attr_value) or _marker_error(attr_value, name):
                    self._error("atributo HTML contém marcador não permitido")
                    return
                rendered.append(f' {name}="{html_module.escape(attr_value, quote=True)}"')
            self.parts.append(f"<{tag}{''.join(rendered)}>")
            if tag not in _VOID_TAGS:
                self.stack.append(tag)

    renderer = Renderer(site)
    renderer.feed(value)
    renderer.close()
    if renderer.errors or renderer.stack:
        raise TemplateValidationError({"html": renderer.errors[0] if renderer.errors else "HTML inválido"})
    return "".join(renderer.parts)


def render_content(content: dict[str, str], site, locale: str) -> dict[str, str]:
    if locale not in SUPPORTED_LOCALES:
        raise TemplateValidationError({"locale": "locale não suportado"})
    # Validate the unrendered source, including its trusted href marker.
    validated = validate_content(content, site)
    samples = {
        "pt-BR": {
            "responsavel_nome": "Ana Ribeiro",
            "empresa_nome": "AgroTech Brasil",
            "vaga_titulo": "Analista de Sistemas ERP",
            "data_candidatura": "18/11/2026",
        },
        "en": {
            "responsavel_nome": "Ana Ribeiro",
            "empresa_nome": "AgroTech Brasil",
            "vaga_titulo": "ERP Systems Analyst",
            "data_candidatura": "18 Nov 2026",
        },
        "es": {
            "responsavel_nome": "Ana Ribeiro",
            "empresa_nome": "AgroTech Brasil",
            "vaga_titulo": "Analista de Sistemas ERP",
            "data_candidatura": "18/11/2026",
        },
    }[locale]
    values = {**samples, "painel_url": trusted_panel_url(site)}
    return {
        "subject": _render_text(validated["subject"], values, html_context=False),
        "html": render_html(validated["html"], values, site),
        "text": _render_text(validated["text"], values, html_context=False),
    }


def _iso(value):
    return value.isoformat() if value else None


def _author_name(admin):
    return getattr(admin, "name", None) if admin else None


def _published_dict(version):
    if not version:
        return None
    return {
        "version": version.version,
        "name": version.name,
        "subject": version.subject,
        "html": version.html,
        "text": version.text,
        "published_at": _iso(version.published_at),
        "author": _author_name(version.author),
    }


def _draft_dict(template) -> dict[str, str] | None:
    if not getattr(template, "has_draft", False):
        return None
    return {
        "name": template.draft_name,
        "subject": template.draft_subject,
        "html": template.draft_html,
        "text": template.draft_text,
    }


def template_record(template, site, locale: str) -> dict[str, Any]:
    """Serialize a persisted or in-memory entry with the public contract."""
    if isinstance(template, MemoryTemplate):
        draft = {
            "name": template.values["name"],
            "subject": template.values["subject"],
            "html": template.values["html"],
            "text": template.values["text"],
        }
        country_code = template.country_code
        name = template.values["name"]
        updated_at = None
        author = None
        published = None
        status = "draft"
        revision = 0
    else:
        draft = _draft_dict(template)
        latest = template.latest_version
        country_code = template.country_code
        name = draft["name"] if draft else (latest.name if latest else None)
        updated_at = _iso(template.updated_at)
        author = _author_name(template.updated_by_admin)
        published = _published_dict(latest)
        status = template.status
        revision = template.revision
    return {
        "locale": locale,
        "key": TEMPLATE_KEY,
        "event": EVENT_KEY,
        "audience": AUDIENCE,
        "country_code": country_code.upper() if country_code else None,
        "name": name,
        "status": status,
        "revision": revision,
        "draft": draft,
        "published": published,
        "versions": [],
        "updated_at": updated_at,
        "author": author,
        "operational": False,
    }


def version_dict(version) -> dict[str, Any]:
    return _published_dict(version)
