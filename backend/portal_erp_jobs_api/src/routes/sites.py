"""Public regional context and protected site administration routes."""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from src.config import db
from src.models.job import Job
from src.models.site import Site, SiteDomain, SiteLocale
from src.regional_context import get_current_site
from src.routes.admin import super_admin_required

sites_bp = Blueprint("sites", __name__)


@sites_bp.route("/api/context", methods=["GET"])
def get_context():
    site = get_current_site()
    return jsonify({"site": site.to_dict(), "locale": site.default_locale}), 200


@sites_bp.route("/api/sites", methods=["GET"])
def get_active_sites():
    sites = Site.query.filter_by(is_active=True).order_by(Site.name).all()
    return jsonify({"sites": [site.to_dict() for site in sites]}), 200


@sites_bp.route("/api/admin/sites", methods=["GET"])
@super_admin_required
def admin_list_sites():
    sites = Site.query.order_by(Site.name).all()
    return jsonify({"sites": [site.to_dict(include_configuration=True) for site in sites]}), 200


def _add_domain(site: Site, payload: dict) -> None:
    site.domains.append(
        SiteDomain(
            hostname=payload.get("hostname", ""),
            url_prefix=payload.get("url_prefix", ""),
            is_primary=bool(payload.get("is_primary", False)),
            is_active=bool(payload.get("is_active", True)),
        )
    )


def _add_locale(site: Site, payload: dict) -> None:
    site.locales.append(
        SiteLocale(
            locale=payload.get("locale", ""),
            is_default=bool(payload.get("is_default", False)),
            is_active=bool(payload.get("is_active", True)),
        )
    )


@sites_bp.route("/api/admin/sites", methods=["POST"])
@super_admin_required
def admin_create_site():
    data = request.get_json(silent=True) or {}
    required = ("code", "name", "country_code", "default_locale", "currency_code", "timezone")
    if any(not data.get(field) for field in required):
        return jsonify({"error": "Missing required regional site fields"}), 400

    try:
        site = Site(
            code=data["code"],
            name=data["name"],
            country_code=data["country_code"],
            default_locale=data["default_locale"],
            currency_code=data["currency_code"],
            timezone=data["timezone"],
            canonical_origin=data.get("canonical_origin"),
            is_active=False,
        )
        for domain in data.get("domains", []):
            _add_domain(site, domain)
        locale_payloads = data.get("locales") or [
            {"locale": data["default_locale"], "is_default": True, "is_active": True}
        ]
        for locale in locale_payloads:
            _add_locale(site, locale)
        db.session.add(site)
        db.session.flush()
        if data.get("is_active"):
            site.set_active(True)
        db.session.commit()
        return jsonify({"site": site.to_dict(include_configuration=True)}), 201
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Regional site, hostname or locale already exists"}), 409


@sites_bp.route("/api/admin/sites/<string:code>", methods=["GET"])
@super_admin_required
def admin_get_site(code: str):
    site = Site.query.filter_by(code=code.upper()).first_or_404()
    return jsonify({"site": site.to_dict(include_configuration=True)}), 200


@sites_bp.route("/api/admin/sites/<string:code>", methods=["PATCH"])
@super_admin_required
def admin_update_site(code: str):
    site = Site.query.filter_by(code=code.upper()).first_or_404()
    data = request.get_json(silent=True) or {}

    try:
        for field in (
            "name",
            "country_code",
            "default_locale",
            "currency_code",
            "timezone",
            "canonical_origin",
        ):
            if field in data:
                setattr(site, field, data[field])

        if "domains" in data:
            site.domains.clear()
            for domain in data["domains"]:
                _add_domain(site, domain)
        if "locales" in data:
            site.locales.clear()
            for locale in data["locales"]:
                _add_locale(site, locale)

        db.session.flush()
        if "is_active" in data:
            site.set_active(data["is_active"])
        if site.is_active:
            valid, reason = site.can_activate()
            if not valid:
                raise ValueError(reason)
        site.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"site": site.to_dict(include_configuration=True)}), 200
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Regional site, hostname or locale conflicts with an existing record"}), 409


@sites_bp.route("/api/admin/sites/<string:code>", methods=["DELETE"])
@super_admin_required
def admin_delete_site(code: str):
    site = Site.query.filter_by(code=code.upper()).first_or_404()
    if site.is_active:
        return jsonify({"error": "Deactivate the regional site before deletion"}), 409
    if Job.query.filter_by(site_id=site.id).first():
        return jsonify({"error": "Regional site has jobs and cannot be deleted"}), 409
    db.session.delete(site)
    db.session.commit()
    return "", 204
