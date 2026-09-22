"""
Admin routes for Portal ERP Jobs
"""
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from src.config import db
from src.models import User, Admin, Candidate, Company, Job, Application

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def admin_required(fn):
    """Decorator to require admin access"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_active or user.user_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get platform statistics"""
    try:
        total_companies = Company.query.count()
        total_candidates = Candidate.query.count()
        total_jobs = Job.query.count()
        active_jobs = Job.query.filter_by(is_active=True).count()
        total_applications = Application.query.count()

        # Recent activity (last 24 hours)
        from datetime import datetime, timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)

        new_companies_today = Company.query.filter(Company.created_at >= yesterday).count()
        new_candidates_today = Candidate.query.filter(Candidate.created_at >= yesterday).count()
        new_jobs_today = Job.query.filter(Job.created_at >= yesterday).count()
        new_applications_today = Application.query.filter(Application.applied_at >= yesterday).count()

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


@admin_bp.route('/tags', methods=['GET'])
@admin_required
def get_tags():
    """Get all tags"""
    try:
        # TODO: Implement tags table
        # For now, return empty list
        return jsonify({'tags': []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags', methods=['POST'])
@admin_required
def create_tag():
    """Create a new tag"""
    try:
        data = request.get_json()
        # TODO: Implement tags table
        return jsonify({'message': 'Tag created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags/<int:tag_id>', methods=['PUT'])
@admin_required
def update_tag(tag_id):
    """Update a tag"""
    try:
        data = request.get_json()
        # TODO: Implement tags table
        return jsonify({'message': 'Tag updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tags/<int:tag_id>', methods=['DELETE'])
@admin_required
def delete_tag(tag_id):
    """Delete a tag"""
    try:
        # TODO: Implement tags table
        return jsonify({'message': 'Tag deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_type = request.args.get('type', None)

        query = User.query

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
@admin_required
def delete_user(user_id):
    """Delete a user"""
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.user_type == 'admin':
            return jsonify({'error': 'Cannot delete admin users'}), 403

        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'User deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PATCH'])
@admin_required
def toggle_user_active(user_id):
    """Toggle user active status"""
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.user_type == 'admin':
            return jsonify({'error': 'Cannot modify admin users'}), 403

        user.is_active = not user.is_active
        db.session.commit()

        return jsonify({
            'message': 'User status updated',
            'is_active': user.is_active
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs', methods=['GET'])
@admin_required
def get_all_jobs():
    """Get all jobs for moderation"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', None)

        query = Job.query

        if status == 'active':
            query = query.filter_by(is_active=True)
        elif status == 'inactive':
            query = query.filter_by(is_active=False)

        pagination = query.order_by(Job.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'jobs': [job.to_dict() for job in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@admin_required
def delete_job(job_id):
    """Delete a job"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        db.session.delete(job)
        db.session.commit()

        return jsonify({'message': 'Job deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500




@admin_bp.route('/companies', methods=['GET'])
@admin_required
def get_all_companies():
    """Get all companies for management"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', None)  # active, inactive, all

        query = Company.query

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    Company.company_name.ilike(f'%{search}%'),
                    Company.cnpj.ilike(f'%{search}%')
                )
            )

        # Status filter
        if status == 'active':
            query = query.join(User).filter(User.is_active == True)
        elif status == 'inactive':
            query = query.join(User).filter(User.is_active == False)

        pagination = query.order_by(Company.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        companies_data = []
        for company in pagination.items:
            user = User.query.get(company.user_id)
            jobs_count = Job.query.filter_by(company_id=company.id).count()
            active_jobs = Job.query.filter_by(company_id=company.id, is_active=True).count()

            companies_data.append({
                'id': company.id,
                'user_id': company.user_id,
                'name': company.company_name,
                'cnpj': company.cnpj,
                'email': user.email if user else None,
                'phone': company.phone,
                'sector': company.sector,
                'size': company.company_size,
                'city': company.city,
                'state': company.state,
                'website': company.website,
                'description': company.description,
                'is_active': user.is_active if user else False,
                'is_member': getattr(company, 'is_member', False),
                'max_active_jobs': getattr(company, 'max_active_jobs', 3),
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
@admin_required
def get_company_details(company_id):
    """Get detailed company information"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        user = User.query.get(company.user_id)
        jobs = Job.query.filter_by(company_id=company.id).order_by(Job.created_at.desc()).all()

        jobs_data = []
        for job in jobs:
            applications_count = Application.query.filter_by(job_id=job.id).count()
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
                'name': company.company_name,
                'cnpj': company.cnpj,
                'email': user.email if user else None,
                'phone': company.phone,
                'sector': company.sector,
                'size': company.company_size,
                'city': company.city,
                'state': company.state,
                'country': company.country,
                'address': company.street_address,
                'website': company.website,
                'description': company.description,
                'is_active': user.is_active if user else False,
                'is_member': company.is_member,
                'max_active_jobs': company.max_active_jobs,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'updated_at': company.updated_at.isoformat() if company.updated_at else None
            },
            'jobs': jobs_data,
            'stats': {
                'total_jobs': len(jobs),
                'active_jobs': len([j for j in jobs if j.is_active]),
                'total_applications': sum([Application.query.filter_by(job_id=j.id).count() for j in jobs])
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>', methods=['PUT'])
@admin_required
def update_company(company_id):
    """Update company information"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        data = request.get_json()

        # Update allowed fields - map frontend names to model names
        field_mapping = {
            'name': 'company_name',
            'phone': 'phone',
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
                setattr(company, model_field, data[frontend_field])

        # Admin-only fields: membership and job limits
        if 'is_member' in data:
            company.is_member = bool(data['is_member'])
        if 'max_active_jobs' in data:
            company.max_active_jobs = int(data['max_active_jobs'])

        company.updated_at = db.func.now()
        db.session.commit()

        user = User.query.get(company.user_id)
        return jsonify({
            'message': 'Company updated successfully',
            'company': {
                'id': company.id,
                'name': company.company_name,
                'email': user.email if user else None,
                'is_member': company.is_member,
                'max_active_jobs': company.max_active_jobs
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/toggle-active', methods=['PATCH'])
@admin_required
def toggle_company_active(company_id):
    """Toggle company active status"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        user = User.query.get(company.user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_active = not user.is_active

        # If deactivating company, also deactivate all their jobs
        if not user.is_active:
            Job.query.filter_by(company_id=company.id).update({'is_active': False})

        db.session.commit()

        return jsonify({
            'message': 'Company status updated',
            'is_active': user.is_active,
            'company_name': company.name
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>', methods=['DELETE'])
@admin_required
def delete_company(company_id):
    """Delete a company and all related data"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        # Delete all applications for company's jobs
        jobs = Job.query.filter_by(company_id=company.id).all()
        for job in jobs:
            Application.query.filter_by(job_id=job.id).delete()

        # Delete all jobs
        Job.query.filter_by(company_id=company.id).delete()

        # Delete user
        user = User.query.get(company.user_id)

        # Delete company
        db.session.delete(company)

        if user:
            db.session.delete(user)

        db.session.commit()

        return jsonify({'message': 'Company deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/jobs', methods=['GET'])
@admin_required
def get_company_jobs(company_id):
    """Get all jobs from a specific company"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        pagination = Job.query.filter_by(company_id=company.id).order_by(
            Job.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        jobs_data = []
        for job in pagination.items:
            applications_count = Application.query.filter_by(job_id=job.id).count()
            jobs_data.append({
                **job.to_dict(),
                'applications_count': applications_count
            })

        return jsonify({
            'company': {'id': company.id, 'name': company.name},
            'jobs': jobs_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates', methods=['GET'])
@admin_required
def get_all_candidates():
    """Get all candidates for management"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', None)

        query = Candidate.query

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    db.func.concat(Candidate.first_name, ' ', Candidate.last_name).ilike(f'%{search}%'),
                    Candidate.email.ilike(f'%{search}%')
                )
            )

        # Status filter
        if status == 'active':
            query = query.join(User).filter(User.is_active == True)
        elif status == 'inactive':
            query = query.join(User).filter(User.is_active == False)

        pagination = query.order_by(Candidate.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        candidates_data = []
        for candidate in pagination.items:
            user = User.query.get(candidate.user_id)
            applications_count = Application.query.filter_by(candidate_id=candidate.id).count()

            candidates_data.append({
                'id': candidate.id,
                'user_id': candidate.user_id,
                'full_name': f"{candidate.first_name} {candidate.last_name}",
                'email': candidate.email,
                'phone': candidate.phone,
                'city': candidate.city,
                'state': candidate.state,
                'is_active': user.is_active if user else False,
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
@admin_required
def toggle_candidate_active(candidate_id):
    """Toggle candidate active status"""
    try:
        candidate = Candidate.query.get(candidate_id)

        if not candidate:
            return jsonify({'error': 'Candidate not found'}), 404

        user = User.query.get(candidate.user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_active = not user.is_active
        db.session.commit()

        return jsonify({
            'message': 'Candidate status updated',
            'is_active': user.is_active,
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

        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', 'Administrator')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Check if user with this email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), 400

        # Create User
        from werkzeug.security import generate_password_hash
        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            user_type='admin'
        )
        db.session.add(user)
        db.session.flush()  # Get user.id

        # Create Admin profile
        admin = Admin(
            user_id=user.id,
            name=name,
            role='super_admin',
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
@admin_required
def get_candidate_details(candidate_id):
    """Get detailed candidate information"""
    try:
        candidate = Candidate.query.get(candidate_id)

        if not candidate:
            return jsonify({'error': 'Candidate not found'}), 404

        user = User.query.get(candidate.user_id)
        applications = Application.query.filter_by(candidate_id=candidate.id).all()

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
            'email': candidate.email,
            'phone': candidate.phone,
            'city': candidate.city,
            'state': candidate.state,
            'title': candidate.title,
            'summary': candidate.summary,
            'experience_years': candidate.experience_years,
            'salary_expectation': candidate.salary_expectation,
            'is_active': user.is_active if user else False,
            'created_at': candidate.created_at.isoformat() if candidate.created_at else None,
            'applications': applications_data,
            'applications_count': len(applications_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates/<int:candidate_id>/toggle-status', methods=['PUT'])
@admin_required
def toggle_candidate_status(candidate_id):
    """Toggle candidate active status (alternative endpoint)"""
    try:
        candidate = Candidate.query.get(candidate_id)

        if not candidate:
            return jsonify({'error': 'Candidate not found'}), 404

        user = User.query.get(candidate.user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        is_active = data.get('is_active', not user.is_active)

        user.is_active = is_active
        db.session.commit()

        return jsonify({
            'message': 'Candidate status updated',
            'is_active': user.is_active,
            'candidate_name': f"{candidate.first_name} {candidate.last_name}"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>', methods=['GET'])
@admin_required
def get_job_details(job_id):
    """Get detailed job information for admin"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        company = Company.query.get(job.company_id) if job.company_id else None
        applications = Application.query.filter_by(job_id=job.id).all()

        applications_data = []
        for app in applications:
            candidate = Candidate.query.get(app.candidate_id)
            if candidate:
                applications_data.append({
                    'id': app.id,
                    'candidate_id': candidate.id,
                    'candidate_name': f"{candidate.first_name} {candidate.last_name}",
                    'candidate_email': candidate.email,
                    'applied_at': app.applied_at.isoformat() if app.applied_at else None,
                    'status': app.status
                })

        return jsonify({
            'id': job.id,
            'title': job.title,
            'description': job.description,
            'requirements': job.requirements,
            'benefits': job.benefits,
            'area': job.area,
            'level': job.level,
            'modality': job.modality,
            'contract_type': job.contract_type,
            'location': job.location,
            'city': job.city,
            'state': job.state,
            'salary_min': job.salary_min,
            'salary_max': job.salary_max,
            'is_active': job.is_active,
            'is_featured': getattr(job, 'is_featured', False),
            'status': getattr(job, 'status', 'active' if job.is_active else 'inactive'),
            'company_id': job.company_id,
            'company_name': company.name if company else 'N/A',
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'applications': applications_data,
            'applications_count': len(applications_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>/status', methods=['PUT'])
@admin_required
def update_job_status(job_id):
    """Update job status (approve, reject, pending, close)"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        data = request.get_json()
        new_status = data.get('status')

        if new_status not in ['approved', 'rejected', 'pending', 'active', 'closed']:
            return jsonify({'error': 'Invalid status'}), 400

        # Map status to is_active
        if new_status in ['approved', 'active']:
            job.is_active = True
        elif new_status in ['rejected', 'closed']:
            job.is_active = False

        # Store status if the model supports it
        if hasattr(job, 'status'):
            job.status = new_status

        db.session.commit()

        return jsonify({
            'message': f'Job status updated to {new_status}',
            'job_id': job.id,
            'status': new_status,
            'is_active': job.is_active
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>/featured', methods=['PUT'])
@admin_required
def toggle_job_featured(job_id):
    """Toggle job featured status"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        data = request.get_json()
        is_featured = data.get('is_featured', not getattr(job, 'is_featured', False))

        # Check if the model has is_featured field
        if hasattr(job, 'is_featured'):
            job.is_featured = is_featured

        db.session.commit()

        return jsonify({
            'message': 'Job featured status updated',
            'job_id': job.id,
            'is_featured': is_featured
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# COMPANY APPROVAL ROUTES
# ============================================

@admin_bp.route('/companies/pending', methods=['GET'])
@admin_required
def get_pending_companies():
    """Get companies pending approval"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Get companies with pending approval status
        query = Company.query.filter_by(approval_status='pending')

        pagination = query.order_by(Company.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        companies_data = []
        for company in pagination.items:
            user = User.query.get(company.user_id)
            companies_data.append({
                'id': company.id,
                'name': company.company_name,
                'cnpj': company.cnpj,
                'email': user.email if user else None,
                'phone': company.phone,
                'sector': company.sector,
                'city': company.city,
                'state': company.state,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'approval_status': company.approval_status
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
@admin_required
def approve_company(company_id):
    """Approve a company registration"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        user = User.query.get(company.user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Update approval status
        company.approval_status = 'approved'
        company.approved_at = db.func.now()

        # Get current admin ID
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if admin:
            company.approved_by = admin.id

        # Activate user account
        user.is_active = True

        db.session.commit()

        # TODO: Send approval email to company

        return jsonify({
            'message': 'Company approved successfully',
            'company': {
                'id': company.id,
                'name': company.company_name,
                'approval_status': company.approval_status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/companies/<int:company_id>/reject', methods=['POST'])
@admin_required
def reject_company(company_id):
    """Reject a company registration"""
    try:
        company = Company.query.get(company_id)

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        data = request.get_json() or {}
        rejection_reason = data.get('reason', '')

        # Update approval status
        company.approval_status = 'rejected'
        company.rejection_reason = rejection_reason
        company.approved_at = db.func.now()

        # Get current admin ID
        current_user_id = get_jwt_identity()
        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if admin:
            company.approved_by = admin.id

        # Keep user inactive
        user = User.query.get(company.user_id)
        if user:
            user.is_active = False

        db.session.commit()

        # TODO: Send rejection email to company

        return jsonify({
            'message': 'Company rejected',
            'company': {
                'id': company.id,
                'name': company.company_name,
                'approval_status': company.approval_status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# ADMIN MANAGEMENT ROUTES
# ============================================

def super_admin_required(fn):
    """Decorator to require super admin access"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_active or user.user_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        admin = Admin.query.filter_by(user_id=current_user_id).first()
        if not admin or admin.role != 'super_admin':
            return jsonify({'error': 'Super admin access required'}), 403

        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route('/admins', methods=['GET'])
@super_admin_required
def get_all_admins():
    """Get all admin users (super admin only)"""
    try:
        admins = Admin.query.all()

        admins_data = []
        for admin in admins:
            user = User.query.get(admin.user_id)
            admins_data.append({
                'id': admin.id,
                'user_id': admin.user_id,
                'name': admin.name,
                'email': user.email if user else None,
                'role': admin.role,
                'permissions': admin.permissions,
                'is_active': user.is_active if user else False,
                'last_login': admin.last_login.isoformat() if admin.last_login else None,
                'created_at': admin.created_at.isoformat() if admin.created_at else None
            })

        return jsonify({'admins': admins_data}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins', methods=['POST'])
@super_admin_required
def create_admin():
    """Create a new admin user (super admin only)"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Check if email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400

        # Validate role
        valid_roles = ['super_admin', 'admin', 'moderator']
        if data['role'] not in valid_roles:
            return jsonify({'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}), 400

        # Create user
        from werkzeug.security import generate_password_hash
        user = User(
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='admin',
            is_active=True
        )
        db.session.add(user)
        db.session.flush()

        # Create admin profile
        admin = Admin(
            user_id=user.id,
            name=data['name'],
            role=data['role'],
            permissions=data.get('permissions', {})
        )
        db.session.add(admin)
        db.session.commit()

        return jsonify({
            'message': 'Admin created successfully',
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


@admin_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@super_admin_required
def update_admin(admin_id):
    """Update an admin user (super admin only)"""
    try:
        admin = Admin.query.get(admin_id)

        if not admin:
            return jsonify({'error': 'Admin not found'}), 404

        data = request.get_json()

        # Update admin fields
        if 'name' in data:
            admin.name = data['name']
        if 'role' in data:
            valid_roles = ['super_admin', 'admin', 'moderator']
            if data['role'] not in valid_roles:
                return jsonify({'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}), 400
            admin.role = data['role']
        if 'permissions' in data:
            admin.permissions = data['permissions']

        # Update user email if provided
        user = User.query.get(admin.user_id)
        if user and 'email' in data:
            # Check if email is already taken by another user
            existing = User.query.filter(User.email == data['email'], User.id != user.id).first()
            if existing:
                return jsonify({'error': 'Email already in use'}), 400
            user.email = data['email']

        # Update password if provided
        if 'password' in data and data['password']:
            from werkzeug.security import generate_password_hash
            user.password_hash = generate_password_hash(data['password'])

        db.session.commit()

        return jsonify({
            'message': 'Admin updated successfully',
            'admin': {
                'id': admin.id,
                'name': admin.name,
                'email': user.email if user else None,
                'role': admin.role
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@super_admin_required
def delete_admin(admin_id):
    """Delete an admin user (super admin only)"""
    try:
        admin = Admin.query.get(admin_id)

        if not admin:
            return jsonify({'error': 'Admin not found'}), 404

        # Prevent deleting the last super admin
        if admin.role == 'super_admin':
            super_admin_count = Admin.query.filter_by(role='super_admin').count()
            if super_admin_count <= 1:
                return jsonify({'error': 'Cannot delete the last super admin'}), 400

        # Get current admin to prevent self-deletion
        current_user_id = get_jwt_identity()
        if admin.user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400

        user = User.query.get(admin.user_id)

        db.session.delete(admin)
        if user:
            db.session.delete(user)

        db.session.commit()

        return jsonify({'message': 'Admin deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admins/<int:admin_id>/toggle-active', methods=['PATCH'])
@super_admin_required
def toggle_admin_active(admin_id):
    """Toggle admin active status (super admin only)"""
    try:
        admin = Admin.query.get(admin_id)

        if not admin:
            return jsonify({'error': 'Admin not found'}), 404

        # Prevent deactivating the last active super admin
        if admin.role == 'super_admin':
            user = User.query.get(admin.user_id)
            if user and user.is_active:
                active_super_admins = db.session.query(Admin).join(User).filter(
                    Admin.role == 'super_admin',
                    User.is_active == True
                ).count()
                if active_super_admins <= 1:
                    return jsonify({'error': 'Cannot deactivate the last active super admin'}), 400

        # Get current admin to prevent self-deactivation
        current_user_id = get_jwt_identity()
        if admin.user_id == current_user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400

        user = User.query.get(admin.user_id)
        if user:
            user.is_active = not user.is_active
            db.session.commit()

            return jsonify({
                'message': 'Admin status updated',
                'is_active': user.is_active
            }), 200

        return jsonify({'error': 'User not found'}), 404

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============== CRUD COMPLETO DE VAGAS ==============

@admin_bp.route('/jobs', methods=['POST'])
@admin_required
def create_job():
    """Create a new job"""
    try:
        data = request.get_json()

        # Validar campos obrigatórios
        if not data.get('title'):
            return jsonify({'error': 'Título é obrigatório'}), 400
        if not data.get('company_id'):
            return jsonify({'error': 'Empresa é obrigatória'}), 400

        # Verificar se a empresa existe
        company = Company.query.get(data['company_id'])
        if not company:
            return jsonify({'error': 'Empresa não encontrada'}), 404

        # Criar a vaga
        job = Job(
            company_id=data['company_id'],
            title=data['title'],
            description=data.get('description', ''),
            requirements=data.get('requirements', ''),
            responsibilities=data.get('benefits', ''),  # Usando responsibilities para benefits
            area=data.get('area', ''),
            seniority_level=data.get('experience_level', ''),
            work_modality=data.get('modality', ''),
            contract_type=data.get('contract_type', ''),
            min_salary=float(data['salary_min']) if data.get('salary_min') else None,
            max_salary=float(data['salary_max']) if data.get('salary_max') else None,
            city=data.get('city', ''),
            state=data.get('state', ''),
            is_active=True
        )

        db.session.add(job)
        db.session.commit()

        return jsonify({
            'message': 'Vaga criada com sucesso',
            'job': job.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>', methods=['PUT'])
@admin_required
def update_job(job_id):
    """Update a job"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        data = request.get_json()

        # Atualizar campos
        if 'title' in data:
            job.title = data['title']
        if 'description' in data:
            job.description = data['description']
        if 'requirements' in data:
            job.requirements = data['requirements']
        if 'benefits' in data:
            job.responsibilities = data['benefits']
        if 'modality' in data:
            job.work_modality = data['modality']
        if 'contract_type' in data:
            job.contract_type = data['contract_type']
        if 'experience_level' in data:
            job.seniority_level = data['experience_level']
        if 'city' in data:
            job.city = data['city']
        if 'state' in data:
            job.state = data['state']
        if 'salary_min' in data:
            job.min_salary = float(data['salary_min']) if data['salary_min'] else None
        if 'salary_max' in data:
            job.max_salary = float(data['salary_max']) if data['salary_max'] else None
        if 'is_active' in data:
            job.is_active = data['is_active']

        db.session.commit()

        return jsonify({
            'message': 'Vaga atualizada com sucesso',
            'job': job.to_dict(include_details=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/jobs/<int:job_id>/toggle-status', methods=['PUT'])
@admin_required
def toggle_job_status_simple(job_id):
    """Toggle job active status"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        data = request.get_json()
        job.is_active = data.get('is_active', not job.is_active)

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
@admin_required
def create_candidate():
    """Create a new candidate"""
    try:
        data = request.get_json()

        # Validar campos obrigatórios
        if not data.get('email'):
            return jsonify({'error': 'Email é obrigatório'}), 400
        if not data.get('first_name'):
            return jsonify({'error': 'Nome é obrigatório'}), 400
        if not data.get('last_name'):
            return jsonify({'error': 'Sobrenome é obrigatório'}), 400

        # Verificar se o email já existe
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email já cadastrado'}), 400

        from werkzeug.security import generate_password_hash

        # Criar usuário
        user = User(
            email=data['email'],
            password_hash=generate_password_hash(data.get('password', 'temp123')),
            user_type='candidate',
            is_active=True,
            is_verified=True
        )
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
            bio=data.get('bio', ''),
            current_position=data.get('current_position', ''),
            years_experience=int(data['years_experience']) if data.get('years_experience') else None,
            expected_salary=float(data['expected_salary']) if data.get('expected_salary') else None,
            is_available=data.get('is_available', True),
            preferred_modality=data.get('preferred_modality', '')
        )

        db.session.add(candidate)
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
@admin_required
def update_candidate(candidate_id):
    """Update a candidate"""
    try:
        candidate = Candidate.query.get(candidate_id)

        if not candidate:
            return jsonify({'error': 'Candidato não encontrado'}), 404

        data = request.get_json()
        user = User.query.get(candidate.user_id)

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
            candidate.bio = data['bio']
        if 'current_position' in data:
            candidate.current_position = data['current_position']
        if 'years_experience' in data:
            candidate.years_experience = int(data['years_experience']) if data['years_experience'] else None
        if 'expected_salary' in data:
            candidate.expected_salary = float(data['expected_salary']) if data['expected_salary'] else None
        if 'is_available' in data:
            candidate.is_available = data['is_available']
        if 'preferred_modality' in data:
            candidate.preferred_modality = data['preferred_modality']

        # Atualizar campos do usuário
        if user:
            if 'email' in data:
                user.email = data['email']
            if 'is_active' in data:
                user.is_active = data['is_active']

        db.session.commit()

        return jsonify({
            'message': 'Candidato atualizado com sucesso'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/candidates/<int:candidate_id>', methods=['DELETE'])
@admin_required
def delete_candidate(candidate_id):
    """Delete a candidate"""
    try:
        candidate = Candidate.query.get(candidate_id)

        if not candidate:
            return jsonify({'error': 'Candidato não encontrado'}), 404

        user = User.query.get(candidate.user_id)

        # Deletar candidato e usuário
        db.session.delete(candidate)
        if user:
            db.session.delete(user)

        db.session.commit()

        return jsonify({'message': 'Candidato excluído com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
