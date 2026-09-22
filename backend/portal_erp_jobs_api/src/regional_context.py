"""Resolve the regional site context for every API request."""
from __future__ import annotations

from flask import current_app, g, jsonify, request

from src.models.site import Site, SiteDomain, normalize_host

CLIENT_SITE_KEYS = frozenset({"site_id", "siteId", "site_code", "siteCode"})
CLIENT_SITE_HEADERS = ("X-Site-Id", "X-Site-Key", "X-Regional-Site", "X-Regional-Host")


def _error(code: str, message: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status


def _has_forbidden_client_authority() -> bool:
    if request.path.startswith("/api/admin/sites"):
        return False
    supplied_headers = {header for header in CLIENT_SITE_HEADERS if header in request.headers}
    if supplied_headers == {"X-Regional-Host"} and _is_trusted_internal_request():
        supplied_headers.clear()
    if supplied_headers:
        return True
    if CLIENT_SITE_KEYS.intersection(request.args.keys()):
        return True
    if request.method in {"POST", "PUT", "PATCH"} and request.is_json:
        payload = request.get_json(silent=True)
        return isinstance(payload, dict) and bool(CLIENT_SITE_KEYS.intersection(payload.keys()))
    return False


def _is_trusted_internal_request() -> bool:
    direct_host = (request.host or "").split(":", 1)[0].lower()
    return request.remote_addr in {"127.0.0.1", "::1"} and direct_host in {
        "127.0.0.1",
        "localhost",
    }


def resolve_site_from_request() -> Site | None:
    """Resolve a site from the canonical request Host, never from client site IDs."""
    try:
        internal_host = request.headers.get("X-Regional-Host")
        source_host = internal_host if internal_host and _is_trusted_internal_request() else request.host
        hostname = normalize_host(source_host)
    except ValueError:
        return None

    domain = SiteDomain.query.filter_by(hostname=hostname, is_active=True).first()
    if domain:
        return domain.site

    if current_app.config.get("REGIONAL_ALLOW_DEVELOPMENT_FALLBACK", False):
        return Site.query.filter_by(code="BR").first()
    return None


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
