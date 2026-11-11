"""Deterministic public job URL snapshots (v1; no IDs or URL/site policy here)."""
import re
import unicodedata

MAX_PUBLIC_SLUG_LENGTH = 140
HIDDEN_COMPANY_SLUG = "empresa-confidencial"


def public_slug(value, fallback):
    """Produce a bounded ASCII lowercase/hyphen segment, never a full title."""
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:MAX_PUBLIC_SLUG_LENGTH].rstrip("-") or fallback


def public_company_slug(display_name, company_name, *, hidden=False):
    if hidden:
        return HIDDEN_COMPANY_SLUG
    # A blank regional display name is not a public name override.
    name = display_name if display_name and display_name.strip() else company_name
    return public_slug(name, "empresa")
