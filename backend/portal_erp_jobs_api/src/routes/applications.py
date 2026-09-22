"""Regional application routes for candidates and companies."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import and_

from src.config import db
from src.models.application import Application, ApplicationStatus
from src.models.candidate import CandidateSite
from src.models.company import CompanySite, CompanyStatus
from src.models.job import Job
from src.regional_access import get_candidate_access, get_company_access
from src.regional_context import get_current_site

applications_bp = Blueprint("applications", __name__, url_prefix="/api/applications")


def _approved_job_query(site):
    return (
        Job.query
        .join(
            CompanySite,
            and_(
                CompanySite.company_id == Job.company_id,
                CompanySite.site_id == Job.site_id,
            ),
        )
        .filter(
            Job.site_id == site.id,
            CompanySite.status == CompanyStatus.APPROVED,
        )
    )


def _application_payload(application, *, include_candidate=False, include_history=False):
    data = application.to_dict(include_history=include_history)
    data["job"] = {
        "id": application.job.id,
        "title": application.job.title,
        "company_name": application.job.company.company_name if application.job.company else None,
        "city": application.job.city,
        "state": application.job.state,
        "work_modality": application.job.work_modality,
    }
    if include_candidate:
        presence = CandidateSite.query.filter_by(
            candidate_id=application.candidate_id,
            site_id=application.site_id,
        ).first()
        candidate_data = application.candidate.to_dict(
            include_details=True,
            site_membership=presence,
        )
        candidate_data["email"] = application.candidate.user.email
        data["candidate"] = candidate_data
    return data


@applications_bp.route("/", methods=["POST"])
@jwt_required()
def apply_to_job():
    """Create a same-site application for the authenticated candidate."""
    try:
        site = get_current_site()
        candidate, candidate_site, error, status = get_candidate_access()
        if error:
            return error, status

        data = request.get_json() or {}
        job_id = data.get("job_id")
        if not job_id:
            return jsonify({"error": "ID da vaga é obrigatório"}), 400

        job = _approved_job_query(site).filter(Job.id == job_id, Job.is_active.is_(True)).first()
        if not job:
            return jsonify({"error": "Vaga não encontrada ou não está ativa"}), 404

        existing = Application.query.filter_by(
            job_id=job.id,
            candidate_id=candidate.id,
            site_id=site.id,
        ).first()
        if existing:
            return jsonify({"error": "Você já se candidatou a esta vaga"}), 409

        application = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            site_id=site.id,
            status=ApplicationStatus.APPLIED,
        )
        db.session.add(application)
        db.session.flush()
        application.add_created_event(int(get_jwt_identity()), "candidate")
        db.session.commit()

        return jsonify({
            "message": "Candidatura enviada com sucesso",
            "application": _application_payload(application, include_history=True),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@applications_bp.route("/", methods=["GET"])
@applications_bp.route("/my-applications", methods=["GET"])
@jwt_required()
def get_my_applications():
    """List only the candidate's applications in the current site."""
    try:
        site = get_current_site()
        candidate, _, error, status = get_candidate_access()
        if error:
            return error, status

        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 20, type=int), 100)
        status_filter = ApplicationStatus.normalize(request.args.get("status"))

        query = Application.query.filter_by(candidate_id=candidate.id, site_id=site.id)
        if status_filter:
            if status_filter not in ApplicationStatus.ALL:
                return jsonify({"error": "Status inválido"}), 400
            query = query.filter_by(status=status_filter)

        pagination = query.order_by(Application.applied_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
        return jsonify({
            "applications": [_application_payload(item) for item in pagination.items],
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@applications_bp.route("/<int:application_id>", methods=["GET"])
@jwt_required()
def get_application(application_id):
    """Return one application only to its candidate owner in this site."""
    try:
        site = get_current_site()
        candidate, _, error, status = get_candidate_access()
        if error:
            return error, status

        application = Application.query.filter_by(
            id=application_id,
            candidate_id=candidate.id,
            site_id=site.id,
        ).first()
        if not application:
            return jsonify({"error": "Candidatura não encontrada"}), 404
        return jsonify(_application_payload(application, include_history=True)), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@applications_bp.route("/<int:application_id>/status", methods=["PUT"])
@applications_bp.route("/<int:application_id>", methods=["PUT"])
@jwt_required()
def update_application_status(application_id):
    """Allow an approved company to transition an application for its own job."""
    try:
        site = get_current_site()
        company, _, _, error, status_code = get_company_access(
            require_approved=True,
            permission="view_candidates",
        )
        if error:
            return error, status_code

        application = (
            Application.query
            .join(Job, Application.job_id == Job.id)
            .filter(
                Application.id == application_id,
                Application.site_id == site.id,
                Job.site_id == site.id,
                Job.company_id == company.id,
            )
            .first()
        )
        if not application:
            return jsonify({"error": "Candidatura não encontrada"}), 404

        data = request.get_json() or {}
        requested_status = ApplicationStatus.normalize(data.get("status"))
        if requested_status not in ApplicationStatus.ALL:
            return jsonify({"error": "Status inválido"}), 400
        if not application.can_transition_to(requested_status):
            return jsonify({
                "error": f"Transição inválida: {application.status} -> {requested_status}",
            }), 409

        application.transition_to(
            requested_status,
            int(get_jwt_identity()),
            "company",
            reason=data.get("reason"),
        )
        db.session.commit()
        return jsonify({
            "message": "Status atualizado com sucesso",
            "application": _application_payload(application, include_history=True),
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@applications_bp.route("/<int:application_id>", methods=["DELETE"])
@jwt_required()
def withdraw_application(application_id):
    """Withdraw, rather than destroy, a candidate-owned application."""
    try:
        site = get_current_site()
        candidate, _, error, status = get_candidate_access()
        if error:
            return error, status

        application = Application.query.filter_by(
            id=application_id,
            candidate_id=candidate.id,
            site_id=site.id,
        ).first()
        if not application:
            return jsonify({"error": "Candidatura não encontrada"}), 404
        if application.status == ApplicationStatus.WITHDRAWN:
            return jsonify({"message": "Candidatura já retirada"}), 200
        if not application.can_transition_to(ApplicationStatus.WITHDRAWN):
            return jsonify({"error": "Esta candidatura não pode mais ser retirada"}), 409

        application.transition_to(
            ApplicationStatus.WITHDRAWN,
            int(get_jwt_identity()),
            "candidate",
        )
        db.session.commit()
        return jsonify({"message": "Candidatura retirada com sucesso"}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@applications_bp.route("/company", methods=["GET"])
@jwt_required()
def get_company_applications():
    """List candidates only for the approved company's jobs in this site."""
    try:
        site = get_current_site()
        company, _, _, error, status_code = get_company_access(
            require_approved=True,
            permission="view_candidates",
        )
        if error:
            return error, status_code

        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 20, type=int), 100)
        status_filter = ApplicationStatus.normalize(request.args.get("status"))
        job_id = request.args.get("job_id", type=int)

        query = (
            Application.query
            .join(Job, Application.job_id == Job.id)
            .filter(
                Application.site_id == site.id,
                Job.site_id == site.id,
                Job.company_id == company.id,
            )
        )
        if status_filter:
            if status_filter not in ApplicationStatus.ALL:
                return jsonify({"error": "Status inválido"}), 400
            query = query.filter(Application.status == status_filter)
        if job_id:
            query = query.filter(Application.job_id == job_id)

        pagination = query.order_by(Application.applied_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
        return jsonify({
            "applications": [
                _application_payload(item, include_candidate=True)
                for item in pagination.items
            ],
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
