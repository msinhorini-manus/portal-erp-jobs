"""
Portal ERP Jobs API - Statistics Routes
Endpoints para estatísticas da plataforma
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_
from src.config import db
from src.models.user import User
from src.models.candidate import Candidate
from src.models.company import Company
from src.models.job import Job
from src.models.application import Application

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')


@stats_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """
    GET /api/stats/dashboard
    Retorna estatísticas gerais da plataforma para a homepage
    """
    try:
        # Contar vagas ativas
        active_jobs = Job.query.filter_by(is_active=True).count()
        
        # Contar empresas cadastradas
        total_companies = Company.query.count()
        
        # Contar candidatos cadastrados
        total_candidates = Candidate.query.count()
        
        return jsonify({
            'active_jobs': active_jobs,
            'total_companies': total_companies,
            'total_candidates': total_candidates
        }), 200
        
    except Exception as e:
        print(f"Erro ao buscar estatísticas do dashboard: {str(e)}")
        return jsonify({'error': 'Erro ao buscar estatísticas'}), 500


@stats_bp.route('/categories', methods=['GET'])
def get_categories_stats():
    """
    GET /api/stats/categories
    Retorna estatísticas por categoria com top vagas
    """
    try:
        # Categorias do Portal ERP Jobs
        categories = [
            'Desenvolvimento',
            'Consultoria & ERP',
            'Suporte & Infraestrutura',
            'Gestão & Liderança',
            'Vendas & Pré-Vendas',
            'Administrativo',
            'DevOps & Cloud',
            'Dados & Analytics',
            'Segurança'
        ]
        
        result = []
        
        for category in categories:
            # Contar vagas ativas nesta categoria
            jobs_count = Job.query.filter(
                and_(
                    Job.is_active == True,
                    Job.area.ilike(f'%{category}%')
                )
            ).count()
            
            # Buscar top 4 vagas mais recentes desta categoria
            top_jobs = Job.query.filter(
                and_(
                    Job.is_active == True,
                    Job.area.ilike(f'%{category}%')
                )
            ).order_by(Job.created_at.desc()).limit(4).all()
            
            # Formatar top jobs
            job_titles = [job.title for job in top_jobs]
            if len(job_titles) > 3:
                job_titles = job_titles[:3] + ['+1 mais']
            
            result.append({
                'category': category,
                'jobs_count': jobs_count,
                'top_jobs': job_titles
            })
        
        return jsonify({'categories': result}), 200
        
    except Exception as e:
        print(f"Erro ao buscar estatísticas de categorias: {str(e)}")
        return jsonify({'error': 'Erro ao buscar estatísticas de categorias'}), 500


@stats_bp.route('/company', methods=['GET'])
@jwt_required()
def get_company_stats():
    """
    GET /api/stats/company
    Retorna estatísticas da empresa logada
    Requer autenticação
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Buscar usuário e empresa
        user = User.query.get(current_user_id)
        if not user or user.user_type != 'company':
            return jsonify({'error': 'Usuário não é uma empresa'}), 403
        
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Empresa não encontrada'}), 404
        
        # Buscar todas as vagas da empresa
        all_jobs = Job.query.filter_by(company_id=company.id).all()
        
        # Contar vagas ativas
        active_jobs = sum(1 for job in all_jobs if job.is_active)
        
        # Contar total de candidaturas recebidas
        total_applications = 0
        for job in all_jobs:
            applications_count = Application.query.filter_by(job_id=job.id).count()
            total_applications += applications_count
        
        # Calcular taxa de conversão (candidaturas / vagas ativas)
        conversion_rate = 0
        if active_jobs > 0:
            conversion_rate = round((total_applications / active_jobs), 2)
        
        # Total de visualizações (placeholder - implementar tracking depois)
        total_views = 0
        
        return jsonify({
            'total_jobs': len(all_jobs),
            'active_jobs': active_jobs,
            'paused_jobs': len(all_jobs) - active_jobs,
            'total_applications': total_applications,
            'total_views': total_views,
            'conversion_rate': conversion_rate,
            'company_name': company.company_name
        }), 200
        
    except Exception as e:
        print(f"Erro ao buscar estatísticas da empresa: {str(e)}")
        return jsonify({'error': 'Erro ao buscar estatísticas da empresa'}), 500

