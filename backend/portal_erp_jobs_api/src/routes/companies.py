"""Regional company profile and public directory routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.config import db
from src.models.company import Company, CompanySite, CompanyStatus
from src.models.job import Job
from src.regional_access import get_company_access
from src.regional_context import get_current_site
from src.services.jobs import pagination_args, text_contains

companies_bp = Blueprint("companies", __name__, url_prefix="/api/companies")


def _approved_company_query(site):
    return (
        db.session.query(Company, CompanySite)
        .join(CompanySite, CompanySite.company_id == Company.id)
        .filter(
            CompanySite.site_id == site.id,
            CompanySite.status == CompanyStatus.APPROVED,
        )
    )


@companies_bp.route("/", methods=["GET"])
@jwt_required()
def get_company_profile():
    """Return the authenticated company's profile for the current site."""
    try:
        company, membership, company_user, error, status = get_company_access()
        if error:
            return error, status
        payload = company.to_dict(include_details=True, site_membership=membership)
        payload["membership"] = membership.to_dict()
        if company_user:
            payload["company_user"] = company_user.to_dict()
        return jsonify(payload), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@companies_bp.route("/", methods=["PUT"])
@jwt_required()
def update_company_profile():
    """Update global legal contact fields and site-local presentation fields."""
    try:
        company, membership, _, error, status = get_company_access()
        if error:
            return error, status
        data = request.get_json() or {}

        global_fields = {
            "company_name": "company_name",
            "name": "company_name",
            "trade_name": "company_name",
            "cnpj": "cnpj",
            "tax_id": "cnpj",
            "phone": "phone",
            "establishment_date": "establishment_date",
        }
        regional_fields = {
            "company_name": "display_name",
            "name": "display_name",
            "trade_name": "display_name",
            "description": "description",
            "website": "website",
            "logo_url": "logo_url",
            "company_size": "company_size",
            "size": "company_size",
            "sector": "sector",
            "street_address": "street_address",
            "address": "street_address",
            "city": "city",
            "state": "state",
            "country": "country",
            "zip_code": "zip_code",
        }
        for source, target in global_fields.items():
            if source in data:
                setattr(company, target, data[source])
        for source, target in regional_fields.items():
            if source in data:
                setattr(membership, target, data[source])

        db.session.commit()
        return jsonify({
            "message": "Perfil atualizado com sucesso",
            "company": company.to_dict(include_details=True, site_membership=membership),
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@companies_bp.route("/search", methods=["GET"])
def search_companies():
    """List only approved company presences in the current site."""
    try:
        site = get_current_site()
        query_text = request.args.get("q", "").strip()
        sector = request.args.get("sector", "").strip()
        city = request.args.get("city", "").strip()
        state = request.args.get("state", "").strip()
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error

        query = _approved_company_query(site)
        if query_text:
            query = query.filter(
                db.or_(
                    text_contains(CompanySite.display_name, query_text),
                    text_contains(Company.company_name, query_text),
                    text_contains(CompanySite.description, query_text),
                )
            )
        if sector:
            query = query.filter(text_contains(CompanySite.sector, sector))
        if city:
            query = query.filter(text_contains(CompanySite.city, city))
        if state:
            query = query.filter(text_contains(CompanySite.state, state))

        pagination = query.order_by(
            db.func.coalesce(CompanySite.display_name, Company.company_name)
        ).paginate(page=page, per_page=per_page, error_out=False)

        companies = []
        for company, membership in pagination.items:
            item = company.to_public_dict(membership)
            item["active_jobs_count"] = Job.query.filter_by(
                company_id=company.id,
                site_id=site.id,
                is_active=True,
            ).count()
            companies.append(item)

        return jsonify({
            "companies": companies,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@companies_bp.route("/<int:company_id>", methods=["GET"])
def get_public_company(company_id):
    """Return one approved company presence and its active jobs in this site."""
    try:
        site = get_current_site()
        result = _approved_company_query(site).filter(Company.id == company_id).first()
        if not result:
            return jsonify({"error": "Empresa não encontrada"}), 404
        company, membership = result
        jobs = Job.query.filter_by(
            company_id=company.id,
            site_id=site.id,
            is_active=True,
        ).order_by(Job.created_at.desc()).all()
        payload = company.to_public_dict(membership)
        payload["jobs"] = [job.to_dict() for job in jobs]
        payload["active_jobs_count"] = len(jobs)
        return jsonify(payload), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
