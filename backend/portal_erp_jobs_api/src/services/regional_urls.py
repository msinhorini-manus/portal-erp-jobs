"""Trusted regional URLs for security-sensitive links, not external assets."""
from urllib.parse import urlparse

from src.models.site import PREFIX_RE, normalize_origin


def trusted_regional_base_url(site) -> str | None:
    """Reject corrupt/unregistered origins before generating any tokenized URL."""
    raw = site.canonical_origin
    if not isinstance(raw, str) or "\\" in raw or any(
        ord(char) <= 32 or ord(char) == 127 for char in raw
    ):
        return None
    try:
        origin = normalize_origin(raw)
        primary = site.primary_domain
        prefix = primary.url_prefix if primary else None
        hostname = urlparse(origin).hostname if origin else None
    except (ValueError, TypeError):
        return None
    if not primary or not isinstance(prefix, str) or not PREFIX_RE.fullmatch(prefix):
        return None
    if not hostname or not any(
        domain.is_active and domain.hostname == hostname and domain.url_prefix == prefix
        for domain in site.domains
    ):
        return None
    return f"{origin}{prefix}"
