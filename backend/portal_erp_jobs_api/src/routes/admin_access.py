"""Platform-only account access tools, always targeting current-site identities.

Schema 08 is sufficient. Company approval and team membership are deliberately
read-only here. See ACCESS_API_CONTRACT.md for the canonical frontend DTO.
"""
from functools import wraps
from urllib.parse import urlencode

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import or_

from src.config import db
from src.models import (
    AdminPermission, Candidate, CandidateSite, Company, CompanySite,
    CompanyStatus, CompanyUser, User,
)
from src.rate_limit import auth_rate_limiter
from src.regional_context import get_current_site
from src.routes.admin import (
    _audit_admin, _current_admin, _regional_user_query,
    admin_required, platform_admin_required,
)
from src.services.jobs import pagination_args, text_contains
from src.services.regional_urls import trusted_regional_base_url


admin_access_bp = Blueprint('admin_access', __name__, url_prefix='/api/admin')
MAX_REASON_LENGTH = 500
MAX_ADMIN_PASSWORD_LENGTH = 1024


@admin_access_bp.after_request
def access_no_store(response):
    # Includes validation/authorization failures, not just token-bearing success.
    response.headers['Cache-Control'] = 'no-store'
    return response


def _safe_operation(view):
    """Rollback the entire mutation/audit transaction without logging secrets."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except Exception:
            db.session.rollback()
            current_app.logger.error('Administrative account access operation failed')
            return jsonify({'error': 'Não foi possível concluir a operação de acesso'}), 500
    return wrapper


def _company_context(user, site):
    """Resolve a local membership even if inactive or awaiting invitation.

    A former local member may now belong to a company abroad. Never select that
    foreign company for this DTO. When historical local memberships coexist,
    prefer the active one, then an accepted invitation, then the oldest ID.
    """
    row = (
        db.session.query(CompanyUser, Company, CompanySite)
        .join(Company, Company.id == CompanyUser.company_id)
        .join(CompanySite, CompanySite.company_id == Company.id)
        .filter(CompanyUser.user_id == user.id, CompanySite.site_id == site.id)
        .order_by(
            CompanyUser.is_active.desc(), CompanyUser.invitation_accepted.desc(),
            CompanyUser.id.asc(),
        ).first()
    )
    if row:
        member, company, membership = row
        return company, membership, member
    # Legacy owner records can lack CompanyUser. This fallback grants no access
    # and does not synthesize or activate a corporate membership.
    row = (
        db.session.query(Company, CompanySite)
        .join(CompanySite, CompanySite.company_id == Company.id)
        .filter(Company.user_id == user.id, CompanySite.site_id == site.id)
        .order_by(Company.id.asc()).first()
    )
    if row:
        return row[0], row[1], None
    return None, None, None


def access_user_dto(user, site):
    """Canonical access DTO: regional_active excludes the global account flag."""
    payload = {
        'id': user.id, 'email': user.email, 'name': '',
        'user_type': user.user_type, 'global_active': bool(user.is_active),
        'login_locked': bool(user.is_locked()),
        'failed_login_attempts': user.failed_login_attempts or 0,
        'candidate_id': None, 'regional_active': False,
        'company_id': None, 'company_name': None, 'company_role': None,
        'company_member_active': None, 'company_status': None,
    }
    if user.user_type == 'candidate':
        row = (
            db.session.query(Candidate, CandidateSite)
            .join(CandidateSite, CandidateSite.candidate_id == Candidate.id)
            .filter(Candidate.user_id == user.id, CandidateSite.site_id == site.id)
            .first()
        )
        if row:
            candidate, membership = row
            payload.update({
                'name': f'{candidate.first_name} {candidate.last_name}'.strip(),
                'candidate_id': candidate.id,
                'regional_active': bool(membership.is_active),
            })
    elif user.user_type == 'company':
        company, membership, member = _company_context(user, site)
        if company:
            company_name = membership.display_name or company.company_name
            payload.update({
                'name': member.name if member else company_name,
                'company_id': company.id, 'company_name': company_name,
                'company_role': member.role if member else None,
                'company_member_active': bool(member.is_active) if member else None,
                'company_status': membership.status,
                'regional_active': membership.status == CompanyStatus.APPROVED,
            })
    return payload


def _scoped_target(user_id):
    return (
        _regional_user_query(get_current_site())
        .filter(User.id == user_id, User.user_type.in_(('candidate', 'company')))
        .with_for_update().first()
    )


def _reauth_target(user_id, *, requires_status=False):
    """Rate-limit all actions together; never mutate the actor on failed reauth."""
    admin = _current_admin()
    allowed, retry_after = auth_rate_limiter.check(
        scope='admin-access-actions',
        ip_address=request.remote_addr or 'unknown',
        email=str(admin.user_id),
        limit=current_app.config['AUTH_LOGIN_RATE_LIMIT'],
        window_seconds=current_app.config['AUTH_LOGIN_RATE_WINDOW'],
    )
    if not allowed:
        response = jsonify({'error': 'Muitas tentativas. Tente novamente mais tarde.'})
        response.headers['Retry-After'] = str(retry_after)
        return None, None, (response, 429)

    user = _scoped_target(user_id)
    if user is None:
        return None, None, (jsonify({'error': 'Usuário não encontrado'}), 404)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, None, (jsonify({'error': 'O corpo da requisição deve ser um objeto JSON'}), 400)
    reason = data.get('reason')
    if (
        not isinstance(reason, str) or not reason.strip()
        or len(reason) > MAX_REASON_LENGTH
        or any(ord(char) < 32 or ord(char) == 127 for char in reason)
    ):
        return None, None, (jsonify({'error': 'Motivo obrigatório, sem caracteres de controle e com até 500 caracteres'}), 400)
    if requires_status and type(data.get('is_active')) is not bool:
        return None, None, (jsonify({'error': 'is_active deve ser um booleano JSON'}), 400)
    password = data.get('admin_password')
    if (
        not isinstance(password, str) or not password
        or len(password) > MAX_ADMIN_PASSWORD_LENGTH
        or admin.user.is_locked() or not admin.user.check_password(password)
    ):
        return None, None, (jsonify({'error': 'Reautenticação administrativa inválida'}), 403)
    # Only metadata is retained for the justification, never its potentially
    # identifying free text (email, password, token, etc.).
    return user, {'reason_provided': True, 'reason_length': len(reason.strip())}, None


def _trusted_reset_origin(site):
    """Compatibility wrapper: security links use the regional base, not origin."""
    return trusted_regional_base_url(site)


@admin_access_bp.route('/access-capabilities', methods=['GET'])
@admin_required
@_safe_operation
def get_access_capabilities():
    admin = _current_admin()
    return jsonify({
        'is_platform_admin': bool(admin.is_platform_admin),
        'can_approve_companies': bool(admin.has_permission(AdminPermission.APPROVE_COMPANIES)),
    }), 200


@admin_access_bp.route('/access-users', methods=['GET'])
@platform_admin_required
@_safe_operation
def get_access_users():
    page, per_page, error = pagination_args()
    if error:
        return error
    user_type = request.args.get('type', '').strip()
    if user_type and user_type not in ('candidate', 'company'):
        return jsonify({'error': 'Tipo de usuário inválido'}), 400
    search = request.args.get('search', '').strip()
    if len(search) > 255:
        return jsonify({'error': 'Busca deve ter até 255 caracteres'}), 400
    site = get_current_site()
    query = _regional_user_query(site).filter(User.user_type.in_(('candidate', 'company')))
    if user_type:
        query = query.filter(User.user_type == user_type)
    if search:
        # EXISTS subqueries preserve one row per user and regional/company scope.
        candidate_match = (
            db.session.query(Candidate.id).join(CandidateSite)
            .filter(
                Candidate.user_id == User.id, CandidateSite.site_id == site.id,
                text_contains(Candidate.first_name + ' ' + Candidate.last_name, search),
            ).exists()
        )
        company_match = (
            db.session.query(Company.id).join(CompanySite)
            .filter(
                CompanySite.site_id == site.id,
                or_(
                    Company.user_id == User.id,
                    db.session.query(CompanyUser.id).filter(
                        CompanyUser.company_id == Company.id,
                        CompanyUser.user_id == User.id,
                    ).correlate(Company, User).exists(),
                ),
                or_(text_contains(Company.company_name, search), text_contains(CompanySite.display_name, search)),
            ).exists()
        )
        member_match = (
            db.session.query(CompanyUser.id).join(CompanySite, CompanySite.company_id == CompanyUser.company_id)
            .filter(
                CompanyUser.user_id == User.id, CompanySite.site_id == site.id,
                text_contains(CompanyUser.name, search),
            ).exists()
        )
        query = query.filter(or_(text_contains(User.email, search), candidate_match, company_match, member_match))
    pagination = query.order_by(User.created_at.desc(), User.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False,
    )
    return jsonify({
        'users': [access_user_dto(user, site) for user in pagination.items],
        'total': pagination.total, 'pages': pagination.pages, 'current_page': page,
    }), 200


@admin_access_bp.route('/access-users/<int:user_id>/global-status', methods=['PUT'])
@platform_admin_required
@_safe_operation
def set_global_status(user_id):
    user, details, error = _reauth_target(user_id, requires_status=True)
    if error:
        return error
    is_active = request.get_json()['is_active']
    previous_active = bool(user.is_active)
    user.is_active = is_active
    revoked = user.revoke_all_sessions() if not is_active or not previous_active else 0
    _audit_admin('user.global_status_changed', 'user', user.id, details={
        **details, 'scope': 'global', 'user_type': user.user_type,
        'previous_active': previous_active, 'is_active': is_active,
        'revoked_sessions': revoked,
    })
    payload = access_user_dto(user, get_current_site())
    db.session.commit()
    return jsonify({
        'message': 'Estado global atualizado. Aprovação regional e equipe permanecem inalteradas.',
        'user': payload, 'scope': 'global',
    }), 200


@admin_access_bp.route('/access-users/<int:user_id>/unlock', methods=['POST'])
@platform_admin_required
@_safe_operation
def unlock_access_user(user_id):
    user, details, error = _reauth_target(user_id)
    if error:
        return error
    user.failed_login_attempts = 0
    user.locked_until = None
    _audit_admin('user.login_unlocked', 'user', user.id, details={
        **details, 'scope': 'global', 'user_type': user.user_type,
    })
    payload = access_user_dto(user, get_current_site())
    db.session.commit()
    return jsonify({
        'message': 'Bloqueio de login removido. A conta e a aprovação regional não foram ativadas.',
        'user': payload, 'scope': 'global',
    }), 200


@admin_access_bp.route('/access-users/<int:user_id>/password-reset', methods=['POST'])
@platform_admin_required
@_safe_operation
def issue_access_password_reset(user_id):
    user, details, error = _reauth_target(user_id)
    if error:
        return error
    origin = _trusted_reset_origin(get_current_site())
    if not origin:
        return jsonify({'error': 'Origem segura de recuperação indisponível'}), 503
    token = user.generate_reset_token()
    # Fragments never reach HTTP servers/proxy logs. Next extracts it locally,
    # strips it with replaceState, and submits it only to the reset POST body.
    reset_url = f'{origin}/redefinir-senha?{urlencode({"type": user.user_type})}#{urlencode({"token": token})}'
    expires_at = user.reset_token_expires.isoformat(timespec='seconds') + 'Z'
    _audit_admin('user.password_reset_issued', 'user', user.id, details={
        **details, 'scope': 'global', 'user_type': user.user_type,
        'delivery': 'manual', 'expires_in_seconds': 3600,
    })
    db.session.commit()
    return jsonify({
        'message': 'Link de uso único gerado. Envie-o ao usuário por um canal seguro.',
        'reset_url': reset_url, 'expires_at': expires_at, 'delivery': 'manual',
    }), 200
