from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.application import Application
from src.models.candidate import Candidate
from src.models.job import Job
from src.models.company import Company
from src.config import db
from datetime import datetime

applications_bp = Blueprint('applications', __name__, url_prefix='/api/applications')

@applications_bp.route('/', methods=['POST'])
@jwt_required()
def apply_to_job():
    """
    Candidatar-se a uma vaga (apenas candidatos)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é candidato
        if claims.get('user_type') != 'candidate':
            return jsonify({'error': 'Acesso negado. Apenas candidatos podem se candidatar'}), 403
        
        # Buscar candidato
        candidate = Candidate.query.filter_by(user_id=current_user_id).first()
        if not candidate:
            return jsonify({'error': 'Perfil de candidato não encontrado. Complete seu perfil primeiro'}), 404
        
        data = request.get_json()
        
        # Validar dados obrigatórios
        if not data.get('job_id'):
            return jsonify({'error': 'ID da vaga é obrigatório'}), 400
        
        job_id = data.get('job_id')
        
        # Verificar se a vaga existe e está ativa
        job = Job.query.get(job_id)
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404
        if job.status != 'active':
            return jsonify({'error': 'Esta vaga não está mais ativa'}), 400
        
        # Verificar se já se candidatou
        existing_application = Application.query.filter_by(
            job_id=job_id,
            candidate_id=candidate.id
        ).first()
        
        if existing_application:
            return jsonify({'error': 'Você já se candidatou a esta vaga'}), 409
        
        # Calcular match percentage (simplificado - pode ser melhorado)
        match_percentage = calculate_match_percentage(candidate, job)
        
        # Criar candidatura
        new_application = Application(
            job_id=job_id,
            candidate_id=candidate.id,
            status='pending',
            cover_letter=data.get('cover_letter', ''),
            match_percentage=match_percentage
        )
        
        db.session.add(new_application)
        db.session.commit()
        
        return jsonify({
            'message': 'Candidatura enviada com sucesso',
            'application': new_application.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@applications_bp.route('/my-applications', methods=['GET'])
@jwt_required()
def get_my_applications():
    """
    Listar todas as candidaturas do candidato autenticado
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é candidato
        if claims.get('user_type') != 'candidate':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar candidato
        candidate = Candidate.query.filter_by(user_id=current_user_id).first()
        if not candidate:
            return jsonify({'error': 'Perfil de candidato não encontrado'}), 404
        
        # Parâmetros de paginação e filtro
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        # Buscar candidaturas
        applications_query = Application.query.filter_by(candidate_id=candidate.id)
        
        if status:
            applications_query = applications_query.filter_by(status=status)
        
        applications_query = applications_query.order_by(Application.applied_at.desc())
        
        pagination = applications_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'applications': [a.to_dict() for a in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@applications_bp.route('/<int:application_id>', methods=['GET'])
@jwt_required()
def get_application_by_id(application_id):
    """
    Obter detalhes de uma candidatura específica
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Buscar candidatura
        application = Application.query.get(application_id)
        if not application:
            return jsonify({'error': 'Candidatura não encontrada'}), 404
        
        # Verificar permissão
        if claims.get('user_type') == 'candidate':
            candidate = Candidate.query.filter_by(user_id=current_user_id).first()
            if not candidate or application.candidate_id != candidate.id:
                return jsonify({'error': 'Acesso negado'}), 403
        elif claims.get('user_type') == 'company':
            company = Company.query.filter_by(user_id=current_user_id).first()
            if not company or application.job.company_id != company.id:
                return jsonify({'error': 'Acesso negado'}), 403
        else:
            return jsonify({'error': 'Acesso negado'}), 403
        
        return jsonify(application.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@applications_bp.route('/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_application_status(application_id):
    """
    Atualizar status de uma candidatura (apenas empresa dona da vaga)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado. Apenas empresas podem atualizar status'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        # Buscar candidatura
        application = Application.query.get(application_id)
        if not application:
            return jsonify({'error': 'Candidatura não encontrada'}), 404
        
        # Verificar se a vaga pertence à empresa
        if application.job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para atualizar esta candidatura'}), 403
        
        data = request.get_json()
        
        # Validar novo status
        valid_statuses = ['pending', 'reviewing', 'interview', 'approved', 'rejected']
        new_status = data.get('status')
        
        if not new_status or new_status not in valid_statuses:
            return jsonify({'error': f'Status inválido. Use um dos seguintes: {", ".join(valid_statuses)}'}), 400
        
        # Atualizar status
        application.status = new_status
        application.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Status atualizado com sucesso',
            'application': application.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@applications_bp.route('/<int:application_id>', methods=['DELETE'])
@jwt_required()
def withdraw_application(application_id):
    """
    Retirar candidatura (apenas candidato dono da candidatura)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é candidato
        if claims.get('user_type') != 'candidate':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar candidato
        candidate = Candidate.query.filter_by(user_id=current_user_id).first()
        if not candidate:
            return jsonify({'error': 'Perfil de candidato não encontrado'}), 404
        
        # Buscar candidatura
        application = Application.query.get(application_id)
        if not application:
            return jsonify({'error': 'Candidatura não encontrada'}), 404
        
        # Verificar se a candidatura pertence ao candidato
        if application.candidate_id != candidate.id:
            return jsonify({'error': 'Você não tem permissão para retirar esta candidatura'}), 403
        
        db.session.delete(application)
        db.session.commit()
        
        return jsonify({'message': 'Candidatura retirada com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def calculate_match_percentage(candidate, job):
    """
    Calcular percentual de match entre candidato e vaga
    Algoritmo simplificado - pode ser melhorado
    """
    try:
        match_score = 0
        total_factors = 0
        
        # Fator 1: Localização (peso 20%)
        total_factors += 20
        if candidate.city and job.city:
            if candidate.city.lower() == job.city.lower():
                match_score += 20
            elif candidate.state and job.state and candidate.state.lower() == job.state.lower():
                match_score += 10
        
        # Fator 2: Pretensão salarial (peso 20%)
        total_factors += 20
        if candidate.salary_expectation and job.salary_min and job.salary_max:
            if job.salary_min <= candidate.salary_expectation <= job.salary_max:
                match_score += 20
            elif candidate.salary_expectation <= job.salary_max * 1.2:
                match_score += 10
        
        # Fator 3: Tecnologias (peso 60%)
        total_factors += 60
        if job.technologies:
            candidate_tech_ids = [skill.technology_id for skill in candidate.skills]
            job_tech_ids = [jt.technology_id for jt in job.technologies]
            
            if job_tech_ids:
                matching_techs = set(candidate_tech_ids) & set(job_tech_ids)
                tech_match_percentage = (len(matching_techs) / len(job_tech_ids)) * 60
                match_score += tech_match_percentage
        
        # Calcular percentual final
        if total_factors > 0:
            final_percentage = int((match_score / total_factors) * 100)
        else:
            final_percentage = 50  # Default se não houver fatores
        
        return min(100, max(0, final_percentage))
        
    except Exception as e:
        print(f"Erro ao calcular match: {e}")
        return 50  # Retornar 50% em caso de erro

