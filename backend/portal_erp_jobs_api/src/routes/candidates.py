"""Regional candidate profile, discovery and privacy routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.config import db
from src.models.application import Application
from src.models.candidate import Candidate, CandidateSite, CandidateSkill
from src.models.education import Education
from src.models.experience import Experience
from src.models.job import Job
from src.regional_access import get_candidate_access, get_company_access
from src.regional_context import get_current_site

candidates_bp = Blueprint("candidates", __name__, url_prefix="/api/candidates")


def _public_candidate_query(site):
    return (
        db.session.query(Candidate, CandidateSite)
        .join(CandidateSite, CandidateSite.candidate_id == Candidate.id)
        .filter(
            CandidateSite.site_id == site.id,
            CandidateSite.is_active.is_(True),
            CandidateSite.is_discoverable.is_(True),
        )
    )


def _public_profile(candidate, membership, *, include_resume=False):
    payload = candidate.to_public_dict(membership)
    if include_resume:
        payload["experiences"] = [item.to_dict() for item in candidate.experiences]
        payload["educations"] = [item.to_dict() for item in candidate.educations]
        payload["skills"] = [item.to_dict() for item in candidate.skills]
        payload["certifications"] = [item.to_dict() for item in candidate.certifications]
        payload["projects"] = [item.to_dict() for item in candidate.projects]
        payload["languages"] = [item.to_dict() for item in candidate.languages]
    return payload


@candidates_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_my_profile():
    """Return the candidate's private profile for the current site."""
    try:
        candidate, membership, error, status = get_candidate_access()
        if error:
            return error, status
        payload = candidate.to_dict(include_details=True, site_membership=membership)
        payload["email"] = candidate.user.email
        payload["site_membership"] = membership.to_dict()
        return jsonify(payload), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/profile", methods=["POST", "PUT"])
@jwt_required()
def create_or_update_profile():
    """Update global resume fields and site-local search preferences."""
    try:
        candidate, membership, error, status = get_candidate_access()
        if error:
            return error, status
        data = request.get_json() or {}

        global_fields = {
            "first_name": "first_name",
            "last_name": "last_name",
            "phone": "phone",
            "photo_url": "photo_url",
            "city": "city",
            "state": "state",
            "current_title": "current_title",
            "professional_summary": "professional_summary",
            "years_experience": "years_experience",
            "linkedin_url": "linkedin_url",
            "github_url": "github_url",
            "portfolio_url": "portfolio_url",
        }
        regional_fields = {
            "expected_salary": "expected_salary",
            "salary_currency": "salary_currency",
            "is_actively_looking": "is_actively_looking",
            "available_immediately": "available_immediately",
            "curriculo_publico": "is_discoverable",
            "is_discoverable": "is_discoverable",
        }
        for source, target in global_fields.items():
            if source in data:
                setattr(candidate, target, data[source])
        for source, target in regional_fields.items():
            if source in data:
                setattr(membership, target, data[source])

        db.session.commit()
        return jsonify({
            "message": "Perfil atualizado com sucesso",
            "candidate": candidate.to_dict(include_details=True, site_membership=membership),
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/search", methods=["GET"])
@jwt_required()
def search_candidates():
    """Search opt-in candidates as an approved company in the current site."""
    try:
        site = get_current_site()
        _, _, _, error, status = get_company_access(
            require_approved=True,
            permission="view_candidates",
        )
        if error:
            return error, status

        query_text = request.args.get("q", "").strip()
        city = request.args.get("city", "").strip()
        state = request.args.get("state", "").strip()
        min_salary = request.args.get("min_salary", type=int)
        max_salary = request.args.get("max_salary", type=int)
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 20, type=int), 100)

        query = _public_candidate_query(site).filter(CandidateSite.is_actively_looking.is_(True))
        if query_text:
            query = query.filter(db.or_(
                Candidate.first_name.ilike(f"%{query_text}%"),
                Candidate.last_name.ilike(f"%{query_text}%"),
                Candidate.current_title.ilike(f"%{query_text}%"),
            ))
        if city:
            query = query.filter(Candidate.city.ilike(f"%{city}%"))
        if state:
            query = query.filter(Candidate.state.ilike(f"%{state}%"))
        if min_salary is not None:
            query = query.filter(CandidateSite.expected_salary >= min_salary)
        if max_salary is not None:
            query = query.filter(CandidateSite.expected_salary <= max_salary)

        pagination = query.order_by(Candidate.updated_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
        return jsonify({
            "candidates": [
                _public_profile(candidate, membership)
                for candidate, membership in pagination.items
            ],
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/<int:candidate_id>", methods=["GET"])
@jwt_required()
def get_candidate_by_id(candidate_id):
    """Return a candidate to an approved company when discoverable or already applied."""
    try:
        site = get_current_site()
        company, _, _, error, status = get_company_access(
            require_approved=True,
            permission="view_candidates",
        )
        if error:
            return error, status

        result = (
            db.session.query(Candidate, CandidateSite)
            .join(CandidateSite, CandidateSite.candidate_id == Candidate.id)
            .filter(
                Candidate.id == candidate_id,
                CandidateSite.site_id == site.id,
                CandidateSite.is_active.is_(True),
            )
            .first()
        )
        if not result:
            return jsonify({"error": "Candidato não encontrado"}), 404
        candidate, membership = result

        has_application = (
            db.session.query(Application.id)
            .join(Job, Application.job_id == Job.id)
            .filter(
                Application.candidate_id == candidate.id,
                Application.site_id == site.id,
                Job.company_id == company.id,
            )
            .first()
            is not None
        )
        if not membership.is_discoverable and not has_application:
            return jsonify({"error": "Este perfil é privado"}), 403

        if has_application:
            payload = candidate.to_dict(include_details=True, site_membership=membership)
            payload["email"] = candidate.user.email
            return jsonify(payload), 200
        return jsonify(_public_profile(candidate, membership, include_resume=True)), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/<int:candidate_id>/profile", methods=["GET"])
def get_candidate_public_profile(candidate_id):
    """Return an opt-in public resume without contact PII."""
    try:
        site = get_current_site()
        result = _public_candidate_query(site).filter(Candidate.id == candidate_id).first()
        if not result:
            return jsonify({"error": "Perfil não encontrado ou privado"}), 404
        candidate, membership = result
        return jsonify(_public_profile(candidate, membership, include_resume=True)), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/me/privacy", methods=["PATCH"])
@jwt_required()
def update_candidate_privacy():
    """Update discoverability only for the current regional site."""
    try:
        _, membership, error, status = get_candidate_access()
        if error:
            return error, status
        data = request.get_json() or {}
        value = data.get("curriculo_publico", data.get("is_discoverable"))
        if value is None:
            return jsonify({"error": "Campo curriculo_publico é obrigatório"}), 400
        membership.is_discoverable = bool(value)
        db.session.commit()
        return jsonify({
            "message": "Configuração de privacidade atualizada com sucesso",
            "curriculo_publico": membership.is_discoverable,
            "is_discoverable": membership.is_discoverable,
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/public", methods=["GET"])
def get_public_candidates():
    """List public candidate projections for the current site only."""
    try:
        site = get_current_site()
        query_text = request.args.get("q", "").strip()
        city = request.args.get("city", "").strip()
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 20, type=int), 100)

        query = _public_candidate_query(site)
        if query_text:
            query = query.filter(db.or_(
                Candidate.first_name.ilike(f"%{query_text}%"),
                Candidate.last_name.ilike(f"%{query_text}%"),
                Candidate.current_title.ilike(f"%{query_text}%"),
            ))
        if city:
            query = query.filter(Candidate.city.ilike(f"%{city}%"))

        pagination = query.order_by(Candidate.updated_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
        return jsonify({
            "candidates": [
                _public_profile(candidate, membership)
                for candidate, membership in pagination.items
            ],
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@candidates_bp.route("/me/privacy", methods=["GET"])
@jwt_required()
def get_candidate_privacy():
    """Return the privacy setting for this site only."""
    try:
        _, membership, error, status = get_candidate_access()
        if error:
            return error, status
        return jsonify({
            "curriculo_publico": membership.is_discoverable,
            "is_discoverable": membership.is_discoverable,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
