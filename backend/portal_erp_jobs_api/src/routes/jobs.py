from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.job import Job
from src.models.company import Company
from src.models.application import Application
from src.config import db
from sqlalchemy import or_, and_
from datetime import datetime

jobs_bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

@jobs_bp.route('/', methods=['GET'])
def get_all_jobs():
    """
    Listar todas as vagas ativas (público)
    """
    try:
        # Parâmetros de busca
        query = request.args.get('q', '')
        city = request.args.get('city', '')
        state = request.args.get('state', '')
        employment_type = request.args.get('employment_type', '')
        work_mode = request.args.get('work_mode', '')
        min_salary = request.args.get('min_salary', type=int)
        max_salary = request.args.get('max_salary', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Construir query - apenas vagas ativas
        jobs_query = Job.query.filter_by(status='active')
        
        # Filtro de texto (título ou descrição)
        if query:
            jobs_query = jobs_query.filter(
                or_(
                    Job.title.ilike(f'%{query}%'),
                    Job.description.ilike(f'%{query}%'),
                    Job.requirements.ilike(f'%{query}%')
                )
            )
        
        # Filtro de localização
        if city:
            jobs_query = jobs_query.filter(Job.city.ilike(f'%{city}%'))
        if state:
            jobs_query = jobs_query.filter(Job.state.ilike(f'%{state}%'))
        
        # Filtro de tipo de contratação
        if employment_type:
            jobs_query = jobs_query.filter(Job.employment_type == employment_type)
        
        # Filtro de modo de trabalho
        if work_mode:
            jobs_query = jobs_query.filter(Job.work_mode == work_mode)
        
        # Filtro de salário
        if min_salary:
            jobs_query = jobs_query.filter(Job.salary_min >= min_salary)
        if max_salary:
            jobs_query = jobs_query.filter(Job.salary_max <= max_salary)
        
        # Ordenar por data de criação (mais recentes primeiro)
        jobs_query = jobs_query.order_by(Job.created_at.desc())
        
        # Paginação
        pagination = jobs_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'jobs': [j.to_dict() for j in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/<int:job_id>', methods=['GET'])
def get_job_by_id(job_id):
    """
    Obter detalhes de uma vaga específica
    """
    try:
        job = Job.query.get(job_id)
        
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404
        
        return jsonify(job.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/', methods=['POST'])
@jwt_required()
def create_job():
    """
    Criar nova vaga (apenas empresas)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado. Apenas empresas podem criar vagas'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado. Crie um perfil primeiro'}), 404
        
        data = request.get_json()
        print(f"[DEBUG] Received data for job creation: {data}")
        
        # Validar dados obrigatórios
        if not data.get('title') or not data.get('description'):
            print("[ERROR] Missing title or description")
            return jsonify({'error': 'Título e descrição são obrigatórios'}), 400
        
        # Criar nova vaga
        new_job = Job(
            company_id=company.id,
            title=data.get('title'),
            description=data.get('description'),
            requirements=data.get('requirements'),
            responsibilities=data.get('responsibilities'),
            seniority_level=data.get('seniority_level'),
            work_modality=data.get('work_mode', 'hybrid'),
            contract_type=data.get('contract_type', 'clt'),
            min_salary=data.get('salary_min'),
            max_salary=data.get('salary_max'),
            city=data.get('city'),
            state=data.get('state'),
            country=data.get('country', 'Brasil'),
            is_active=True
        )
        
        print(f"[DEBUG] Creating job with data: title={data.get('title')}, work_mode={data.get('work_mode')}, contract_type={data.get('contract_type')}")
        db.session.add(new_job)
        db.session.commit()
        print("[DEBUG] Job created successfully!")
        
        return jsonify({
            'message': 'Vaga criada com sucesso',
            'job': new_job.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Failed to create job: {str(e)}")
        print(f"[ERROR] Exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@jwt_required()
def update_job(job_id):
    """
    Atualizar vaga existente (apenas empresa dona da vaga)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        # Buscar vaga
        job = Job.query.get(job_id)
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404
        
        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para editar esta vaga'}), 403
        
        data = request.get_json()
        
        # Atualizar campos
        if 'title' in data:
            job.title = data['title']
        if 'description' in data:
            job.description = data['description']
        if 'requirements' in data:
            job.requirements = data['requirements']
        if 'benefits' in data:
            job.benefits = data['benefits']
        if 'employment_type' in data:
            job.employment_type = data['employment_type']
        if 'work_mode' in data:
            job.work_mode = data['work_mode']
        if 'city' in data:
            job.city = data['city']
        if 'state' in data:
            job.state = data['state']
        if 'salary_min' in data:
            job.salary_min = data['salary_min']
        if 'salary_max' in data:
            job.salary_max = data['salary_max']
        if 'status' in data:
            job.status = data['status']
        
        job.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Vaga atualizada com sucesso',
            'job': job.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    """
    Deletar vaga (apenas empresa dona da vaga)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        # Buscar vaga
        job = Job.query.get(job_id)
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404
        
        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para deletar esta vaga'}), 403
        
        db.session.delete(job)
        db.session.commit()
        
        return jsonify({'message': 'Vaga deletada com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/my-jobs', methods=['GET'])
@jwt_required()
def get_my_company_jobs():
    """
    Listar todas as vagas da empresa autenticada
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        # Buscar vagas da empresa
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        jobs_query = Job.query.filter_by(company_id=company.id)
        
        if status:
            jobs_query = jobs_query.filter_by(status=status)
        
        jobs_query = jobs_query.order_by(Job.created_at.desc())
        
        pagination = jobs_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'jobs': [j.to_dict() for j in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/<int:job_id>/applications', methods=['GET'])
@jwt_required()
def get_job_applications(job_id):
    """
    Listar todas as candidaturas de uma vaga (apenas empresa dona)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        # Buscar vaga
        job = Job.query.get(job_id)
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404
        
        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para ver as candidaturas desta vaga'}), 403
        
        # Buscar candidaturas
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status', '')
        
        applications_query = Application.query.filter_by(job_id=job_id)
        
        if status:
            applications_query = applications_query.filter_by(status=status)
        
        applications_query = applications_query.order_by(Application.match_percentage.desc(), Application.applied_at.desc())
        
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

