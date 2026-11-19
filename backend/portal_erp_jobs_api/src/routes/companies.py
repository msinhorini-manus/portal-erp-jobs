"""Regional company profile and public directory routes."""
from flask import Blueprint, current_app, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from werkzeug.exceptions import RequestEntityTooLarge

from src.config import db
from src.models.company import Company, CompanySite
from src.models.job import Job
from src.company_slug_policy_v12 import valid_slug
from src.regional_access import get_company_access
from src.regional_context import get_current_site
from src.services.jobs import pagination_args, text_contains
from src.company_logo_storage import (
    LogoValidationError, logo_url, open_logo, read_logo_upload, store_logo,
)
from src.services.public_job_counts import (
    public_companies_query, public_company_jobs_query, company_job_counts,
    directory_loading_options, VerifiedPublicMembership,
)

companies_bp = Blueprint("companies", __name__, url_prefix="/api/companies")


def _public_response(payload, status=200):
    response = jsonify(payload)
    response.status_code = status
    response.headers["Cache-Control"] = "no-store"
    return response


def _approved_company_query(site):
    return public_companies_query(site)


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
        company, membership, _, error, status = get_company_access(permission="manage_company")
        if error:
            return error, status
        data = request.get_json() or {}

        # Managed files may only be attached by upload, not by copying another
        # presence's URL. Complete DTO updates may keep their unchanged logo.
        supplied_logo = data.get("logo_url")
        if isinstance(supplied_logo, str) and "/api/companies/logos/" in supplied_logo:
            if supplied_logo != membership.logo_url:
                return jsonify({"error": "Use o upload para definir um logo local."}), 400

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


@companies_bp.route("/logo", methods=["POST"])
@jwt_required()
def upload_company_logo():
    """Owners/team admins may prepare a regional logo before approval."""
    company, membership, _, error, status = get_company_access(
        require_approved=False, permission="manage_company",
    )
    if error:
        return error, status
    site = get_current_site()
    # Validate trusted regional configuration before parsing or persisting bytes.
    if not logo_url(site, "0" * 32):
        return jsonify({"error": "Base regional segura de logo indisponível"}), 503
    try:
        png = read_logo_upload(request)
        opaque = store_logo(png)
        membership.logo_url = logo_url(site, opaque)
        db.session.commit()
        return jsonify({
            "logo_url": membership.logo_url,
            "company": company.to_dict(include_details=True, site_membership=membership),
            "message": "Logo atualizado com sucesso",
        }), 200
    except RequestEntityTooLarge:
        db.session.rollback()
        return jsonify({"error": "O logo deve ter no máximo 2 MiB."}), 413
    except LogoValidationError as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Company logo upload failed")
        return jsonify({"error": "Não foi possível salvar o logo."}), 500


@companies_bp.route("/logo", methods=["DELETE"])
@jwt_required()
def remove_company_logo():
    """Empty regional override suppresses global fallback; retain rollback files."""
    company, membership, _, error, status = get_company_access(
        require_approved=False, permission="manage_company",
    )
    if error:
        return error, status
    try:
        membership.logo_url = ""
        db.session.commit()
        return jsonify({
            "logo_url": "",
            "company": company.to_dict(include_details=True, site_membership=membership),
            "message": "Logo removido com sucesso",
        }), 200
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Company logo removal failed")
        return jsonify({"error": "Não foi possível remover o logo."}), 500


@companies_bp.route("/logos/<opaque>.png", methods=["GET"])
def get_company_logo(opaque):
    """Public bytes require a current regional approved logo and valid identity."""
    def not_found():
        response = jsonify({"error": "Logo não encontrado"})
        response.status_code = 404
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    site = get_current_site()
    canonical_url = logo_url(site, opaque)
    if not canonical_url:
        return not_found()
    try:
        result = _approved_company_query(site).filter(CompanySite.logo_url == canonical_url).first()
        if not result:
            return not_found()
        company, membership = result
        if not company.public_profile_slug_for(membership, expected_site_id=site.id):
            return not_found()
        stream = open_logo(opaque)
        try:
            response = send_file(stream, mimetype="image/png", conditional=False, etag=False)
        except BaseException:
            stream.close()
            raise
        response.call_on_close(stream.close)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
    except Exception:
        # Missing/unsafe files, invalid identity and storage errors never expose
        # any bytes or filesystem details. No global-logo or other-country scan.
        return not_found()


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

        pagination = query.options(*directory_loading_options()).order_by(
            db.func.coalesce(CompanySite.display_name, Company.company_name)
        ).paginate(page=page, per_page=per_page, error_out=False)

        counts = company_job_counts(site, [company.id for company, _ in pagination.items])
        companies = []
        for company, membership in pagination.items:
            item = company.to_public_dict(VerifiedPublicMembership(membership))
            item["active_jobs_count"] = counts[company.id]
            companies.append(item)

        return _public_response({
            "companies": companies,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
        })
    except Exception:
        return _public_response({"error": "Não foi possível carregar as empresas"}, 500)


def _public_company_payload(company, membership, site):
    jobs = public_company_jobs_query(site, [company.id]).order_by(Job.created_at.desc()).all()
    payload = company.to_public_dict(VerifiedPublicMembership(membership))
    payload["jobs"] = [job.to_dict() for job in jobs]
    payload["active_jobs_count"] = company_job_counts(site, [company.id])[company.id]
    return payload


@companies_bp.route("/by-slug/<slug>", methods=["GET"])
def get_public_company_by_slug(slug):
    """Exact server-owned country slug, current trusted active regional site only."""
    not_found = ({"error": "Empresa não encontrada"}, 404)
    if not valid_slug(slug):
        return _public_response(*not_found)
    try:
        site = get_current_site()
        result = _approved_company_query(site).filter(CompanySite.public_profile_slug == slug).first()
        if not result:
            return _public_response(*not_found)
        company, membership = result
        return _public_response(_public_company_payload(company, membership, site))
    except Exception:
        return _public_response({"error": "Não foi possível carregar a empresa"}, 500)


@companies_bp.route("/<int:company_id>", methods=["GET"])
def get_public_company(company_id):
    """Return one approved company presence and its active jobs in this site."""
    try:
        site = get_current_site()
        result = _approved_company_query(site).filter(Company.id == company_id).first()
        if not result:
            return _public_response({"error": "Empresa não encontrada"}, 404)
        company, membership = result
        return _public_response(_public_company_payload(company, membership, site))
    except Exception:
        return _public_response({"error": "Não foi possível carregar a empresa"}, 500)
