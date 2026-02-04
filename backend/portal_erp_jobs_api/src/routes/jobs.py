from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.job import Job, JobSkill, Skill
from src.models.company import Company
from src.models.application import Application
from src.models.job_area import JobArea
from src.config import db
from sqlalchemy import or_, and_
from datetime import datetime

jobs_bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

@jobs_bp.route('/', methods=['GET'])
def get_all_jobs():
    """
    Listar todas as vagas ativas (público)
    Suporta filtros avançados por tecnologia, área e faixa salarial exata
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
        
        # Novos filtros avançados
        technology = request.args.get('tech', '')  # Filtro por tecnologia específica
        area = request.args.get('area', '')  # Filtro por área de atuação
        level = request.args.get('level', '')  # Filtro por nível de experiência
        company_id = request.args.get('company_id', type=int)  # Filtro por empresa
        salary_exact_min = request.args.get('salary_min_exact', type=int)  # Salário mínimo exato
        salary_exact_max = request.args.get('salary_max_exact', type=int)  # Salário máximo exato
        
        # Construir query - apenas vagas ativas
        jobs_query = Job.query.filter_by(is_active=True)
        
        # Filtro de texto (título ou descrição)
        if query:
            jobs_query = jobs_query.filter(
                or_(
                    Job.title.ilike(f'%{query}%'),
                    Job.description.ilike(f'%{query}%'),
                    Job.requirements.ilike(f'%{query}%')
                )
            )
        
        # Filtro por tecnologia específica (busca no título, descrição e requisitos)
        if technology:
            jobs_query = jobs_query.filter(
                or_(
                    Job.title.ilike(f'%{technology}%'),
                    Job.description.ilike(f'%{technology}%'),
                    Job.requirements.ilike(f'%{technology}%')
                )
            )
        
        # Filtro por área de atuação (suporta area_id ou texto)
        if area:
            # Tentar converter para int (area_id)
            try:
                area_id = int(area)
                jobs_query = jobs_query.filter(Job.area_id == area_id)
            except ValueError:
                # Se não for int, buscar por texto (compatibilidade)
                jobs_query = jobs_query.filter(
                    or_(
                        Job.area.ilike(f'%{area}%'),
                        Job.job_area.has(JobArea.name.ilike(f'%{area}%'))
                    )
                )
        
        # Filtro por nível de experiência
        if level:
            jobs_query = jobs_query.filter(Job.seniority_level.ilike(f'%{level}%'))
        
        # Filtro por empresa
        if company_id:
            jobs_query = jobs_query.filter(Job.company_id == company_id)
        
        # Filtro de localização
        if city:
            jobs_query = jobs_query.filter(Job.city.ilike(f'%{city}%'))
        if state:
            jobs_query = jobs_query.filter(Job.state.ilike(f'%{state}%'))
        
        # Filtro de tipo de contratação
        if employment_type:
            jobs_query = jobs_query.filter(Job.contract_type == employment_type)
        
        # Filtro de modo de trabalho
        if work_mode:
            jobs_query = jobs_query.filter(Job.work_modality.ilike(f'%{work_mode}%'))
        
        # Filtro de salário (faixa)
        if min_salary:
            jobs_query = jobs_query.filter(Job.min_salary >= min_salary)
        if max_salary:
            jobs_query = jobs_query.filter(Job.max_salary <= max_salary)
        
        # Filtro de salário exato (para busca precisa)
        if salary_exact_min and salary_exact_max:
            # Busca vagas que tenham salário dentro da faixa especificada
            jobs_query = jobs_query.filter(
                and_(
                    Job.min_salary >= salary_exact_min,
                    Job.max_salary <= salary_exact_max
                )
            )
        elif salary_exact_min:
            jobs_query = jobs_query.filter(Job.min_salary >= salary_exact_min)
        elif salary_exact_max:
            jobs_query = jobs_query.filter(Job.max_salary <= salary_exact_max)
        
        # Ordenar por data de criação (mais recentes primeiro)
        jobs_query = jobs_query.order_by(Job.created_at.desc())
        
        # Paginação
        pagination = jobs_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'jobs': [j.to_dict() for j in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'filters_applied': {
                'query': query,
                'technology': technology,
                'area': area,
                'level': level,
                'city': city,
                'state': state,
                'work_mode': work_mode,
                'min_salary': min_salary or salary_exact_min,
                'max_salary': max_salary or salary_exact_max
            }
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
        
        return jsonify(job.to_dict(include_details=True)), 200
        
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
        # Aceitar tanto work_mode quanto work_modality (compatibilidade frontend)
        work_modality = data.get('work_modality') or data.get('work_mode', 'hybrid')
        # Aceitar tanto salary_min/max quanto min_salary/max_salary
        min_salary = data.get('min_salary') or data.get('salary_min')
        max_salary = data.get('max_salary') or data.get('salary_max')
        # Aceitar tanto level quanto seniority_level
        seniority_level = data.get('seniority_level') or data.get('level')
        
        # Processar area_id
        area_id = data.get('area_id')
        area_text = data.get('area')
        
        # Se area_id for fornecido, validar
        if area_id:
            job_area = JobArea.query.get(area_id)
            if not job_area:
                return jsonify({'error': f'Área com ID {area_id} não encontrada'}), 400
        
        new_job = Job(
            company_id=company.id,
            title=data.get('title'),
            description=data.get('description'),
            requirements=data.get('requirements'),
            responsibilities=data.get('responsibilities'),
            area_id=area_id,
            area=area_text,  # Mantido para compatibilidade
            seniority_level=seniority_level,
            work_modality=work_modality,
            contract_type=data.get('contract_type', 'clt'),
            min_salary=min_salary,
            max_salary=max_salary,
            city=data.get('city'),
            state=data.get('state'),
            country=data.get('country', 'Brasil'),
            is_active=True
        )
        
        print(f"[DEBUG] Creating job with data: title={data.get('title')}, work_mode={data.get('work_mode')}, contract_type={data.get('contract_type')}, area_id={area_id}")
        db.session.add(new_job)
        db.session.flush()  # Para obter o ID da vaga
        
        # Processar skills/technologies
        skills_data = data.get('skills', []) or data.get('technologies', [])
        if skills_data:
            for skill_item in skills_data:
                # skill_item pode ser um ID ou um objeto com skill_id
                skill_id = skill_item if isinstance(skill_item, int) else skill_item.get('skill_id') or skill_item.get('id')
                if skill_id:
                    # Verificar se skill existe
                    skill = Skill.query.get(skill_id)
                    if skill:
                        job_skill = JobSkill(
                            job_id=new_job.id,
                            skill_id=skill_id,
                            is_required=skill_item.get('is_required', False) if isinstance(skill_item, dict) else False
                        )
                        db.session.add(job_skill)
        
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
        
        # Atualizar campos básicos
        if 'title' in data:
            job.title = data['title']
        if 'description' in data:
            job.description = data['description']
        if 'requirements' in data:
            job.requirements = data['requirements']
        if 'benefits' in data:
            job.benefits = data['benefits']
        if 'area_id' in data:
            area_id = data['area_id']
            if area_id:
                job_area = JobArea.query.get(area_id)
                if not job_area:
                    return jsonify({'error': f'Área com ID {area_id} não encontrada'}), 400
            job.area_id = area_id
        if 'area' in data:
            job.area = data['area']
        
        # Campos com compatibilidade de nomes
        if 'level' in data:
            job.seniority_level = data['level']
        if 'seniority_level' in data:
            job.seniority_level = data['seniority_level']
        
        if 'work_mode' in data:
            job.work_modality = data['work_mode']
        if 'work_modality' in data:
            job.work_modality = data['work_modality']
        
        if 'contract_type' in data:
            job.contract_type = data['contract_type']
        
        # Localização
        if 'city' in data:
            job.city = data['city']
        if 'state' in data:
            job.state = data['state']
        if 'country' in data:
            job.country = data['country']
        
        # Salário com compatibilidade de nomes
        if 'salary_min' in data:
            job.min_salary = data['salary_min']
        if 'min_salary' in data:
            job.min_salary = data['min_salary']
        if 'salary_max' in data:
            job.max_salary = data['salary_max']
        if 'max_salary' in data:
            job.max_salary = data['max_salary']
        
        # Status
        if 'is_active' in data:
            job.is_active = data['is_active']
        if 'status' in data:
            # Compatibilidade: converter status string para is_active boolean
            job.is_active = data['status'] in ['active', 'Active', True]
        
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
            # Converter status string para is_active boolean
            is_active = status in ['active', 'Active', True, 'true', '1']
            jobs_query = jobs_query.filter_by(is_active=is_active)
        
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



@jobs_bp.route('/<int:job_id>/toggle-status', methods=['PATCH'])
@jwt_required()
def toggle_job_status(job_id):
    """
    Alternar status da vaga (ativar/pausar)
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=int(current_user_id)).first()
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        # Buscar vaga
        job = Job.query.get(job_id)
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404
        
        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para alterar esta vaga'}), 403
        
        # Alternar status
        job.is_active = not job.is_active
        job.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': f'Vaga {"ativada" if job.is_active else "pausada"} com sucesso',
            'job': job.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


