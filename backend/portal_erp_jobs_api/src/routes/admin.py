"""
Admin routes for Portal ERP Jobs
"""
import hashlib
import ipaddress

from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from src.config import db
from src.models import (
    User, Admin, Candidate, CandidateSite, Company, CompanySite,
    CompanyStatus, Job, Application, AdminPermission, AdminRole,
    AdminSite, AdminAuditEvent, CompanyUser, SessionFamily, Site,
)
from src.regional_access import ensure_candidate_site, validate_session_site
from src.regional_context import get_current_site
from src.services.jobs import (
    apply_job_fields,
    archive_job,
    desired_active,
    json_object,
    pagination_args,
    service_error,
    set_job_activity,
    set_job_status,
    text_contains,
    validate_job_payload,
    validate_salary_pair,
)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def _client_ip_prefix():
    try:
        address = ipaddress.ip_address(request.remote_addr or '')
    except ValueError:
        return None
    prefix = 24 if address.version == 4 else 64
    return str(ipaddress.ip_network(f'{address}/{prefix}', strict=False))


def _user_agent_hash():
    value = request.headers.get('User-Agent', '').strip()
    return hashlib.sha256(value.encode('utf-8')).hexdigest() if value else None


def _current_admin():
    return getattr(g, 'current_admin', None)


def _audit_admin(action, target_type, target_id=None, *, details=None):
    """Queue a metadata-only audit event in the caller's regional transaction."""
    site = get_current_site()
    admin = _current_admin()
    event_details = dict(details or {})
    if action.startswith(('catalog.', 'site.')):
        event_details.setdefault('scope', 'platform')
    db.session.add(AdminAuditEvent(
        site_id=site.id,
        actor_admin_id=admin.id if admin else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        details=event_details,
        ip_prefix=_client_ip_prefix(),
        user_agent_hash=_user_agent_hash(),
    ))


def _revoke_site_sessions(user_id, site_id):
    """Revoke only session families issued for the affected regional site."""
    for family in SessionFamily.query.filter_by(
        user_id=user_id,
        site_id=site_id,
        revoked_at=None,
    ).all():
        family.revoke()


def _password_policy_error(password):
    """Keep administrator-created credentials equivalent to public auth policy."""
    value = password or ''
    if (
        len(value) < 8
        or not any(character.isupper() for character in value)
        or not any(character.islower() for character in value)
        or not any(character.isdigit() for character in value)
    ):
        return 'A senha deve ter ao menos 8 caracteres, com maiúscula, minúscula e número'
    return None


def _json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({'error': 'O corpo da requisição deve ser um objeto JSON'}), 400)
    return data, None


def _regional_user_query(site):
    candidate_ids = (
        db.session.query(Candidate.user_id.label('user_id'))
        .join(CandidateSite, CandidateSite.candidate_id == Candidate.id)
        .filter(CandidateSite.site_id == site.id)
    )
    company_owner_ids = (
        db.session.query(Company.user_id.label('user_id'))
        .join(CompanySite, CompanySite.company_id == Company.id)
        .filter(CompanySite.site_id == site.id)
    )
    company_member_ids = (
        db.session.query(CompanyUser.user_id.label('user_id'))
        .join(Company, Company.id == CompanyUser.company_id)
        .join(CompanySite, CompanySite.company_id == Company.id)
        .filter(CompanySite.site_id == site.id)
    )
    regional_ids = candidate_ids.union(company_owner_ids, company_member_ids).subquery()
    return User.query.join(regional_ids, regional_ids.c.user_id == User.id)


def _regional_user_target(user_id, site):
    """Resolve a user only through an active identity associated with this site.

    Corporate members are deliberately returned as a distinct target type: their
    lifecycle is governed by the company-team API, not by global admin-user
    operations.
    """
    user = db.session.get(User, user_id)
    if not user or user.user_type == 'admin':
        return None, None, None
    if user.user_type == 'candidate':
        candidate = Candidate.query.filter_by(user_id=user.id).first()
        membership = CandidateSite.query.filter_by(
            candidate_id=candidate.id if candidate else -1,
            site_id=site.id,
        ).first()
        return user, 'candidate', membership
    if user.user_type == 'company':
        company = Company.query.filter_by(user_id=user.id).first()
        if company:
            membership = CompanySite.query.filter_by(
                company_id=company.id,
                site_id=site.id,
            ).first()
            return user, 'company_owner', membership

        member = (
            CompanyUser.query
            .join(Company, Company.id == CompanyUser.company_id)
            .join(CompanySite, CompanySite.company_id == Company.id)
            .filter(
                CompanyUser.user_id == user.id,
                CompanyUser.is_active.is_(True),
                CompanyUser.invitation_accepted.is_(True),
                CompanySite.site_id == site.id,
            )
            .first()
        )
        if member:
            return user, 'company_member', member
    return None, None, None


def _site_company(company_id):
    site = get_current_site()
    return (
        db.session.query(Company, CompanySite)
        .join(CompanySite, CompanySite.company_id == Company.id)
        .filter(Company.id == company_id, CompanySite.site_id == site.id)
        .first()
    )


def _site_candidate(candidate_id):
    site = get_current_site()
    return (
        db.session.query(Candidate, CandidateSite)
        .join(CandidateSite, CandidateSite.candidate_id == Candidate.id)
        .filter(Candidate.id == candidate_id, CandidateSite.site_id == site.id)
        .first()
    )


def _site_job(job_id):
    return Job.query.filter_by(id=job_id, site_id=get_current_site().id).first()

def admin_required(fn=None, *, permission=None):
    """Require an active regional admin and, optionally, a named permission."""
    def decorator(view):
        @wraps(view)
        @jwt_required()
        def wrapper(*args, **kwargs):
            _, error, status = validate_session_site()
            if error:
                return error, status
            try:
                current_user_id = int(get_jwt_identity())
            except (TypeError, ValueError):
                return jsonify({'error': 'Admin access required'}), 403
            user = db.session.get(User, current_user_id)
            admin = Admin.query.filter_by(user_id=current_user_id).first() if user else None

            if not user or not user.is_active or user.user_type != 'admin' or not admin:
                return jsonify({'error': 'Admin access required'}), 403
            site = get_current_site()
            if not admin.has_site_access(site.id):
                return jsonify({'error': 'Administrador não autorizado neste site.'}), 403
            if permission and not admin.has_permission(permission):
                return jsonify({'error': 'Permissão administrativa insuficiente'}), 403

            g.current_admin = admin
            return view(*args, **kwargs)
        return wrapper

    if fn is None:
        return decorator
    return decorator(fn)


@admin_bp.route('/stats', methods=['GET'])
@admin_required(permission=AdminPermission.VIEW_REPORTS)
def get_stats():
    """Get platform statistics"""
    try:
        site = get_current_site()
        total_companies = CompanySite.query.filter_by(site_id=site.id).count()
        total_candidates = CandidateSite.query.filter_by(site_id=site.id).count()
        total_jobs = Job.query.filter_by(site_id=site.id).count()
        active_jobs = Job.query.filter_by(site_id=site.id, is_active=True).count()
        total_applications = Application.query.filter_by(site_id=site.id).count()

        # Recent activity (last 24 hours)
        from datetime import datetime, timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)

        new_companies_today = CompanySite.query.filter(CompanySite.site_id == site.id, CompanySite.created_at >= yesterday).count()
        new_candidates_today = CandidateSite.query.filter(CandidateSite.site_id == site.id, CandidateSite.created_at >= yesterday).count()
        new_jobs_today = Job.query.filter(Job.site_id == site.id, Job.created_at >= yesterday).count()
        new_applications_today = Application.query.filter(Application.site_id == site.id, Application.applied_at >= yesterday).count()

        return jsonify({
            'total_companies': total_companies,
            'total_candidates': total_candidates,
            'total_jobs': total_jobs,
            'active_jobs': active_jobs,
            'total_applications': total_applications,
            'new_companies_today': new_companies_today,
            'new_candidates_today': new_candidates_today,
            'new_jobs_today': new_jobs_today,
            'new_applications_today': new_applications_today
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/audit-events', methods=['GET'])
@admin_required(permission=AdminPermission.VIEW_REPORTS)
def get_admin_audit_events():
    """Return a paginated, current-site-only administrative audit trail."""
    try:
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        query = AdminAuditEvent.query.filter_by(site_id=get_current_site().id)
        action = request.args.get('action', '').strip()
        target_type = request.args.get('target_type', '').strip()
        if action:
            query = query.filter_by(action=action)
        if target_type:
            query = query.filter_by(target_type=target_type)
        pagination = query.order_by(AdminAuditEvent.created_at.desc(), AdminAuditEvent.id.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
        return jsonify({
            'events': [event.to_dict() for event in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_TAGS)
def get_tags():
    """Get all tags"""
    try:
        # TODO: Implement tags table
        # For now, return empty list
        return jsonify({'tags': []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags', methods=['POST'])
@admin_required(permission=AdminPermission.MANAGE_TAGS)
def create_tag():
    """Create a new tag"""
    try:
        data = request.get_json()
        # TODO: Implement tags table
        return jsonify({'message': 'Tag created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags/<int:tag_id>', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_TAGS)
def update_tag(tag_id):
    """Update a tag"""
    try:
        data = request.get_json()
        # TODO: Implement tags table
        return jsonify({'message': 'Tag updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags/<int:tag_id>', methods=['DELETE'])
@admin_required(permission=AdminPermission.MANAGE_TAGS)
def delete_tag(tag_id):
    """Delete a tag"""
    try:
        # TODO: Implement tags table
        return jsonify({'message': 'Tag deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_USERS)
def get_users():
    """Get all users"""
    try:
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        user_type = request.args.get('type', None)

        site = get_current_site()
        query = _regional_user_query(site)

        if user_type:
            query = query.filter_by(user_type=user_type)

        pagination = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'users': [user.to_dict() for user in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required(permission=AdminPermission.MANAGE_USERS)
def delete_user(user_id):
    """Deactivate only the user's presence in the current regional site."""
    try:
        site = get_current_site()
        user, target_type, membership = _regional_user_target(user_id, site)
        if not user or not membership:
            return jsonify({'error': 'User not found'}), 404

        if target_type == 'company_member':
            return jsonify({
                'error': 'Membros empresariais devem ser geridos pelo fluxo de equipe da empresa.'
            }), 409

        if target_type == 'candidate':
            membership.is_active = False
            membership.is_discoverable = False
        else:
            membership.status = CompanyStatus.SUSPENDED
            Job.query.filter_by(company_id=membership.company_id, site_id=site.id).update({
                'is_active': False,
                'status': 'inactive',
                'is_featured': False,
            })
        _revoke_site_sessions(user.id, site.id)
        _audit_admin(
            'user.regional_access_removed',
            'user',
            user.id,
            details={'user_type': target_type},
        )
        db.session.commit()

        return jsonify({'message': 'Acesso regional removido com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PATCH'])
@admin_required(permission=AdminPermission.MANAGE_USERS)
def toggle_user_active(user_id):
    """Toggle only the user's presence in the current regional site."""
    try:
        site = get_current_site()
        user, target_type, membership = _regional_user_target(user_id, site)
        if not user or not membership:
            return jsonify({'error': 'User not found'}), 404

        if target_type == 'company_member':
            return jsonify({
                'error': 'Membros empresariais devem ser geridos pelo fluxo de equipe da empresa.'
            }), 409

        if target_type == 'candidate':
            membership.is_active = not membership.is_active
            if not membership.is_active:
                membership.is_discoverable = False
            is_active = membership.is_active
        else:
            if membership.status not in (CompanyStatus.APPROVED, CompanyStatus.SUSPENDED):
                return jsonify({'error': 'Use o fluxo de aprovação para empresas pendentes ou rejeitadas'}), 409
            membership.status = (
                CompanyStatus.SUSPENDED
                if membership.status == CompanyStatus.APPROVED
                else CompanyStatus.APPROVED
            )
            is_active = membership.status == CompanyStatus.APPROVED
            if not is_active:
                Job.query.filter_by(company_id=membership.company_id, site_id=site.id).update({
                    'is_active': False,
                    'status': 'inactive',
                    'is_featured': False,
                })
        if not is_active:
            _revoke_site_sessions(user.id, site.id)
        _audit_admin(
            'user.regional_status_changed',
            'user',
            user.id,
            details={'user_type': target_type, 'is_active': is_active},
        )
        db.session.commit()

        return jsonify({
            'message': 'User status updated',
            'is_active': is_active
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def get_all_jobs():
    """Get all jobs for moderation"""
    try:
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        status = request.args.get('status', None)

        query = Job.query.filter_by(site_id=get_current_site().id)

        if status == 'active':
            query = query.filter_by(is_active=True)
        elif status == 'inactive':
            query = query.filter_by(is_active=False)
        elif status:
            query = query.filter_by(status=status.strip().lower())

        pagination = query.order_by(Job.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'jobs': [job.to_dict() for job in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def delete_job(job_id):
    """Delete a job"""
    try:
        job = _site_job(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        archive_job(job)
        _audit_admin('job.archived', 'job', job.id, details={})
        db.session.commit()

        return jsonify({'message': 'Job archived successfully', 'job': job.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500




@admin_bp.route('/companies', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_COMPANIES)
def get_all_companies():
    """Get all companies for management"""
    try:
        site = get_current_site()
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        search = request.args.get('search', '')
        status = request.args.get('status', None)  # active, inactive, all

        query = Company.query.join(CompanySite).filter(CompanySite.site_id == site.id)

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    text_contains(Company.company_name, search),
                    text_contains(Company.cnpj, search)
                )
            )

        # Status filter
        if status == 'active':
            query = query.filter(CompanySite.status == CompanyStatus.APPROVED)
        elif status == 'inactive':
            query = query.filter(CompanySite.status != CompanyStatus.APPROVED)

        pagination = query.order_by(Company.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        companies_data = []
        for company in pagination.items:
            user = User.query.get(company.user_id)
            membership = CompanySite.query.filter_by(company_id=company.id, site_id=site.id).one()
            jobs_count = Job.query.filter_by(company_id=company.id, site_id=site.id).count()
            active_jobs = Job.query.filter_by(company_id=company.id, site_id=site.id, is_active=True).count()

            companies_data.append({
                'id': company.id,
                'user_id': company.user_id,
                'name': membership.display_name or company.company_name,
                'cnpj': company.cnpj,
                'email': user.email if user else None,
                'phone': company.phone,
                'sector': membership.sector or company.sector,
                'size': membership.company_size or company.company_size,
                'city': membership.city or company.city,
                'state': membership.state or company.state,
                'website': membership.website or company.website,
                'description': membership.description or company.description,
                'is_active': bool(user and user.is_active and membership.status == CompanyStatus.APPROVED),
                'site_status': membership.status,
                'is_member': membership.is_member,
                'max_active_jobs': membership.max_active_jobs,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'jobs_count': jobs_count,
                'active_jobs': active_jobs
            })

        return jsonify({
            'companies': companies_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_COMPANIES)
def get_company_details(company_id):
    """Get detailed company information"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        site = get_current_site()
        user = User.query.get(company.user_id)
        jobs = Job.query.filter_by(company_id=company.id, site_id=site.id).order_by(Job.created_at.desc()).all()

        jobs_data = []
        for job in jobs:
            applications_count = Application.query.filter_by(job_id=job.id, site_id=site.id).count()
            jobs_data.append({
                'id': job.id,
                'title': job.title,
                'is_active': job.is_active,
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'applications_count': applications_count
            })

        return jsonify({
            'company': {
                'id': company.id,
                'user_id': company.user_id,
                'name': membership.display_name or company.company_name,
                'cnpj': company.cnpj,
                'email': user.email if user else None,
                'phone': company.phone,
                'sector': membership.sector or company.sector,
                'size': membership.company_size or company.company_size,
                'city': membership.city or company.city,
                'state': membership.state or company.state,
                'country': membership.country or company.country,
                'address': membership.street_address or company.street_address,
                'website': membership.website or company.website,
                'description': membership.description or company.description,
                'is_active': bool(user and user.is_active and membership.status == CompanyStatus.APPROVED),
                'site_status': membership.status,
                'is_member': membership.is_member,
                'max_active_jobs': membership.max_active_jobs,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'updated_at': company.updated_at.isoformat() if company.updated_at else None
            },
            'jobs': jobs_data,
            'stats': {
                'total_jobs': len(jobs),
                'active_jobs': len([j for j in jobs if j.is_active]),
                'total_applications': sum([Application.query.filter_by(job_id=j.id, site_id=site.id).count() for j in jobs])
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_COMPANIES)
def update_company(company_id):
    """Update company information"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        data = request.get_json()

        # Update site-local presentation fields.
        field_mapping = {
            'name': 'display_name',
            'sector': 'sector',
            'size': 'company_size',
            'city': 'city',
            'state': 'state',
            'country': 'country',
            'address': 'street_address',
            'website': 'website',
            'description': 'description'
        }

        for frontend_field, model_field in field_mapping.items():
            if frontend_field in data:
                setattr(membership, model_field, data[frontend_field])

        if 'phone' in data:
            company.phone = data['phone']

        # Admin-only fields: membership and job limits
        if 'is_member' in data:
            membership.is_member = bool(data['is_member'])
        if 'max_active_jobs' in data:
            membership.max_active_jobs = max(0, int(data['max_active_jobs']))

        company.updated_at = db.func.now()
        _audit_admin(
            'company.updated',
            'company',
            company.id,
            details={'fields': sorted(data.keys())},
        )
        db.session.commit()

        user = User.query.get(company.user_id)
        return jsonify({
            'message': 'Company updated successfully',
            'company': {
                'id': company.id,
                'name': membership.display_name or company.company_name,
                'email': user.email if user else None,
                'site_status': membership.status,
                'is_member': membership.is_member,
                'max_active_jobs': membership.max_active_jobs
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/toggle-active', methods=['PATCH'])
@admin_required(permission=AdminPermission.MANAGE_COMPANIES)
def toggle_company_active(company_id):
    """Toggle company active status"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        if membership.status not in (CompanyStatus.APPROVED, CompanyStatus.SUSPENDED):
            return jsonify({'error': 'Use o fluxo de aprovação para empresas pendentes ou rejeitadas'}), 409

        site = get_current_site()
        membership.status = (
            CompanyStatus.SUSPENDED
            if membership.status == CompanyStatus.APPROVED
            else CompanyStatus.APPROVED
        )
        if membership.status != CompanyStatus.APPROVED:
            Job.query.filter_by(company_id=company.id, site_id=site.id).update({
                'is_active': False,
                'status': 'inactive',
                'is_featured': False,
            })
            _revoke_site_sessions(company.user_id, site.id)

        _audit_admin(
            'company.suspended' if membership.status == CompanyStatus.SUSPENDED else 'company.reactivated',
            'company',
            company.id,
            details={'site_status': membership.status},
        )
        db.session.commit()

        return jsonify({
            'message': 'Company status updated',
            'is_active': membership.status == CompanyStatus.APPROVED,
            'site_status': membership.status,
            'company_name': membership.display_name or company.company_name
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>', methods=['DELETE'])
@admin_required(permission=AdminPermission.MANAGE_COMPANIES)
def delete_company(company_id):
    """Delete a company and all related data"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        # Preserve the global company and audit history; suspend only this site.
        site = get_current_site()
        membership.status = CompanyStatus.SUSPENDED
        membership.approval_reason = 'Regional presence archived by administrator'
        Job.query.filter_by(company_id=company.id, site_id=site.id).update({
            'is_active': False,
            'status': 'inactive',
            'is_featured': False,
        })
        _revoke_site_sessions(company.user_id, site.id)

        _audit_admin(
            'company.archived',
            'company',
            company.id,
            details={'site_status': membership.status},
        )
        db.session.commit()

        return jsonify({'message': 'Regional company presence suspended successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/jobs', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_COMPANIES)
def get_company_jobs(company_id):
    """Get all jobs from a specific company"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        site = get_current_site()
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error

        pagination = Job.query.filter_by(company_id=company.id, site_id=site.id).order_by(
            Job.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        jobs_data = []
        for job in pagination.items:
            applications_count = Application.query.filter_by(job_id=job.id, site_id=site.id).count()
            jobs_data.append({
                **job.to_dict(),
                'applications_count': applications_count
            })

        return jsonify({
            'company': {'id': company.id, 'name': membership.display_name or company.company_name},
            'jobs': jobs_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def get_all_candidates():
    """Get all candidates for management"""
    try:
        site = get_current_site()
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        search = request.args.get('search', '')
        status = request.args.get('status', None)

        query = (
            Candidate.query
            .join(CandidateSite)
            .join(User, User.id == Candidate.user_id)
            .filter(CandidateSite.site_id == site.id)
        )

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    text_contains(Candidate.first_name, search),
                    text_contains(Candidate.last_name, search),
                    text_contains(Candidate.first_name + ' ' + Candidate.last_name, search),
                    text_contains(User.email, search)
                )
            )

        # A candidate can be enabled globally while disabled only in this site.
        if status == 'active':
            query = query.filter(CandidateSite.is_active.is_(True))
        elif status == 'inactive':
            query = query.filter(CandidateSite.is_active.is_(False))

        pagination = query.order_by(Candidate.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        candidates_data = []
        for candidate in pagination.items:
            user = User.query.get(candidate.user_id)
            membership = CandidateSite.query.filter_by(candidate_id=candidate.id, site_id=site.id).one()
            applications_count = Application.query.filter_by(candidate_id=candidate.id, site_id=site.id).count()

            candidates_data.append({
                'id': candidate.id,
                'user_id': candidate.user_id,
                'full_name': f"{candidate.first_name} {candidate.last_name}",
                'email': user.email if user else None,
                'phone': candidate.phone,
                'city': candidate.city,
                'state': candidate.state,
                'is_active': membership.is_active and (user.is_active if user else False),
                'is_discoverable': membership.is_discoverable,
                'created_at': candidate.created_at.isoformat() if candidate.created_at else None,
                'applications_count': applications_count
            })

        return jsonify({
            'candidates': candidates_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates/<int:candidate_id>/toggle-active', methods=['PATCH'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def toggle_candidate_active(candidate_id):
    """Toggle candidate active status"""
    try:
        candidate_result = _site_candidate(candidate_id)

        if not candidate_result:
            return jsonify({'error': 'Candidate not found'}), 404
        candidate, candidate_site = candidate_result

        candidate_site.is_active = not candidate_site.is_active
        if not candidate_site.is_active:
            candidate_site.is_discoverable = False
            _revoke_site_sessions(candidate.user_id, get_current_site().id)
        _audit_admin(
            'candidate.regional_status_changed',
            'candidate',
            candidate.id,
            details={'is_active': candidate_site.is_active},
        )
        db.session.commit()

        return jsonify({
            'message': 'Candidate status updated',
            'is_active': candidate_site.is_active,
            'candidate_name': f"{candidate.first_name} {candidate.last_name}"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/setup', methods=['POST'])
def setup_first_admin():
    """
    Create the first admin user (only works if no admin exists)
    This is a one-time setup endpoint for initial deployment
    """
    if not current_app.config.get('ALLOW_ADMIN_SETUP', False):
        return jsonify({'error': 'Not found'}), 404

    try:
        # Check if any admin already exists
        existing_admin = Admin.query.first()
        if existing_admin:
            return jsonify({'error': 'Admin already exists. Use regular registration.'}), 403

        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', 'Administrator')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        password_error = _password_policy_error(password)
        if password_error:
            return jsonify({'error': password_error}), 400

        # Check if user with this email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), 400

        # Create User
        user = User(email=email, user_type='admin')
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # Get user.id

        # Create Admin profile
        admin = Admin(
            user_id=user.id,
            name=name,
            role='super_admin',
            is_platform_admin=True,
            permissions={
                'manage_users': True,
                'manage_jobs': True,
                'manage_tags': True,
                'manage_areas': True,
                'manage_levels': True,
                'manage_modalities': True,
                'manage_technologies': True,
                'manage_softwares': True
            }
        )
        db.session.add(admin)
        db.session.flush()
        db.session.add(AdminSite(
            admin_id=admin.id,
            site_id=get_current_site().id,
            is_active=True,
        ))
        _audit_admin('admin.bootstrap_created', 'admin', admin.id, details={'role': admin.role})
        db.session.commit()

        return jsonify({
            'message': 'First admin created successfully',
            'admin': {
                'id': admin.id,
                'name': admin.name,
                'email': user.email,
                'role': admin.role
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@admin_bp.route('/candidates/<int:candidate_id>', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def get_candidate_details(candidate_id):
    """Get detailed candidate information"""
    try:
        candidate_result = _site_candidate(candidate_id)

        if not candidate_result:
            return jsonify({'error': 'Candidate not found'}), 404
        candidate, candidate_site = candidate_result

        site = get_current_site()
        user = User.query.get(candidate.user_id)
        applications = Application.query.filter_by(candidate_id=candidate.id, site_id=site.id).all()
        has_other_site = CandidateSite.query.filter(
            CandidateSite.candidate_id == candidate.id,
            CandidateSite.site_id != site.id,
        ).first() is not None

        applications_data = []
        for app in applications:
            job = Job.query.get(app.job_id)
            if job:
                applications_data.append({
                    'id': app.id,
                    'job_id': job.id,
                    'job_title': job.title,
                    'company_name': job.company.name if job.company else 'N/A',
                    'applied_at': app.applied_at.isoformat() if app.applied_at else None,
                    'status': app.status
                })

        return jsonify({
            'id': candidate.id,
            'user_id': candidate.user_id,
            'name': f"{candidate.first_name} {candidate.last_name}",
            'email': user.email if user else None,
            'first_name': candidate.first_name,
            'last_name': candidate.last_name,
            'phone': candidate.phone,
            'city': candidate.city,
            'state': candidate.state,
            'title': candidate.current_title,
            'current_position': candidate.current_title,
            'summary': candidate.professional_summary,
            'experience_years': candidate.years_experience,
            'years_experience': candidate.years_experience,
            'linkedin_url': candidate.linkedin_url,
            'github_url': candidate.github_url,
            'portfolio_url': candidate.portfolio_url,
            'bio': candidate.professional_summary,
            'salary_expectation': candidate_site.expected_salary,
            'expected_salary': candidate_site.expected_salary,
            'is_available': candidate_site.is_actively_looking,
            'is_active': candidate_site.is_active and (user.is_active if user else False),
            'is_discoverable': candidate_site.is_discoverable,
            'global_profile_editable': not has_other_site,
            'created_at': candidate.created_at.isoformat() if candidate.created_at else None,
            'applications': applications_data,
            'applications_count': len(applications_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates/<int:candidate_id>/toggle-status', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def toggle_candidate_status(candidate_id):
    """Toggle candidate active status (alternative endpoint)"""
    try:
        candidate_result = _site_candidate(candidate_id)

        if not candidate_result:
            return jsonify({'error': 'Candidate not found'}), 404
        candidate, candidate_site = candidate_result

        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        is_active = data.get('is_active', not candidate_site.is_active)
        if not isinstance(is_active, bool):
            return jsonify({'error': 'is_active deve ser booleano'}), 400

        candidate_site.is_active = is_active
        if not candidate_site.is_active:
            candidate_site.is_discoverable = False
            _revoke_site_sessions(candidate.user_id, get_current_site().id)
        _audit_admin(
            'candidate.regional_status_changed',
            'candidate',
            candidate.id,
            details={'is_active': candidate_site.is_active},
        )
        db.session.commit()

        return jsonify({
            'message': 'Candidate status updated',
            'is_active': candidate_site.is_active,
            'candidate_name': f"{candidate.first_name} {candidate.last_name}"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>', methods=['GET'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def get_job_details(job_id):
    """Get detailed job information for admin"""
    try:
        job = _site_job(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        company_result = _site_company(job.company_id) if job.company_id else None
        company = company_result[0] if company_result else None
        company_site = company_result[1] if company_result else None
        applications = Application.query.filter_by(job_id=job.id, site_id=job.site_id).all()

        applications_data = []
        for app in applications:
            candidate = Candidate.query.get(app.candidate_id)
            if candidate:
                applications_data.append({
                    'id': app.id,
                    'candidate_id': candidate.id,
                    'candidate_name': f"{candidate.first_name} {candidate.last_name}",
                    'candidate_email': candidate.user.email if candidate.user else None,
                    'applied_at': app.applied_at.isoformat() if app.applied_at else None,
                    'status': app.status
                })

        return jsonify({
            'id': job.id,
            'title': job.title,
            'description': job.description,
            'requirements': job.requirements,
            'responsibilities': job.responsibilities,
            'benefits': job.benefits,
            'area': job.area,
            'level': job.seniority_level,
            'modality': job.work_modality,
            'contract_type': job.contract_type,
            'location': ', '.join(filter(None, [job.city, job.state])),
            'city': job.city,
            'state': job.state,
            'salary_min': job.min_salary,
            'salary_max': job.max_salary,
            'is_active': job.is_active,
            'is_featured': job.is_featured,
            'status': job.status,
            'company_id': job.company_id,
            'company_name': (company_site.display_name or company.company_name) if company else 'N/A',
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'applications': applications_data,
            'applications_count': len(applications_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>/status', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def update_job_status(job_id):
    """Update job status (approve, reject, pending, close)"""
    try:
        job = _site_job(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        data, payload_error = json_object(request)
        if payload_error:
            return payload_error
        new_status = data.get('status')

        try:
            set_job_status(job, new_status)
        except (ValueError, LookupError, OverflowError) as exc:
            return service_error(exc)

        _audit_admin('job.status_changed', 'job', job.id, details={'status': job.status})
        db.session.commit()

        return jsonify({
            'message': f'Job status updated to {new_status}',
            'job_id': job.id,
            'status': job.status,
            'is_active': job.is_active
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>/featured', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def toggle_job_featured(job_id):
    """Toggle job featured status"""
    try:
        job = _site_job(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        data, payload_error = json_object(request)
        if payload_error:
            return payload_error
        is_featured = data.get('is_featured', not job.is_featured)
        if not isinstance(is_featured, bool):
            return jsonify({'error': 'is_featured deve ser booleano'}), 400
        job.is_featured = is_featured

        _audit_admin('job.featured_changed', 'job', job.id, details={'is_featured': is_featured})
        db.session.commit()

        return jsonify({
            'message': 'Job featured status updated',
            'job_id': job.id,
            'is_featured': job.is_featured
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# COMPANY APPROVAL ROUTES
# ============================================

@admin_bp.route('/companies/pending', methods=['GET'])
@admin_required(permission=AdminPermission.APPROVE_COMPANIES)
def get_pending_companies():
    """Get companies pending approval"""
    try:
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error

        site = get_current_site()
        query = (
            Company.query
            .join(CompanySite)
            .filter(
                CompanySite.site_id == site.id,
                CompanySite.status == CompanyStatus.PENDING,
            )
        )

        pagination = query.order_by(Company.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        companies_data = []
        for company in pagination.items:
            user = User.query.get(company.user_id)
            membership = CompanySite.query.filter_by(company_id=company.id, site_id=site.id).one()
            companies_data.append({
                'id': company.id,
                'name': membership.display_name or company.company_name,
                'cnpj': company.cnpj,
                'email': user.email if user else None,
                'phone': company.phone,
                'sector': membership.sector or company.sector,
                'city': membership.city or company.city,
                'state': membership.state or company.state,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'approval_status': membership.status
            })

        return jsonify({
            'companies': companies_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/approve', methods=['POST'])
@admin_required(permission=AdminPermission.APPROVE_COMPANIES)
def approve_company(company_id):
    """Approve a company registration"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        user = User.query.get(company.user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        membership.approve(_current_admin().id)
        _audit_admin('company.approved', 'company', company.id, details={})

        db.session.commit()

        # TODO: Send approval email to company

        return jsonify({
            'message': 'Company approved successfully',
            'company': {
                'id': company.id,
                'name': membership.display_name or company.company_name,
                'approval_status': membership.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/reject', methods=['POST'])
@admin_required(permission=AdminPermission.APPROVE_COMPANIES)
def reject_company(company_id):
    """Reject a company registration"""
    try:
        company_result = _site_company(company_id)

        if not company_result:
            return jsonify({'error': 'Company not found'}), 404
        company, membership = company_result

        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        rejection_reason = str(data.get('reason') or '').strip()
        if not rejection_reason:
            return jsonify({'error': 'Motivo da rejeição é obrigatório'}), 400

        membership.reject(_current_admin().id, rejection_reason)
        Job.query.filter_by(
            company_id=company.id,
            site_id=get_current_site().id,
        ).update({
            'is_active': False,
            'status': 'rejected',
            'is_featured': False,
        })
        _revoke_site_sessions(company.user_id, get_current_site().id)
        _audit_admin('company.rejected', 'company', company.id, details={'reason_provided': True})

        db.session.commit()

        # TODO: Send rejection email to company

        return jsonify({
            'message': 'Company rejected',
            'company': {
                'id': company.id,
                'name': membership.display_name or company.company_name,
                'approval_status': membership.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# ADMIN MANAGEMENT ROUTES
# ============================================

def super_admin_required(fn):
    """Require a super-admin assignment on the server-resolved regional site."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        _, error, status = validate_session_site()
        if error:
            return error, status
        try:
            current_user_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return jsonify({'error': 'Admin access required'}), 403
        user = db.session.get(User, current_user_id)
        admin = Admin.query.filter_by(user_id=current_user_id).first() if user else None
        if not user or not user.is_active or user.user_type != 'admin' or not admin:
            return jsonify({'error': 'Admin access required'}), 403
        if admin.role != AdminRole.SUPER_ADMIN:
            return jsonify({'error': 'Super admin access required'}), 403
        if not admin.has_site_access(get_current_site().id):
            return jsonify({'error': 'Administrador não autorizado neste site.'}), 403
        g.current_admin = admin
        return fn(*args, **kwargs)
    return wrapper


def platform_admin_required(fn):
    """Require explicit platform-wide authority in addition to regional scope."""
    @wraps(fn)
    @super_admin_required
    def wrapper(*args, **kwargs):
        if not _current_admin().is_platform_admin:
            return jsonify({'error': 'Platform administrator access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _site_admin(admin_id, site_id=None):
    target_site_id = site_id or get_current_site().id
    return (
        Admin.query
        .join(AdminSite, AdminSite.admin_id == Admin.id)
        .filter(
            Admin.id == admin_id,
            AdminSite.site_id == target_site_id,
            AdminSite.is_active.is_(True),
        )
        .first()
    )


def _active_super_admin_count(site_id):
    return db.session.query(Admin).join(User).join(AdminSite).filter(
        Admin.role == AdminRole.SUPER_ADMIN,
        User.is_active.is_(True),
        AdminSite.site_id == site_id,
        AdminSite.is_active.is_(True),
    ).count()


def _active_platform_admin_count():
    return db.session.query(Admin).join(User).filter(
        Admin.is_platform_admin.is_(True),
        Admin.role == AdminRole.SUPER_ADMIN,
        User.is_active.is_(True),
    ).count()


def _would_remove_last_super_admin(admin):
    if admin.role != AdminRole.SUPER_ADMIN:
        return False
    return any(
        assignment.is_active and _active_super_admin_count(assignment.site_id) <= 1
        for assignment in admin.site_assignments
    )


@admin_bp.route('/admins', methods=['GET'])
@super_admin_required
def get_all_admins():
    """List administrators without passwords, tokens or internal session data."""
    try:
        site = get_current_site()
        admins_data = []
        admins = (
            Admin.query
            .join(AdminSite, AdminSite.admin_id == Admin.id)
            .filter(AdminSite.site_id == site.id, AdminSite.is_active.is_(True))
            .order_by(Admin.id)
            .all()
        )
        for admin in admins:
            user = db.session.get(User, admin.user_id)
            admins_data.append({
                'id': admin.id,
                'user_id': admin.user_id,
                'name': admin.name,
                'email': user.email if user else None,
                'role': admin.role,
                'is_platform_admin': admin.is_platform_admin,
                'permissions': admin.permissions or {},
                'sites': [assignment.to_dict() for assignment in admin.site_assignments],
                'is_active': bool(user and user.is_active),
                'last_login': user.last_login.isoformat() if user and user.last_login else None,
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
            })
        return jsonify({'admins': admins_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins', methods=['POST'])
@super_admin_required
def create_admin():
    """Create an admin scoped initially to the current site."""
    try:
        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        for field in ('name', 'email', 'password', 'role'):
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        if data['role'] not in (AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MODERATOR):
            return jsonify({'error': 'Invalid role'}), 400
        password_error = _password_policy_error(data['password'])
        if password_error:
            return jsonify({'error': password_error}), 400
        if User.query.filter_by(email=data['email'].strip().lower()).first():
            return jsonify({'error': 'Email already registered'}), 409
        if 'permissions' in data and not isinstance(data['permissions'], dict):
            return jsonify({'error': 'permissions deve ser um objeto'}), 400
        if 'is_platform_admin' in data and not isinstance(data['is_platform_admin'], bool):
            return jsonify({'error': 'is_platform_admin deve ser booleano'}), 400
        if data.get('is_platform_admin') and (
            not _current_admin().is_platform_admin or data['role'] != AdminRole.SUPER_ADMIN
        ):
            return jsonify({'error': 'Only a platform administrator can grant platform authority'}), 403

        user = User(email=data['email'].strip().lower(), user_type='admin', is_active=True)
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()
        admin = Admin(user_id=user.id, name=data['name'].strip(), role=data['role'])
        admin.set_role(data['role'])
        admin.is_platform_admin = data.get('is_platform_admin', False)
        if 'permissions' in data:
            admin.permissions = data['permissions']
        db.session.add(admin)
        db.session.flush()
        db.session.add(AdminSite(admin_id=admin.id, site_id=get_current_site().id, is_active=True))
        _audit_admin('admin.created', 'admin', admin.id, details={'role': admin.role})
        db.session.commit()
        return jsonify({'message': 'Admin created successfully', 'admin': admin.to_dict(include_permissions=True)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@super_admin_required
def update_admin(admin_id):
    """Update safe admin attributes; password changes revoke all sessions."""
    try:
        admin = _site_admin(admin_id)
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        if admin.is_platform_admin and not _current_admin().is_platform_admin:
            return jsonify({'error': 'Platform administrator access required'}), 403
        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        user = db.session.get(User, admin.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if 'name' in data:
            admin.name = str(data['name']).strip()
        if 'role' in data:
            if data['role'] not in (AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MODERATOR):
                return jsonify({'error': 'Invalid role'}), 400
            if admin.is_platform_admin and data['role'] != AdminRole.SUPER_ADMIN and data.get('is_platform_admin') is not False:
                return jsonify({'error': 'Remove platform authority explicitly before changing this role'}), 400
            if admin.role == AdminRole.SUPER_ADMIN and data['role'] != AdminRole.SUPER_ADMIN and _would_remove_last_super_admin(admin):
                return jsonify({'error': 'Cannot demote the last active super admin'}), 409
            admin.set_role(data['role'])
        if 'is_platform_admin' in data:
            if not isinstance(data['is_platform_admin'], bool):
                return jsonify({'error': 'is_platform_admin deve ser booleano'}), 400
            if not _current_admin().is_platform_admin:
                return jsonify({'error': 'Only a platform administrator can change platform authority'}), 403
            requested_platform = data['is_platform_admin'] is True
            if admin.is_platform_admin and not requested_platform and _active_platform_admin_count() <= 1:
                return jsonify({'error': 'Cannot remove the last active platform administrator'}), 409
            if requested_platform and admin.role != AdminRole.SUPER_ADMIN:
                return jsonify({'error': 'Platform authority requires the super_admin role'}), 400
            admin.is_platform_admin = requested_platform
        if 'permissions' in data:
            if not isinstance(data['permissions'], dict):
                return jsonify({'error': 'permissions deve ser um objeto'}), 400
            admin.permissions = data['permissions']
        if 'email' in data:
            email = str(data['email']).strip().lower()
            existing = User.query.filter(User.email == email, User.id != user.id).first()
            if existing:
                return jsonify({'error': 'Email already in use'}), 409
            user.email = email
        if data.get('password'):
            password_error = _password_policy_error(data['password'])
            if password_error:
                return jsonify({'error': password_error}), 400
            user.set_password(data['password'])
            user.revoke_all_sessions()
        _audit_admin('admin.updated', 'admin', admin.id, details={'fields': sorted(k for k in data if k not in {'password', 'email'})})
        db.session.commit()
        return jsonify({'message': 'Admin updated successfully', 'admin': admin.to_dict(include_permissions=True)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>/sites', methods=['GET', 'PUT'])
@platform_admin_required
def admin_sites(admin_id):
    """Safely inspect or replace explicit active site assignments for one admin."""
    try:
        admin = db.session.get(Admin, admin_id)
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        if request.method == 'GET':
            return jsonify({'admin_id': admin.id, 'sites': [item.to_dict() for item in admin.site_assignments]}), 200
        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        site_codes = data.get('site_codes')
        if not isinstance(site_codes, list) or not site_codes or not all(isinstance(code, str) for code in site_codes):
            return jsonify({'error': 'site_codes deve ser uma lista não vazia'}), 400
        requested = {code.strip().upper() for code in site_codes if code.strip()}
        sites = Site.query.filter(Site.code.in_(requested)).all()
        if len(sites) != len(requested):
            return jsonify({'error': 'Um ou mais sites são inválidos'}), 400
        current_site = get_current_site()
        if admin.id == _current_admin().id and current_site.code not in requested:
            return jsonify({'error': 'Cannot remove your own current-site assignment'}), 409
        if admin.role == AdminRole.SUPER_ADMIN:
            for assignment in admin.site_assignments:
                if assignment.is_active and assignment.site.code not in requested:
                    if _active_super_admin_count(assignment.site_id) <= 1:
                        return jsonify({'error': 'Cannot remove the last active super admin assignment'}), 409
        by_site_id = {item.site_id: item for item in admin.site_assignments}
        for site in sites:
            assignment = by_site_id.get(site.id)
            if assignment:
                assignment.is_active = True
            else:
                db.session.add(AdminSite(admin_id=admin.id, site_id=site.id, is_active=True))
        requested_ids = {site.id for site in sites}
        for assignment in admin.site_assignments:
            if assignment.site_id not in requested_ids:
                assignment.is_active = False
                _revoke_site_sessions(admin.user_id, assignment.site_id)
        _audit_admin('admin.site_assignments_changed', 'admin', admin.id, details={'site_count': len(requested_ids)})
        db.session.commit()
        return jsonify({'admin_id': admin.id, 'sites': [item.to_dict() for item in admin.site_assignments]}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@super_admin_required
def delete_admin(admin_id):
    """Deactivate an administrator without deleting its global identity or audit trail."""
    try:
        admin = _site_admin(admin_id)
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        if admin.is_platform_admin and not _current_admin().is_platform_admin:
            return jsonify({'error': 'Platform administrator access required'}), 403
        if admin.user_id == _current_admin().user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 409
        if _would_remove_last_super_admin(admin):
            return jsonify({'error': 'Cannot deactivate the last active super admin'}), 409
        if admin.is_platform_admin and _active_platform_admin_count() <= 1:
            return jsonify({'error': 'Cannot deactivate the last active platform administrator'}), 409
        user = db.session.get(User, admin.user_id)
        if user:
            user.is_active = False
            user.revoke_all_sessions()
        _audit_admin('admin.deactivated', 'admin', admin.id, details={'via': 'delete'})
        db.session.commit()
        return jsonify({'message': 'Admin deactivated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>/toggle-active', methods=['PATCH'])
@super_admin_required
def toggle_admin_active(admin_id):
    """Toggle an administrator, preventing self and last-super-admin lockout."""
    try:
        admin = _site_admin(admin_id)
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        if admin.is_platform_admin and not _current_admin().is_platform_admin:
            return jsonify({'error': 'Platform administrator access required'}), 403
        if admin.user_id == _current_admin().user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 409
        user = db.session.get(User, admin.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user.is_active and _would_remove_last_super_admin(admin):
            return jsonify({'error': 'Cannot deactivate the last active super admin'}), 409
        if user.is_active and admin.is_platform_admin and _active_platform_admin_count() <= 1:
            return jsonify({'error': 'Cannot deactivate the last active platform administrator'}), 409
        user.is_active = not user.is_active
        if not user.is_active:
            user.revoke_all_sessions()
        _audit_admin('admin.status_changed', 'admin', admin.id, details={'is_active': user.is_active})
        db.session.commit()
        return jsonify({'message': 'Admin status updated', 'is_active': user.is_active}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============== CRUD COMPLETO DE VAGAS ==============

@admin_bp.route('/jobs', methods=['POST'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def create_job():
    """Create a new job"""
    try:
        data, payload_error = json_object(request)
        if payload_error:
            return payload_error
        if not data.get('company_id'):
            return jsonify({'error': 'Empresa é obrigatória'}), 400

        # A empresa deve existir e estar aprovada no site atual.
        site = get_current_site()
        company_result = _site_company(data['company_id'])
        if not company_result:
            return jsonify({'error': 'Empresa não encontrada'}), 404
        company, company_site = company_result
        if company_site.status != CompanyStatus.APPROVED:
            return jsonify({'error': 'Empresa não aprovada neste site'}), 403
        try:
            values = validate_job_payload(data, admin=True)
            requested_active = desired_active(data, current=True)
        except ValueError as exc:
            return service_error(exc)

        job = Job(
            company_id=company.id,
            site_id=site.id,
            title=values.pop('title'),
            description=values.pop('description'),
            salary_currency=site.currency_code,
            country=site.name,
            is_active=False,
            status='inactive',
        )
        db.session.add(job)
        try:
            db.session.flush()
            apply_job_fields(job, values)
            if 'status' in data:
                set_job_status(job, data['status'], company_site=company_site)
            elif requested_active:
                set_job_activity(job, True, company_site=company_site)
        except (ValueError, LookupError, OverflowError) as exc:
            db.session.rollback()
            return service_error(exc)
        _audit_admin('job.created', 'job', job.id, details={'company_id': company.id})
        db.session.commit()

        return jsonify({
            'message': 'Vaga criada com sucesso',
            'job': job.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def update_job(job_id):
    """Update a job"""
    try:
        job = _site_job(job_id)

        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        data, payload_error = json_object(request)
        if payload_error:
            return payload_error
        try:
            values = validate_job_payload(data, partial=True, admin=True)
            validate_salary_pair(job, values)
            target_active = desired_active(data, current=job.is_active)
            explicit_status = data.get('status')
            apply_job_fields(job, values)
            if explicit_status is not None:
                set_job_status(job, explicit_status)
            elif target_active != job.is_active:
                set_job_activity(job, target_active)
        except (ValueError, LookupError, OverflowError) as exc:
            db.session.rollback()
            return service_error(exc)

        _audit_admin('job.updated', 'job', job.id, details={'fields': sorted(data.keys())})
        db.session.commit()

        return jsonify({
            'message': 'Vaga atualizada com sucesso',
            'job': job.to_dict(include_details=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>/toggle-status', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_JOBS)
def toggle_job_status_simple(job_id):
    """Toggle job active status"""
    try:
        job = _site_job(job_id)

        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        data = request.get_json(silent=True)
        if data is None:
            data = {}
        if not isinstance(data, dict):
            return jsonify({'error': 'O corpo da requisição deve ser um objeto JSON'}), 400
        requested = data.get('is_active', not job.is_active)
        try:
            set_job_activity(job, requested)
        except (ValueError, LookupError, OverflowError) as exc:
            return service_error(exc)

        _audit_admin('job.activity_changed', 'job', job.id, details={'is_active': job.is_active})
        db.session.commit()

        return jsonify({
            'message': 'Status atualizado com sucesso',
            'is_active': job.is_active
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============== CRUD COMPLETO DE CANDIDATOS ==============

@admin_bp.route('/candidates', methods=['POST'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def create_candidate():
    """Create a new candidate"""
    try:
        site = get_current_site()
        data, payload_error = _json_object()
        if payload_error:
            return payload_error

        # Validar campos obrigatórios
        if not data.get('email'):
            return jsonify({'error': 'Email é obrigatório'}), 400
        if not data.get('first_name'):
            return jsonify({'error': 'Nome é obrigatório'}), 400
        if not data.get('last_name'):
            return jsonify({'error': 'Sobrenome é obrigatório'}), 400

        # Verificar se o email já existe
        email = str(data['email']).strip().lower()
        existing_user = User.query.filter(db.func.lower(User.email) == email).first()
        if existing_user:
            return jsonify({'error': 'Email já cadastrado'}), 400

        # Criar usuário
        password = data.get('password')
        if not password:
            return jsonify({'error': 'Senha temporária compatível com a política é obrigatória'}), 400
        password_error = _password_policy_error(password)
        if password_error:
            return jsonify({'error': password_error}), 400
        user = User(email=email, user_type='candidate', is_active=True, is_verified=True)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        # Criar candidato
        candidate = Candidate(
            user_id=user.id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data.get('phone', ''),
            city=data.get('city', ''),
            state=data.get('state', ''),
            linkedin_url=data.get('linkedin_url', ''),
            github_url=data.get('github_url', ''),
            portfolio_url=data.get('portfolio_url', ''),
            professional_summary=data.get('bio', ''),
            current_title=data.get('current_position', ''),
            years_experience=int(data['years_experience']) if data.get('years_experience') else None,
            expected_salary=float(data['expected_salary']) if data.get('expected_salary') else None,
            is_actively_looking=data.get('is_available', True),
            country=site.name,
            salary_currency=site.currency_code,
        )

        db.session.add(candidate)
        db.session.flush()
        ensure_candidate_site(candidate, site)
        _audit_admin('candidate.created', 'candidate', candidate.id, details={})
        db.session.commit()

        return jsonify({
            'message': 'Candidato criado com sucesso',
            'candidate': {
                'id': candidate.id,
                'name': f"{candidate.first_name} {candidate.last_name}",
                'email': user.email
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates/<int:candidate_id>', methods=['PUT'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def update_candidate(candidate_id):
    """Update a candidate"""
    try:
        candidate_result = _site_candidate(candidate_id)

        if not candidate_result:
            return jsonify({'error': 'Candidato não encontrado'}), 404
        candidate, candidate_site = candidate_result

        data, payload_error = _json_object()
        if payload_error:
            return payload_error
        global_profile_fields = {
            'first_name', 'last_name', 'phone', 'city', 'state', 'linkedin_url',
            'github_url', 'portfolio_url', 'bio', 'current_position', 'years_experience',
        }
        has_other_site = CandidateSite.query.filter(
            CandidateSite.candidate_id == candidate.id,
            CandidateSite.site_id != get_current_site().id,
        ).first() is not None
        if has_other_site and global_profile_fields.intersection(data):
            return jsonify({
                'error': 'Perfil global não pode ser alterado por um administrador regional quando o candidato pertence a vários sites'
            }), 409

        # Atualizar campos do candidato
        if 'first_name' in data:
            candidate.first_name = data['first_name']
        if 'last_name' in data:
            candidate.last_name = data['last_name']
        if 'phone' in data:
            candidate.phone = data['phone']
        if 'city' in data:
            candidate.city = data['city']
        if 'state' in data:
            candidate.state = data['state']
        if 'linkedin_url' in data:
            candidate.linkedin_url = data['linkedin_url']
        if 'github_url' in data:
            candidate.github_url = data['github_url']
        if 'portfolio_url' in data:
            candidate.portfolio_url = data['portfolio_url']
        if 'bio' in data:
            candidate.professional_summary = data['bio']
        if 'current_position' in data:
            candidate.current_title = data['current_position']
        if 'years_experience' in data:
            candidate.years_experience = int(data['years_experience']) if data['years_experience'] else None
        if 'expected_salary' in data:
            candidate_site.expected_salary = float(data['expected_salary']) if data['expected_salary'] else None
        if 'is_available' in data:
            if not isinstance(data['is_available'], bool):
                return jsonify({'error': 'is_available deve ser booleano'}), 400
            candidate_site.is_actively_looking = data['is_available']
        if 'is_discoverable' in data:
            if not isinstance(data['is_discoverable'], bool):
                return jsonify({'error': 'is_discoverable deve ser booleano'}), 400
            candidate_site.is_discoverable = data['is_discoverable']

        # Email is a global credential and is intentionally not editable through
        # a regional admin screen.
        if 'email' in data:
            return jsonify({'error': 'Email não pode ser alterado por esta rota regional'}), 409
        if 'is_active' in data:
            if not isinstance(data['is_active'], bool):
                return jsonify({'error': 'is_active deve ser booleano'}), 400
            candidate_site.is_active = data['is_active']
            if not candidate_site.is_active:
                candidate_site.is_discoverable = False
                _revoke_site_sessions(candidate.user_id, get_current_site().id)

        _audit_admin('candidate.updated', 'candidate', candidate.id, details={'fields': sorted(data.keys())})
        db.session.commit()

        return jsonify({
            'message': 'Candidato atualizado com sucesso'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates/<int:candidate_id>', methods=['DELETE'])
@admin_required(permission=AdminPermission.MANAGE_CANDIDATES)
def delete_candidate(candidate_id):
    """Delete a candidate"""
    try:
        candidate_result = _site_candidate(candidate_id)

        if not candidate_result:
            return jsonify({'error': 'Candidato não encontrado'}), 404
        candidate, candidate_site = candidate_result

        candidate_site.is_active = False
        candidate_site.is_discoverable = False
        _revoke_site_sessions(candidate.user_id, get_current_site().id)
        _audit_admin('candidate.regional_access_removed', 'candidate', candidate.id, details={})

        db.session.commit()

        return jsonify({'message': 'Presença regional do candidato desativada com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
