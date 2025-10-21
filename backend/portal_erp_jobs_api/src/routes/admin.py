"""
Admin routes for Portal ERP Jobs
"""
from flask import Blueprint, jsonify, request
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
        
        if not user or user.user_type != 'admin':
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

