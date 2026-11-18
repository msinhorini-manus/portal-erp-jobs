"""Admin email-template center: editorial persistence only, never transport."""
from __future__ import annotations

import copy
import hashlib
import ipaddress
import re
from datetime import datetime
from functools import wraps

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from src.config import db
from src.models import AdminAuditEvent, AdminPermission
from src.models.email_template import EmailTemplate, EmailTemplateVersion
from src.regional_context import get_current_site
from src.routes.admin import _current_admin, admin_required
from src.services.email_templates import (
    AUDIENCE,
    CATALOG,
    EVENT_KEY,
    SUPPORTED_LOCALES,
    TEMPLATE_KEY,
    VARIABLES,
    TemplateValidationError,
    memory_template,
    render_content,
    template_record,
    validate_content,
    version_dict,
)


admin_email_bp = Blueprint("admin_email", __name__, url_prefix="/api/admin/emails")

_PERMISSION_BY_NAME = {
    "view": AdminPermission.EMAIL_VIEW,
    "edit": AdminPermission.EMAIL_EDIT,
    "publish": AdminPermission.EMAIL_PUBLISH,
    "rules": AdminPermission.EMAIL_RULES,
    "history": AdminPermission.EMAIL_HISTORY,
}


@admin_email_bp.after_request
def email_no_store(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@admin_email_bp.after_app_request
def email_app_no_store(response):
    if request.path.startswith("/api/admin/emails"):
        response.headers["Cache-Control"] = "no-store"
    return response


def _client_ip_prefix():
    try:
        address = ipaddress.ip_address(request.remote_addr or "")
    except ValueError:
        return None
    prefix = 24 if address.version == 4 else 64
    return str(ipaddress.ip_network(f"{address}/{prefix}", strict=False))


def _user_agent_hash():
    value = request.headers.get("User-Agent", "").strip()
    return hashlib.sha256(value.encode("utf-8")).hexdigest() if value else None


def _audit(action, template_id, *, details=None):
    """Queue metadata-only audit data in the same transaction as the mutation."""
    site = get_current_site()
    admin = _current_admin()
    db.session.add(
        AdminAuditEvent(
            site_id=site.id,
            actor_admin_id=admin.id if admin else None,
            action=action,
            target_type="email_template",
            target_id=str(template_id),
            details=dict(details or {}),
            ip_prefix=_client_ip_prefix(),
            user_agent_hash=_user_agent_hash(),
        )
    )


def _safe(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except TemplateValidationError as exc:
            db.session.rollback()
            return jsonify({"error": "Template inválido", "fields": exc.fields}), 422
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "Conflito ao persistir o template"}), 409
        except Exception as exc:
            db.session.rollback()
            exception_name = re.sub(r"[^A-Za-z0-9_.]", "_", type(exc).__name__)[:80]
            current_app.logger.error(
                "Admin email-template operation failed: %s", exception_name
            )
            return jsonify({"error": "Não foi possível concluir a operação"}), 500

    return wrapper


def _permission(*permissions, allow_non_operational=False, platform_only=False):
    """Require active regional admin plus every independent capability."""
    def decorator(view):
        @admin_required()
        @wraps(view)
        def wrapper(*args, **kwargs):
            admin = _current_admin()
            if any(not admin.has_permission(permission) for permission in permissions):
                return jsonify({"error": "Permissão administrativa insuficiente"}), 403
            site = get_current_site()
            if not allow_non_operational and str(site.country_code).upper() != "BR":
                return jsonify({"error": "Região/idioma não operacional nesta fase"}), 403
            if platform_only and not admin.is_platform_admin:
                return jsonify({"error": "Administração de plataforma necessária"}), 403
            return view(*args, **kwargs)

        return wrapper

    return decorator


def _json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"error": "O corpo da requisição deve ser um objeto JSON"}), 422)
    return data, None


def _body(data, allowed, required=()):
    """Reject privilege/identity/site/destination fields before any mutation."""
    unknown = sorted(set(data) - set(allowed))
    fields = {}
    if unknown:
        fields["body"] = "Campos não permitidos: " + ", ".join(unknown)
    for key in required:
        if key not in data:
            fields[key] = "é obrigatório"
    if fields:
        return None, (jsonify({"error": "Corpo inválido", "fields": fields}), 422)
    return data, None


def _revision(data):
    if type(data.get("revision")) is not int or data["revision"] < 0:
        return None, (jsonify({"error": "Corpo inválido", "fields": {"revision": "deve ser um inteiro não negativo"}}), 422)
    return data["revision"], None


def _version_number(data):
    if type(data.get("version")) is not int or data["version"] < 1:
        return None, (jsonify({"error": "Corpo inválido", "fields": {"version": "deve ser um inteiro positivo"}}), 422)
    return data["version"], None


def _locale(locale):
    if locale not in SUPPORTED_LOCALES:
        return None, (jsonify({"error": "Locale de template não suportado"}), 404)
    return locale, None


def _template(site, locale):
    return EmailTemplate.query.filter_by(
        site_id=site.id,
        locale=locale,
        key=TEMPLATE_KEY,
    ).first()


def _record(site, locale):
    return template_record(_template(site, locale) or memory_template(locale), site, locale)


def _empty_published_gate(template, site):
    if not template or template.is_inactive or not template.latest_version:
        return False
    version = template.latest_version
    try:
        validate_content(
            {
                "name": version.name,
                "subject": version.subject,
                "html": version.html,
                "text": version.text,
            },
            site,
        )
    except TemplateValidationError:
        return False
    return True


def _conflict(template, expected):
    actual = template.revision if template else 0
    return jsonify({
        "error": "Conflito de revisão; a edição local não foi sobrescrita",
        "expected_revision": expected,
        "current_revision": actual,
    }), 409


def _updated_values(data, admin_id):
    return {
        "draft_name": data["name"],
        "draft_subject": data["subject"],
        "draft_html": data["html"],
        "draft_text": data["text"],
        "revision": EmailTemplate.revision + 1,
        "updated_at": datetime.utcnow(),
        "updated_by_admin_id": admin_id,
    }


@admin_email_bp.route("/capabilities", methods=["GET"])
@_permission(allow_non_operational=True)
@_safe
def get_capabilities():
    site = get_current_site()
    admin = _current_admin()
    operational = str(site.country_code).upper() == "BR"
    return jsonify({
        "capabilities": {
            "view": operational and bool(admin.has_permission(AdminPermission.EMAIL_VIEW)),
            "edit": operational and bool(admin.has_permission(AdminPermission.EMAIL_EDIT)),
            "publish": operational and bool(admin.is_platform_admin) and bool(admin.has_permission(AdminPermission.EMAIL_PUBLISH)),
            "rules": operational and bool(admin.has_permission(AdminPermission.EMAIL_RULES)),
            "history": operational and bool(admin.has_permission(AdminPermission.EMAIL_HISTORY)),
            "test": False,
            "reason": None if operational else "Região/idioma não operacional nesta fase",
        },
        "site": {
            "code": site.code,
            "country_code": site.country_code.upper(),
            "name": site.name,
        },
        "dispatch": {
            "enabled": False,
            "status": "not_implemented",
            "reason": "Disparos de candidatura ainda não foram implementados.",
        },
        "variables": copy.deepcopy(VARIABLES),
    })


@admin_email_bp.route("/templates", methods=["GET"])
@_permission(AdminPermission.EMAIL_VIEW)
@_safe
def list_templates():
    site = get_current_site()
    return jsonify({
        "templates": [_record(site, locale) for locale in SUPPORTED_LOCALES],
        "total": 3,
    })


@admin_email_bp.route("/templates/<locale>/draft", methods=["PUT"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_EDIT)
@_safe
def save_draft(locale):
    locale, error = _locale(locale)
    if error:
        return error
    raw, error = _json_object()
    if error:
        return error
    data, error = _body(raw, ("revision", "name", "subject", "html", "text"), ("revision", "name", "subject", "html", "text"))
    if error:
        return error
    revision, error = _revision(data)
    if error:
        return error
    site = get_current_site()
    validated = validate_content(data, site)
    template = _template(site, locale)
    admin = _current_admin()
    if template is None:
        if revision != 0:
            return _conflict(None, revision)
        definition = CATALOG[locale]
        template = EmailTemplate(
            site_id=site.id,
            locale=locale,
            key=TEMPLATE_KEY,
            event=EVENT_KEY,
            audience=AUDIENCE,
            country_code=definition["country_code"],
            revision=1,
            draft_name=validated["name"],
            draft_subject=validated["subject"],
            draft_html=validated["html"],
            draft_text=validated["text"],
            updated_by_admin_id=admin.id,
        )
        db.session.add(template)
        db.session.flush()
    else:
        if template.revision != revision:
            return _conflict(template, revision)
        changed = EmailTemplate.query.filter_by(id=template.id, revision=revision).update(
            _updated_values(validated, admin.id), synchronize_session=False
        )
        if changed != 1:
            db.session.rollback()
            return _conflict(_template(site, locale), revision)
    _audit("email_template.draft_saved", template.id, details={"locale": locale, "revision": revision + 1})
    db.session.commit()
    return jsonify({
        "template": _record(site, locale),
        "message": "Rascunho salvo. Nenhum e-mail foi enviado.",
    })


@admin_email_bp.route("/templates/<locale>/preview", methods=["POST"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_EDIT)
@_safe
def preview_template(locale):
    locale, error = _locale(locale)
    if error:
        return error
    raw, error = _json_object()
    if error:
        return error
    data, error = _body(raw, ("name", "subject", "html", "text"), ("name", "subject", "html", "text"))
    if error:
        return error
    site = get_current_site()
    # Name is validated even though it is not rendered in the preview payload.
    validated = validate_content(data, site)
    rendered = render_content(validated, site, locale)
    return jsonify({
        "subject": rendered["subject"],
        "html": rendered["html"],
        "text": rendered["text"],
        "notice": "Prévia — dados fictícios; nenhum e-mail enviado",
    })


@admin_email_bp.route("/templates/<locale>/publish", methods=["POST"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_PUBLISH, platform_only=True)
@_safe
def publish_template(locale):
    locale, error = _locale(locale)
    if error:
        return error
    raw, error = _json_object()
    if error:
        return error
    data, error = _body(raw, ("revision",), ("revision",))
    if error:
        return error
    revision, error = _revision(data)
    if error:
        return error
    site = get_current_site()
    template = _template(site, locale)
    if template is None:
        return jsonify({"error": "Rascunho persistido não encontrado"}), 409
    if template.revision != revision:
        return _conflict(template, revision)
    draft = {
        "name": template.draft_name,
        "subject": template.draft_subject,
        "html": template.draft_html,
        "text": template.draft_text,
    }
    if not template.has_draft:
        return jsonify({"error": "Salve um rascunho antes de publicar"}), 409
    validated = validate_content(draft, site)
    next_version = (template.latest_version.version + 1) if template.latest_version else 1
    changed = EmailTemplate.query.filter_by(id=template.id, revision=revision).update(
        {
            "draft_name": None,
            "draft_subject": None,
            "draft_html": None,
            "draft_text": None,
            "is_inactive": False,
            "revision": EmailTemplate.revision + 1,
            "updated_at": datetime.utcnow(),
            "updated_by_admin_id": _current_admin().id,
        },
        synchronize_session=False,
    )
    if changed != 1:
        db.session.rollback()
        return _conflict(_template(site, locale), revision)
    db.session.add(
        EmailTemplateVersion(
            template_id=template.id,
            version=next_version,
            name=validated["name"],
            subject=validated["subject"],
            html=validated["html"],
            text=validated["text"],
            source_revision=revision + 1,
            author_admin_id=_current_admin().id,
        )
    )
    _audit("email_template.published", template.id, details={"locale": locale, "version": next_version, "revision": revision + 1})
    db.session.commit()
    return jsonify({
        "template": _record(site, locale),
        "message": "Template publicado. Nenhum disparo ou região foi ativado.",
    })


@admin_email_bp.route("/templates/<locale>/inactivate", methods=["POST"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_PUBLISH, platform_only=True)
@_safe
def inactivate_template(locale):
    locale, error = _locale(locale)
    if error:
        return error
    raw, error = _json_object()
    if error:
        return error
    data, error = _body(raw, ("revision",), ("revision",))
    if error:
        return error
    revision, error = _revision(data)
    if error:
        return error
    site = get_current_site()
    template = _template(site, locale)
    if template is None:
        return jsonify({"error": "Template persistido não encontrado"}), 404
    if template.revision != revision:
        return _conflict(template, revision)
    changed = EmailTemplate.query.filter_by(id=template.id, revision=revision).update(
        {
            "is_inactive": True,
            "revision": EmailTemplate.revision + 1,
            "updated_at": datetime.utcnow(),
            "updated_by_admin_id": _current_admin().id,
        },
        synchronize_session=False,
    )
    if changed != 1:
        db.session.rollback()
        return _conflict(_template(site, locale), revision)
    _audit("email_template.inactivated", template.id, details={"locale": locale, "revision": revision + 1})
    db.session.commit()
    return jsonify({
        "template": _record(site, locale),
        "message": "Template inativado. As versões foram preservadas e nenhum disparo foi realizado.",
    })


@admin_email_bp.route("/templates/<locale>/restore", methods=["POST"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_EDIT)
@_safe
def restore_template(locale):
    locale, error = _locale(locale)
    if error:
        return error
    raw, error = _json_object()
    if error:
        return error
    data, error = _body(raw, ("revision", "version"), ("revision", "version"))
    if error:
        return error
    revision, error = _revision(data)
    if error:
        return error
    version_number, error = _version_number(data)
    if error:
        return error
    site = get_current_site()
    template = _template(site, locale)
    if template is None:
        return jsonify({"error": "Template persistido não encontrado"}), 404
    if template.revision != revision:
        return _conflict(template, revision)
    version = EmailTemplateVersion.query.filter_by(template_id=template.id, version=version_number).first()
    if version is None:
        return jsonify({"error": "Versão não encontrada"}), 404
    changed = EmailTemplate.query.filter_by(id=template.id, revision=revision).update(
        {
            "draft_name": version.name,
            "draft_subject": version.subject,
            "draft_html": version.html,
            "draft_text": version.text,
            "revision": EmailTemplate.revision + 1,
            "updated_at": datetime.utcnow(),
            "updated_by_admin_id": _current_admin().id,
        },
        synchronize_session=False,
    )
    if changed != 1:
        db.session.rollback()
        return _conflict(_template(site, locale), revision)
    _audit("email_template.restored", template.id, details={"locale": locale, "version": version_number, "revision": revision + 1})
    db.session.commit()
    return jsonify({
        "template": _record(site, locale),
        "message": "Versão restaurada como novo rascunho. A versão anterior permaneceu imutável.",
    })


@admin_email_bp.route("/templates/<locale>/versions", methods=["GET"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_HISTORY)
@_safe
def list_versions(locale):
    locale, error = _locale(locale)
    if error:
        return error
    site = get_current_site()
    template = _template(site, locale)
    versions = [] if template is None else [version_dict(item) for item in template.versions]
    return jsonify({"versions": versions})


@admin_email_bp.route("/rules", methods=["GET"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_RULES)
@_safe
def list_rules():
    site = get_current_site()
    template = _template(site, "pt-BR")
    published_version = template.latest_version.version if template and template.latest_version else None
    published_safe = _empty_published_gate(template, site)
    gates = [
        {
            "key": "eligibility_duplicate",
            "label": "Elegibilidade e duplicidade da candidatura",
            "ready": False,
            "reason": "A integração do evento ainda não foi implementada.",
        },
        {
            "key": "eligible_recipient",
            "label": "Responsável principal elegível",
            "ready": False,
            "reason": "O responsável precisa ser revalidado no fluxo operacional.",
        },
        {
            "key": "published_template_safe",
            "label": "Template publicado e seguro",
            "ready": published_safe,
            "reason": None if published_safe else "É necessário publicar uma versão segura e manter o template ativo.",
        },
        {
            "key": "event_outbox_processor_history",
            "label": "Evento, outbox, processador e histórico",
            "ready": False,
            "reason": "Nenhum componente de disparo foi implementado nesta fase.",
        },
        {
            "key": "homologation_transport",
            "label": "Homologação e transporte autorizado",
            "ready": False,
            "reason": "O transporte não participa da Central nesta fase.",
        },
    ]
    return jsonify({
        "rules": [{
            "event": EVENT_KEY,
            "template_key": TEMPLATE_KEY,
            "audience": AUDIENCE,
            "country_code": "BR",
            "locale": "pt-BR",
            "origin": "Nova candidatura válida persistida",
            "recipient": "Responsável principal elegível da empresa/região",
            "enabled": False,
            "status": "not_implemented",
            "published_version": published_version,
            "gates": gates,
            "reason": "Disparos de candidatura ainda não foram implementados; nenhum e-mail é enviado.",
        }],
        "can_activate": False,
    })


@admin_email_bp.route("/history", methods=["GET"])
@_permission(AdminPermission.EMAIL_VIEW, AdminPermission.EMAIL_HISTORY)
@_safe
def list_history():
    return jsonify({
        "available": False,
        "records": [],
        "reason": "Histórico de envios ainda não implementado. Nenhum disparo é realizado por esta Central.",
    })
