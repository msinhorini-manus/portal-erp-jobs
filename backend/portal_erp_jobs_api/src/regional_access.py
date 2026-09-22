"""Authorization helpers bound to the server-resolved regional site."""
from __future__ import annotations

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity

from src.config import db
from src.models.candidate import Candidate, CandidateSite
from src.models.company import Company, CompanySite, CompanyStatus
from src.models.company_user import CompanyUser
from src.models.user import User
from src.regional_context import get_current_site


def _error(message, status):
    return jsonify({"error": message})


def validate_session_site():
    """Reject tokens not issued for the current server-resolved site."""
    site = get_current_site()
    claims = get_jwt()
    try:
        claim_site_id = int(claims.get("site_id"))
    except (TypeError, ValueError):
        return None, _error("Sessão regional inválida. Faça login novamente.", 401), 401
    if claim_site_id != site.id or claims.get("site_code") != site.code:
        return None, _error("Sessão não pertence a este site regional.", 403), 403
    return site, None, None


def get_active_user(expected_type=None):
    """Return the active global user after checking the regional token context."""
    site, error, status = validate_session_site()
    if error:
        return None, None, error, status
    claims = get_jwt()
    if expected_type and claims.get("user_type") != expected_type:
        return None, None, _error("Acesso negado.", 403), 403
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None, None, _error("Sessão inválida.", 401), 401
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return None, None, _error("Usuário inativo ou inexistente.", 403), 403
    if expected_type and user.user_type != expected_type:
        return None, None, _error("Acesso negado.", 403), 403
    return user, site, None, None


def ensure_company_site(company, site, *, status=CompanyStatus.PENDING):
    membership = CompanySite.query.filter_by(company_id=company.id, site_id=site.id).first()
    if membership:
        return membership
    membership = CompanySite(
        company_id=company.id,
        site_id=site.id,
        status=status,
        is_member=bool(company.is_member),
        max_active_jobs=max(0, company.max_active_jobs or 0),
        display_name=company.company_name,
        description=company.description,
        website=company.website,
        logo_url=company.logo_url,
        company_size=company.company_size,
        sector=company.sector,
        street_address=company.street_address,
        city=company.city,
        state=company.state,
        country=company.country,
        zip_code=company.zip_code,
    )
    db.session.add(membership)
    db.session.flush()
    return membership


def get_company_access(*, require_approved=False, permission=None):
    """Resolve company ownership/membership plus the CompanySite for this Host."""
    user, site, error, status = get_active_user("company")
    if error:
        return None, None, None, error, status

    company_user = CompanyUser.query.filter_by(user_id=user.id, is_active=True).first()
    if company_user:
        company = db.session.get(Company, company_user.company_id)
    else:
        company = Company.query.filter_by(user_id=user.id).first()

    if not company:
        return None, None, None, _error("Perfil de empresa não encontrado.", 404), 404

    membership = CompanySite.query.filter_by(company_id=company.id, site_id=site.id).first()
    if not membership:
        return None, None, None, _error("Empresa não disponível neste site.", 404), 404
    if require_approved and membership.status != CompanyStatus.APPROVED:
        return None, None, None, _error("Empresa ainda não está aprovada neste site.", 403), 403

    if permission and company_user:
        allowed = {
            "manage_jobs": company_user.can_manage_jobs,
            "view_candidates": company_user.can_view_candidates,
            "manage_users": company_user.can_manage_users,
        }.get(permission)
        if not allowed or not company_user.invitation_accepted:
            return None, None, None, _error("Permissão insuficiente.", 403), 403

    return company, membership, company_user, None, None


def ensure_candidate_site(candidate, site):
    membership = CandidateSite.query.filter_by(candidate_id=candidate.id, site_id=site.id).first()
    if membership:
        return membership
    membership = CandidateSite(
        candidate_id=candidate.id,
        site_id=site.id,
        is_active=True,
        is_discoverable=False,
        is_actively_looking=bool(candidate.is_actively_looking),
        available_immediately=bool(candidate.available_immediately),
        expected_salary=candidate.expected_salary,
        salary_currency=candidate.salary_currency or site.currency_code,
    )
    db.session.add(membership)
    db.session.flush()
    return membership


def get_candidate_access(*, require_active=True):
    """Resolve the authenticated candidate and its presence in the current site."""
    user, site, error, status = get_active_user("candidate")
    if error:
        return None, None, error, status
    candidate = Candidate.query.filter_by(user_id=user.id).first()
    if not candidate:
        return None, None, _error("Perfil de candidato não encontrado.", 404), 404
    membership = CandidateSite.query.filter_by(candidate_id=candidate.id, site_id=site.id).first()
    if not membership:
        return None, None, _error("Candidato não disponível neste site.", 404), 404
    if require_active and not membership.is_active:
        return None, None, _error("Candidato inativo neste site.", 403), 403
    return candidate, membership, None, None


def token_claims(user, site, *, company=None, candidate=None, admin=None):
    """Create the regional claims shared by access and refresh tokens."""
    claims = {
        "user_type": user.user_type,
        "site_id": site.id,
        "site_code": site.code,
    }
    if company is not None:
        claims["company_id"] = company.id
    if candidate is not None:
        claims["candidate_id"] = candidate.id
    if admin is not None:
        claims["admin_id"] = admin.id
    return claims
