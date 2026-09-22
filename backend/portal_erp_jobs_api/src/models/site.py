"""Regional site models for the unified Portal ERP Jobs platform."""
from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import validates

from src.config import db


CODE_RE = re.compile(r"^[A-Z]{2,10}$")
COUNTRY_RE = re.compile(r"^[A-Z]{2}$")
CURRENCY_RE = re.compile(r"^[A-Z]{3}$")
LOCALE_RE = re.compile(r"^[a-z]{2,3}(?:-[A-Z]{2})?$")
HOST_RE = re.compile(
    r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$"
)
PREFIX_RE = re.compile(r"^$|^/[a-z0-9](?:[a-z0-9-]{0,61})$")


def normalize_host(value: str) -> str:
    """Return a canonical hostname without scheme, port, path or trailing dot."""
    raw = (value or "").strip().lower().rstrip(".")
    if not raw or "://" in raw or "/" in raw:
        raise ValueError("hostname must not contain scheme or path")

    if raw.startswith("["):
        raise ValueError("IP literals are not valid regional hostnames")

    if raw.count(":") == 1:
        host, port = raw.rsplit(":", 1)
        if not port.isdigit():
            raise ValueError("hostname port is invalid")
        raw = host

    try:
        raw = raw.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise ValueError("hostname is invalid") from exc

    if not HOST_RE.fullmatch(raw):
        raise ValueError("hostname is invalid")
    return raw


def normalize_origin(value: str | None) -> str | None:
    """Validate and normalize an HTTPS canonical origin."""
    if value is None or not str(value).strip():
        return None
    parsed = urlparse(str(value).strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.path not in ("", "/"):
        raise ValueError("canonical_origin must be an HTTPS origin without a path")
    if parsed.params or parsed.query or parsed.fragment or parsed.username or parsed.password:
        raise ValueError("canonical_origin contains unsupported components")
    host = normalize_host(parsed.hostname)
    port = f":{parsed.port}" if parsed.port and parsed.port != 443 else ""
    return f"https://{host}{port}"


class Site(db.Model):
    """A country-level regional site served by the single platform."""

    __tablename__ = "sites"
    __table_args__ = (
        db.CheckConstraint("length(country_code) = 2", name="ck_sites_country_code_length"),
        db.CheckConstraint("length(currency_code) = 3", name="ck_sites_currency_code_length"),
    )

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    country_code = db.Column(db.String(2), nullable=False)
    default_locale = db.Column(db.String(35), nullable=False)
    currency_code = db.Column(db.String(3), nullable=False)
    timezone = db.Column(db.String(64), nullable=False)
    canonical_origin = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=False, index=True)
    activated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    domains = db.relationship(
        "SiteDomain",
        back_populates="site",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    locales = db.relationship(
        "SiteLocale",
        back_populates="site",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    jobs = db.relationship("Job", back_populates="site")

    @validates("code")
    def validate_code(self, _key: str, value: str) -> str:
        normalized = (value or "").strip().upper()
        if not CODE_RE.fullmatch(normalized):
            raise ValueError("code must contain 2 to 10 uppercase ASCII letters")
        return normalized

    @validates("country_code")
    def validate_country_code(self, _key: str, value: str) -> str:
        normalized = (value or "").strip().upper()
        if not COUNTRY_RE.fullmatch(normalized):
            raise ValueError("country_code must be ISO 3166-1 alpha-2")
        return normalized

    @validates("currency_code")
    def validate_currency_code(self, _key: str, value: str) -> str:
        normalized = (value or "").strip().upper()
        if not CURRENCY_RE.fullmatch(normalized):
            raise ValueError("currency_code must be ISO 4217 format")
        return normalized

    @validates("default_locale")
    def validate_default_locale(self, _key: str, value: str) -> str:
        normalized = (value or "").strip()
        if not LOCALE_RE.fullmatch(normalized):
            raise ValueError("default_locale must use BCP 47 language-region format")
        return normalized

    @validates("timezone")
    def validate_timezone(self, _key: str, value: str) -> str:
        normalized = (value or "").strip()
        try:
            ZoneInfo(normalized)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("timezone must be a valid IANA identifier") from exc
        return normalized

    @validates("canonical_origin")
    def validate_origin(self, _key: str, value: str | None) -> str | None:
        return normalize_origin(value)

    @property
    def primary_domain(self) -> "SiteDomain | None":
        return next(
            (domain for domain in self.domains if domain.is_primary and domain.is_active),
            None,
        )

    def can_activate(self) -> tuple[bool, str | None]:
        """Validate the minimum data needed to make a regional site public."""
        if not self.canonical_origin:
            return False, "canonical_origin is required before activation"
        if not self.primary_domain:
            return False, "an active primary domain is required before activation"
        if not any(
            locale.is_active
            and locale.is_default
            and locale.locale == self.default_locale
            for locale in self.locales
        ):
            return False, "the active default locale must be registered"
        return True, None

    def set_active(self, value: bool) -> None:
        requested = bool(value)
        if requested:
            valid, reason = self.can_activate()
            if not valid:
                raise ValueError(reason)
            if not self.is_active:
                self.activated_at = datetime.utcnow()
        else:
            self.activated_at = None
        self.is_active = requested

    def to_dict(self, include_configuration: bool = False) -> dict:
        data = {
            "code": self.code,
            "name": self.name,
            "country_code": self.country_code,
            "locale": self.default_locale,
            "currency_code": self.currency_code,
            "timezone": self.timezone,
            "canonical_origin": self.canonical_origin,
            "is_active": self.is_active,
        }
        if include_configuration:
            data.update(
                {
                    "activated_at": self.activated_at.isoformat() if self.activated_at else None,
                    "created_at": self.created_at.isoformat() if self.created_at else None,
                    "updated_at": self.updated_at.isoformat() if self.updated_at else None,
                    "domains": [domain.to_dict() for domain in self.domains],
                    "locales": [locale.to_dict() for locale in self.locales],
                }
            )
        return data


class SiteDomain(db.Model):
    """A trusted hostname and optional URL prefix mapped to one site."""

    __tablename__ = "site_domains"
    __table_args__ = (
        db.UniqueConstraint("site_id", "url_prefix", name="uq_site_domain_prefix"),
        db.Index(
            "uq_site_domains_primary",
            "site_id",
            unique=True,
            sqlite_where=db.text("is_primary = 1"),
            postgresql_where=db.text("is_primary = true"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    hostname = db.Column(db.String(253), unique=True, nullable=False, index=True)
    url_prefix = db.Column(db.String(64), nullable=False, default="")
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    site = db.relationship("Site", back_populates="domains")

    @validates("hostname")
    def validate_hostname(self, _key: str, value: str) -> str:
        return normalize_host(value)

    @validates("url_prefix")
    def validate_url_prefix(self, _key: str, value: str | None) -> str:
        normalized = (value or "").strip().lower().rstrip("/")
        if normalized and not normalized.startswith("/"):
            normalized = f"/{normalized}"
        if not PREFIX_RE.fullmatch(normalized):
            raise ValueError("url_prefix must be empty or one safe URL segment")
        return normalized

    def to_dict(self) -> dict:
        return {
            "hostname": self.hostname,
            "url_prefix": self.url_prefix,
            "is_primary": self.is_primary,
            "is_active": self.is_active,
        }


class SiteLocale(db.Model):
    """An allowed interface locale for a regional site."""

    __tablename__ = "site_locales"
    __table_args__ = (
        db.UniqueConstraint("site_id", "locale", name="uq_site_locale"),
        db.Index(
            "uq_site_locales_default",
            "site_id",
            unique=True,
            sqlite_where=db.text("is_default = 1"),
            postgresql_where=db.text("is_default = true"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    locale = db.Column(db.String(35), nullable=False)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    site = db.relationship("Site", back_populates="locales")

    @validates("locale")
    def validate_locale(self, _key: str, value: str) -> str:
        normalized = (value or "").strip()
        if not LOCALE_RE.fullmatch(normalized):
            raise ValueError("locale must use BCP 47 language-region format")
        return normalized

    def to_dict(self) -> dict:
        return {
            "locale": self.locale,
            "is_default": self.is_default,
            "is_active": self.is_active,
        }
