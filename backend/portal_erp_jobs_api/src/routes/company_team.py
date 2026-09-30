"""Secure company-team management scoped to the current regional site."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from urllib.parse import quote

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.config import db
from src.models.company_team import CompanyAuditEvent, CompanyInvitation, CompanyInvitationStatus
from src.models.company_user import CompanyUser, CompanyUserRole
from src.models.session_family import SessionFamily
from src.models.user import User
from src.regional_access import get_company_access
from src.regional_context import get_current_site
from src.rate_limit import auth_rate_limiter
from src.services.email import EmailDeliveryUnavailable, configured_email_provider, send_company_invitation_email


company_team_bp = Blueprint("company_team", __name__, url_prefix="/api/company-team")
ROLES = (CompanyUserRole.OWNER, CompanyUserRole.ADMIN, CompanyUserRole.HR, CompanyUserRole.VIEWER)
INVITABLE_BY_ADMIN = (CompanyUserRole.HR, CompanyUserRole.VIEWER)
INVITATION_TTL = timedelta(hours=72)


def _json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"error": "O corpo da requisição deve ser um objeto JSON"}), 400)
    return data, None


def _token_hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _masked_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1] or '*'}***@{domain}"


def _audit(company_id, site_id, actor_user_id, event_type, *, target_user_id=None, details=None):
    db.session.add(CompanyAuditEvent(
        company_id=company_id,
        site_id=site_id,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        event_type=event_type,
        details=details or {},
    ))


def _permissions(member: CompanyUser):
    return {
        "view_jobs": member.can_view_jobs(),
        "manage_jobs": member.can_manage_jobs(),
        "view_candidates": member.can_view_candidates(),
        "manage_candidates": member.can_manage_candidates(),
        "manage_company": member.can_manage_company(),
        "manage_users": member.can_manage_users(),
    }


def _member_payload(member: CompanyUser):
    payload = member.to_dict()
    payload["email"] = member.user.email
    payload["permissions"] = _permissions(member)
    return payload


def _can_assign(actor: CompanyUser, role: str) -> bool:
    if actor.role == CompanyUserRole.OWNER:
        return role in ROLES
    return actor.role == CompanyUserRole.ADMIN and role in INVITABLE_BY_ADMIN


def _active_owner_count(company_id: int) -> int:
    return CompanyUser.query.filter_by(
        company_id=company_id,
        role=CompanyUserRole.OWNER,
        is_active=True,
        invitation_accepted=True,
    ).count()


def _send_invitation(invitation: CompanyInvitation, raw_token: str, company_name: str, site) -> tuple[str, str]:
    invitation_url = f"{site.canonical_origin.rstrip('/')}/empresa/convite/{quote(raw_token)}"
    if configured_email_provider() is None:
        return "manual", invitation_url
    try:
        send_company_invitation_email(
            recipient=invitation.email,
            invitation_url=invitation_url,
            company_name=company_name,
            role=invitation.role,
            site_name="Portal ERP Jobs",
        )
        return "email", invitation_url
    except EmailDeliveryUnavailable:
        current_app.logger.warning("Company invitation email delivery failed")
        return "manual", invitation_url


@company_team_bp.route("/members", methods=["GET"])
@jwt_required()
def list_members():
    company, _, current_member, error, status = get_company_access(permission="manage_users")
    if error:
        return error, status
    members = CompanyUser.query.filter_by(company_id=company.id).order_by(
        CompanyUser.is_active.desc(), CompanyUser.created_at.asc()
    ).all()
    invitations = CompanyInvitation.query.filter_by(
        company_id=company.id,
        status=CompanyInvitationStatus.PENDING,
    ).order_by(CompanyInvitation.created_at.desc()).all()
    now = datetime.utcnow()
    for invitation in invitations:
        if invitation.expires_at <= now:
            invitation.status = CompanyInvitationStatus.EXPIRED
    db.session.commit()
    invitations = [item for item in invitations if item.status == CompanyInvitationStatus.PENDING]
    return jsonify({
        "members": [_member_payload(item) for item in members],
        "invitations": [item.to_dict() for item in invitations],
        "current_member_id": current_member.id,
        "current_role": current_member.role,
        "permissions": _permissions(current_member),
    }), 200


@company_team_bp.route("/invitations", methods=["POST"])
@jwt_required()
def create_invitation():
    company, _, actor, error, status = get_company_access(require_approved=True, permission="manage_users")
    if error:
        return error, status
    data, payload_error = _json_object()
    if payload_error:
        return payload_error
    email = str(data.get("email") or "").strip().lower()
    name = str(data.get("name") or "").strip()
    position = str(data.get("position") or "").strip() or None
    role = str(data.get("role") or "").strip().lower()
    if not email or "@" not in email or not name:
        return jsonify({"error": "Nome e e-mail válidos são obrigatórios"}), 400
    if role == CompanyUserRole.OWNER or role not in ROLES or not _can_assign(actor, role):
        return jsonify({"error": "Papel inválido ou não permitido"}), 403

    existing_user = User.query.filter(db.func.lower(User.email) == email).first()
    if existing_user and existing_user.user_type != "company":
        return jsonify({"error": "Este e-mail não pode ser convidado para uma equipe empresarial"}), 409
    if existing_user and CompanyUser.query.filter_by(user_id=existing_user.id, is_active=True).first():
        return jsonify({"error": "Este e-mail já pertence a uma equipe empresarial ativa"}), 409

    invitation = CompanyInvitation.query.filter_by(
        company_id=company.id,
        site_id=get_current_site().id,
        email=email,
        status=CompanyInvitationStatus.PENDING,
    ).first()
    raw_token = secrets.token_urlsafe(32)
    if invitation is None:
        invitation = CompanyInvitation(
            company_id=company.id,
            site_id=get_current_site().id,
            email=email,
            name=name,
            role=role,
            position=position,
            token_hash=_token_hash(raw_token),
            status=CompanyInvitationStatus.PENDING,
            expires_at=datetime.utcnow() + INVITATION_TTL,
            invited_by_user_id=int(get_jwt_identity()),
        )
        db.session.add(invitation)
    else:
        invitation.name = name
        invitation.role = role
        invitation.position = position
        invitation.token_hash = _token_hash(raw_token)
        invitation.expires_at = datetime.utcnow() + INVITATION_TTL
        invitation.invited_by_user_id = int(get_jwt_identity())
        invitation.updated_at = datetime.utcnow()
    db.session.flush()
    delivery, invitation_url = _send_invitation(invitation, raw_token, company.company_name, get_current_site())
    _audit(company.id, get_current_site().id, int(get_jwt_identity()), "invitation.created", details={
        "invitation_id": invitation.id,
        "role": role,
        "delivery": delivery,
    })
    db.session.commit()
    response = {
        "message": "Convite criado com sucesso",
        "invitation": invitation.to_dict(),
        "delivery": delivery,
    }
    if delivery == "manual":
        response["invitation_url"] = invitation_url
    return jsonify(response), 201


@company_team_bp.route("/invitations/<int:invitation_id>/resend", methods=["POST"])
@jwt_required()
def resend_invitation(invitation_id):
    company, _, actor, error, status = get_company_access(require_approved=True, permission="manage_users")
    if error:
        return error, status
    invitation = CompanyInvitation.query.filter_by(id=invitation_id, company_id=company.id).first()
    if not invitation or invitation.status != CompanyInvitationStatus.PENDING:
        return jsonify({"error": "Convite pendente não encontrado"}), 404
    if not _can_assign(actor, invitation.role):
        return jsonify({"error": "Você não pode reenviar este convite"}), 403
    raw_token = secrets.token_urlsafe(32)
    invitation.token_hash = _token_hash(raw_token)
    invitation.expires_at = datetime.utcnow() + INVITATION_TTL
    invitation.invited_by_user_id = int(get_jwt_identity())
    invitation.updated_at = datetime.utcnow()
    delivery, invitation_url = _send_invitation(invitation, raw_token, company.company_name, get_current_site())
    _audit(company.id, get_current_site().id, int(get_jwt_identity()), "invitation.resent", details={
        "invitation_id": invitation.id,
        "delivery": delivery,
    })
    db.session.commit()
    response = {
        "message": "Convite renovado",
        "invitation": invitation.to_dict(),
        "delivery": delivery,
    }
    if delivery == "manual":
        response["invitation_url"] = invitation_url
    return jsonify(response), 200


@company_team_bp.route("/invitations/<int:invitation_id>", methods=["DELETE"])
@jwt_required()
def cancel_invitation(invitation_id):
    company, _, actor, error, status = get_company_access(permission="manage_users")
    if error:
        return error, status
    invitation = CompanyInvitation.query.filter_by(id=invitation_id, company_id=company.id).first()
    if not invitation or invitation.status != CompanyInvitationStatus.PENDING:
        return jsonify({"error": "Convite pendente não encontrado"}), 404
    if not _can_assign(actor, invitation.role):
        return jsonify({"error": "Você não pode cancelar este convite"}), 403
    invitation.status = CompanyInvitationStatus.CANCELLED
    invitation.token_hash = _token_hash(secrets.token_urlsafe(32))
    _audit(company.id, get_current_site().id, int(get_jwt_identity()), "invitation.cancelled", details={
        "invitation_id": invitation.id,
    })
    db.session.commit()
    return jsonify({"message": "Convite cancelado"}), 200


@company_team_bp.route("/invitations/<string:raw_token>", methods=["GET", "POST"])
def invitation_detail_or_accept(raw_token):
    allowed, retry_after = auth_rate_limiter.check(
        scope=f"company-invitation-{request.method.lower()}",
        ip_address=request.remote_addr or "unknown",
        email=_token_hash(raw_token)[:16],
        limit=30 if request.method == "GET" else 10,
        window_seconds=15 * 60,
    )
    if not allowed:
        response = jsonify({"error": "Muitas tentativas. Tente novamente mais tarde."})
        response.headers["Retry-After"] = str(retry_after)
        return response, 429
    site = get_current_site()
    invitation = CompanyInvitation.query.filter_by(
        token_hash=_token_hash(raw_token),
        site_id=site.id,
        status=CompanyInvitationStatus.PENDING,
    ).first()
    if not invitation or invitation.expires_at <= datetime.utcnow():
        if invitation and invitation.status == CompanyInvitationStatus.PENDING:
            invitation.status = CompanyInvitationStatus.EXPIRED
            db.session.commit()
        return jsonify({"error": "Convite inválido ou expirado"}), 404
    if request.method == "GET":
        return jsonify({
            "invitation": {
                "email": _masked_email(invitation.email),
                "name": invitation.name,
                "position": invitation.position,
                "role": invitation.role,
                "expires_at": invitation.expires_at.isoformat(),
            },
            "company_name": invitation.company.company_name,
            "existing_user": User.query.filter(db.func.lower(User.email) == invitation.email).first() is not None,
        }), 200

    data, payload_error = _json_object()
    if payload_error:
        return payload_error
    from src.routes.auth import LEGAL_DOCUMENT_VERSION, _legal_consent_error, _password_policy_error, _record_legal_acceptances
    consent_error = _legal_consent_error(data)
    if consent_error:
        return jsonify({"error": consent_error}), 400
    password = str(data.get("password") or "")
    user = User.query.filter(db.func.lower(User.email) == invitation.email).first()
    if user:
        if user.user_type != "company" or not user.check_password(password):
            return jsonify({"error": "Não foi possível aceitar o convite"}), 401
        if CompanyUser.query.filter_by(user_id=user.id, is_active=True).first():
            return jsonify({"error": "Este usuário já pertence a uma equipe empresarial ativa"}), 409
    else:
        password_error = _password_policy_error(password)
        if password_error:
            return jsonify({"error": password_error}), 400
        user = User(email=invitation.email, user_type="company", is_active=True, is_verified=True)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

    existing_acceptances = {
        item.document_type
        for item in user.legal_acceptances
        if item.site_id == site.id and item.document_version == LEGAL_DOCUMENT_VERSION
    } if hasattr(user, "legal_acceptances") else set()
    if existing_acceptances != {"terms", "privacy"}:
        _record_legal_acceptances(user, site)

    member = CompanyUser.query.filter_by(company_id=invitation.company_id, user_id=user.id).first()
    if member is None:
        member = CompanyUser(company_id=invitation.company_id, user_id=user.id)
        db.session.add(member)
    member.role = invitation.role
    member.name = invitation.name
    member.position = invitation.position
    member.is_active = True
    member.invitation_accepted = True
    invitation.status = CompanyInvitationStatus.ACCEPTED
    invitation.accepted_by_user_id = user.id
    invitation.accepted_at = datetime.utcnow()
    invitation.token_hash = _token_hash(secrets.token_urlsafe(32))
    _audit(invitation.company_id, site.id, user.id, "invitation.accepted", target_user_id=user.id, details={
        "invitation_id": invitation.id,
        "role": invitation.role,
    })
    db.session.commit()
    return jsonify({"message": "Convite aceito. Faça login para acessar a empresa."}), 200


@company_team_bp.route("/members/<int:member_id>", methods=["PATCH"])
@jwt_required()
def update_member(member_id):
    company, _, actor, error, status = get_company_access(permission="manage_users")
    if error:
        return error, status
    target = CompanyUser.query.filter_by(id=member_id, company_id=company.id).first()
    if not target:
        return jsonify({"error": "Membro não encontrado"}), 404
    if actor.role == CompanyUserRole.ADMIN and target.role in (CompanyUserRole.OWNER, CompanyUserRole.ADMIN):
        return jsonify({"error": "Administradores não podem alterar owners ou outros administradores"}), 403
    data, payload_error = _json_object()
    if payload_error:
        return payload_error
    if "is_active" in data and not isinstance(data["is_active"], bool):
        return jsonify({"error": "is_active deve ser booleano"}), 400
    new_role = str(data.get("role", target.role)).strip().lower()
    new_active = bool(data.get("is_active", target.is_active))
    if new_role not in ROLES or not _can_assign(actor, new_role):
        return jsonify({"error": "Papel inválido ou não permitido"}), 403
    if target.id == actor.id and not new_active:
        return jsonify({"error": "Você não pode desativar seu próprio acesso"}), 409
    if target.role == CompanyUserRole.OWNER and (new_role != CompanyUserRole.OWNER or not new_active):
        if _active_owner_count(company.id) <= 1:
            return jsonify({"error": "A empresa precisa manter ao menos um owner ativo"}), 409

    old = {"role": target.role, "is_active": target.is_active}
    target.role = new_role
    target.is_active = new_active
    if "name" in data:
        name = str(data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Nome não pode ficar vazio"}), 400
        target.name = name
    if "position" in data:
        target.position = str(data.get("position") or "").strip() or None
    if old != {"role": target.role, "is_active": target.is_active}:
        SessionFamily.revoke_all_for_user(target.user_id)
    _audit(company.id, get_current_site().id, int(get_jwt_identity()), "member.updated", target_user_id=target.user_id, details={
        "member_id": target.id,
        "from": old,
        "to": {"role": target.role, "is_active": target.is_active},
    })
    db.session.commit()
    return jsonify({"message": "Membro atualizado", "member": _member_payload(target)}), 200


@company_team_bp.route("/members/<int:member_id>", methods=["DELETE"])
@jwt_required()
def deactivate_member(member_id):
    company, _, actor, error, status = get_company_access(permission="manage_users")
    if error:
        return error, status
    target = CompanyUser.query.filter_by(id=member_id, company_id=company.id).first()
    if not target:
        return jsonify({"error": "Membro não encontrado"}), 404
    if target.id == actor.id:
        return jsonify({"error": "Você não pode remover seu próprio acesso"}), 409
    if actor.role == CompanyUserRole.ADMIN and target.role in (CompanyUserRole.OWNER, CompanyUserRole.ADMIN):
        return jsonify({"error": "Administradores não podem remover owners ou administradores"}), 403
    if target.role == CompanyUserRole.OWNER and _active_owner_count(company.id) <= 1:
        return jsonify({"error": "A empresa precisa manter ao menos um owner ativo"}), 409
    if not target.is_active:
        return jsonify({"message": "Membro já estava inativo"}), 200
    target.is_active = False
    SessionFamily.revoke_all_for_user(target.user_id)
    _audit(company.id, get_current_site().id, int(get_jwt_identity()), "member.deactivated", target_user_id=target.user_id, details={"member_id": target.id})
    db.session.commit()
    return jsonify({"message": "Acesso removido"}), 200


@company_team_bp.route("/audit", methods=["GET"])
@jwt_required()
def list_audit():
    company, _, _, error, status = get_company_access(permission="manage_users")
    if error:
        return error, status
    events = CompanyAuditEvent.query.filter_by(
        company_id=company.id,
        site_id=get_current_site().id,
    ).order_by(CompanyAuditEvent.created_at.desc()).limit(100).all()
    return jsonify({"events": [event.to_dict() for event in events]}), 200
