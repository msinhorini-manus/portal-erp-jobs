"""Resolve the regional site context for every API request."""
from __future__ import annotations

from flask import g, jsonify, request

from src.models.site import PREFIX_RE, Site, SiteDomain, normalize_host

CLIENT_SITE_KEYS = frozenset({"site_id", "siteId", "site_code", "siteCode"})
CLIENT_SITE_HEADERS = ("X-Site-Id", "X-Site-Key", "X-Regional-Site")
INTERNAL_CONTEXT_HEADERS = ("X-Regional-Host", "X-Regional-Prefix")


def _error(code: str, message: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status


def _has_forbidden_client_authority() -> bool:
    # Site CRUD is not an exception to the transport security boundary. Its
    # editable code/domains are configuration, not request site authority.
    if any(header in request.headers for header in CLIENT_SITE_HEADERS):
        return True
    if any(header in request.headers for header in INTERNAL_CONTEXT_HEADERS):
        if not _is_trusted_internal_request():
            return True
    if CLIENT_SITE_KEYS.intersection(request.args.keys()):
        return True
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.is_json:
        payload = request.get_json(silent=True)
        return isinstance(payload, dict) and bool(CLIENT_SITE_KEYS.intersection(payload.keys()))
    return False


def _is_trusted_internal_request() -> bool:
    try:
        direct_host = normalize_host(request.host or "")
    except ValueError:
        return False
    return request.remote_addr in {"127.0.0.1", "::1"} and direct_host in {
        "127.0.0.1", "localhost",
    }


def resolve_site_from_request() -> Site | None:
    """Match an exact registered host/prefix pair; never guess a country.

    Next/Nginx use X-Regional-Host and X-Regional-Prefix ('/br') over a
    loopback connection with an internal Host. Forwarded/X-Forwarded-Host
    are deliberately not consulted. No prefix means the legacy empty-prefix
    alias, not whichever primary domain happens to share this hostname.
    """
    if _has_forbidden_client_authority():
        return None
    trusted = _is_trusted_internal_request()
    source_host = request.headers.get("X-Regional-Host", request.host) if trusted else request.host
    prefix = request.headers.get("X-Regional-Prefix", "") if trusted else ""
    # Transport values must already be canonical. Do not coerce BR, '/BR',
    # '/br/', traversal, multi-segment paths or comma-separated headers.
    if not PREFIX_RE.fullmatch(prefix):
        return None
    try:
        hostname = normalize_host(source_host)
    except ValueError:
        return None

    domains = SiteDomain.query.filter_by(
        hostname=hostname, url_prefix=prefix, is_active=True,
    ).limit(2).all()
    if len(domains) != 1:
        return None
    return domains[0].site


def get_current_site() -> Site:
    site = getattr(g, "site", None)
    if site is None:
        raise RuntimeError("regional site context is unavailable")
    return site


def init_regional_context(app) -> None:
    """Install the regional context before all route handlers and i18n."""

    @app.before_request
    def set_regional_context():
        if not request.path.startswith("/api"):
            return None
        if _has_forbidden_client_authority():
            return _error(
                "client_site_authority_forbidden",
                "The regional site is resolved by the server and cannot be selected by request data.",
                400,
            )
        site = resolve_site_from_request()
        if site is None:
            return _error("site_not_found", "Regional site not available.", 404)
        if not site.is_active:
            return _error("site_not_available", "Regional site not available.", 404)
        g.site = site
        g.site_id = site.id
        g.locale = site.default_locale
        return None
