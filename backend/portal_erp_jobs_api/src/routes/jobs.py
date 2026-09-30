from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from src.models.job import Job, JobSkill, Skill
from src.models.company import Company, CompanySite, CompanyStatus
from src.models.application import Application, ApplicationStatus
from src.models.job_area import JobArea
from src.config import db
from sqlalchemy import or_, and_
from src.regional_context import get_current_site
from src.regional_access import get_company_access
from src.services.jobs import (
    ACTIVE_JOB_STATUSES,
    apply_job_fields,
    archive_job,
    desired_active,
    json_object,
    optional_int_arg,
    pagination_args,
    service_error,
    set_job_activity,
    set_job_status,
    text_contains,
    validate_job_payload,
    validate_salary_pair,
)

jobs_bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

@jobs_bp.route('/', methods=['GET'])
def get_all_jobs():
    """
    Listar todas as vagas ativas (público)
    Suporta filtros avançados por tecnologia, área e faixa salarial exata
    """
    try:
        site = get_current_site()
        # Parâmetros de busca
        query = request.args.get('q', '')
        location = request.args.get('location', '')
        city = request.args.get('city', '')
        state = request.args.get('state', '')
        employment_type = request.args.get('employment_type', '')
        work_mode = request.args.get('work_mode', '')
        min_salary, min_salary_error = optional_int_arg('min_salary')
        max_salary, max_salary_error = optional_int_arg('max_salary')
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error

        # Novos filtros avançados
        technology = request.args.get('tech', '')  # Filtro por tecnologia específica
        area = request.args.get('area', '')  # Filtro por área de atuação
        level = request.args.get('level', '')  # Filtro por nível de experiência
        company_id, company_id_error = optional_int_arg('company_id', minimum=1)
        salary_exact_min, salary_exact_min_error = optional_int_arg('salary_min_exact')
        salary_exact_max, salary_exact_max_error = optional_int_arg('salary_max_exact')
        numeric_error = next((error for error in (
            min_salary_error,
            max_salary_error,
            company_id_error,
            salary_exact_min_error,
            salary_exact_max_error,
        ) if error), None)
        if numeric_error:
            return numeric_error
        if min_salary is not None and max_salary is not None and min_salary > max_salary:
            return jsonify({'error': 'Faixa salarial inválida'}), 400
        if salary_exact_min is not None and salary_exact_max is not None and salary_exact_min > salary_exact_max:
            return jsonify({'error': 'Faixa salarial exata inválida'}), 400

        # Apenas vagas ativas de empresas aprovadas no site atual.
        jobs_query = (
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
                Job.is_active.is_(True),
                Job.status.in_(ACTIVE_JOB_STATUSES),
                CompanySite.status == CompanyStatus.APPROVED,
            )
        )

        # Busca livre por vaga, empresa ou skill canônica.
        if query:
            jobs_query = jobs_query.filter(
                or_(
                    text_contains(Job.title, query),
                    text_contains(Job.description, query),
                    text_contains(Job.requirements, query),
                    Job.company.has(text_contains(Company.company_name, query)),
                    Job.skills.any(JobSkill.skill.has(text_contains(Skill.name, query))),
                )
            )

        # Filtro por tecnologia específica, priorizando o catálogo canônico.
        if technology:
            jobs_query = jobs_query.filter(
                or_(
                    Job.skills.any(JobSkill.skill.has(text_contains(Skill.name, technology))),
                    text_contains(Job.title, technology),
                    text_contains(Job.description, technology),
                    text_contains(Job.requirements, technology)
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
                        text_contains(Job.area, area),
                        Job.job_area.has(text_contains(JobArea.name, area))
                    )
                )

        # Filtro por nível de experiência
        if level:
            level_aliases = {
                'estágio': ('estágio', 'estagio', 'internship'),
                'estagio': ('estágio', 'estagio', 'internship'),
                'júnior': ('júnior', 'junior'),
                'junior': ('júnior', 'junior'),
                'sênior': ('sênior', 'senior'),
                'senior': ('sênior', 'senior'),
                'líder/gerente': ('líder/gerente', 'lider/gerente', 'tech_lead', 'manager'),
            }
            values = level_aliases.get(level.strip().lower(), (level,))
            jobs_query = jobs_query.filter(or_(*[
                Job.seniority_level.ilike(f'%{value}%') for value in values
            ]))

        # Filtro por empresa
        if company_id is not None:
            jobs_query = jobs_query.filter(Job.company_id == company_id)

        # Filtro de localização
        if city:
            jobs_query = jobs_query.filter(text_contains(Job.city, city))
        if state:
            jobs_query = jobs_query.filter(text_contains(Job.state, state))
        if location:
            jobs_query = jobs_query.filter(
                or_(
                    text_contains(Job.city, location),
                    text_contains(Job.state, location),
                )
            )

        # Filtro de tipo de contratação
        if employment_type:
            jobs_query = jobs_query.filter(Job.contract_type.ilike(employment_type))

        # Filtro de modo de trabalho
        if work_mode:
            modality_aliases = {
                'remoto': ('remoto', 'remote'),
                'remote': ('remoto', 'remote'),
                'híbrido': ('híbrido', 'hibrido', 'hybrid'),
                'hibrido': ('híbrido', 'hibrido', 'hybrid'),
                'hybrid': ('híbrido', 'hibrido', 'hybrid'),
                'presencial': ('presencial', 'onsite'),
                'onsite': ('presencial', 'onsite'),
            }
            values = modality_aliases.get(work_mode.strip().lower(), (work_mode,))
            jobs_query = jobs_query.filter(or_(*[
                Job.work_modality.ilike(f'%{value}%') for value in values
            ]))

        # Filtro de salário (faixa)
        if min_salary is not None:
            jobs_query = jobs_query.filter(Job.min_salary >= min_salary)
        if max_salary is not None:
            jobs_query = jobs_query.filter(Job.max_salary <= max_salary)

        # Filtro de salário exato (para busca precisa)
        if salary_exact_min is not None and salary_exact_max is not None:
            # Busca vagas que tenham salário dentro da faixa especificada
            jobs_query = jobs_query.filter(
                and_(
                    Job.min_salary >= salary_exact_min,
                    Job.max_salary <= salary_exact_max
                )
            )
        elif salary_exact_min is not None:
            jobs_query = jobs_query.filter(Job.min_salary >= salary_exact_min)
        elif salary_exact_max is not None:
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
                'location': location,
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
        site = get_current_site()
        job = (
            Job.query
            .join(
                CompanySite,
                and_(
                    CompanySite.company_id == Job.company_id,
                    CompanySite.site_id == Job.site_id,
                ),
            )
            .filter(
                Job.id == job_id,
                Job.site_id == site.id,
                Job.is_active.is_(True),
                Job.status.in_(ACTIVE_JOB_STATUSES),
                CompanySite.status == CompanyStatus.APPROVED,
            )
            .first()
        )

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
        site = get_current_site()
        company, company_site, _, error, status = get_company_access(
            require_approved=True,
            permission='manage_jobs',
        )
        if error:
            return error, status

        data, payload_error = json_object(request)
        if payload_error:
            return payload_error
        try:
            values = validate_job_payload(data)
            requested_active = desired_active(data, current=True)
        except ValueError as exc:
            return service_error(exc)

        new_job = Job(
            company_id=company.id,
            site_id=site.id,
            title=values.pop('title'),
            description=values.pop('description'),
            salary_currency=site.currency_code,
            country=site.name,
            is_active=False,
            status='inactive',
        )
        db.session.add(new_job)
        try:
            db.session.flush()
            apply_job_fields(new_job, values)
            if 'status' in data:
                set_job_status(new_job, data['status'], company_site=company_site)
            elif requested_active:
                set_job_activity(new_job, True, company_site=company_site)
        except (ValueError, LookupError, OverflowError) as exc:
            db.session.rollback()
            return service_error(exc)

        db.session.commit()

        return jsonify({
            'message': 'Vaga criada com sucesso',
            'job': new_job.to_dict(include_details=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@jwt_required()
def update_job(job_id):
    """
    Atualizar vaga existente (apenas empresa dona da vaga)
    """
    try:
        site = get_current_site()
        company, company_site, _, error, status = get_company_access(
            require_approved=True,
            permission='manage_jobs',
        )
        if error:
            return error, status

        # Buscar vaga
        job = Job.query.filter_by(id=job_id, site_id=site.id).first()
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para editar esta vaga'}), 403

        data, payload_error = json_object(request)
        if payload_error:
            return payload_error
        try:
            values = validate_job_payload(data, partial=True)
            validate_salary_pair(job, values)
            target_active = desired_active(data, current=job.is_active)
            explicit_status = data.get('status')
            apply_job_fields(job, values)
            if explicit_status is not None:
                set_job_status(job, explicit_status, company_site=company_site)
            elif target_active != job.is_active:
                set_job_activity(job, target_active, company_site=company_site)
        except (ValueError, LookupError, OverflowError) as exc:
            db.session.rollback()
            return service_error(exc)

        db.session.commit()

        return jsonify({
            'message': 'Vaga atualizada com sucesso',
            'job': job.to_dict(include_details=True)
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
        site = get_current_site()
        company, _, _, error, status = get_company_access(
            require_approved=True,
            permission='manage_jobs',
        )
        if error:
            return error, status

        # Buscar vaga
        job = Job.query.filter_by(id=job_id, site_id=site.id).first()
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para deletar esta vaga'}), 403

        archive_job(job)
        db.session.commit()

        return jsonify({
            'message': 'Vaga arquivada com sucesso',
            'job': job.to_dict(include_details=True),
        }), 200

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
        site = get_current_site()
        company, company_site, _, error, status_code = get_company_access(
            permission='view_jobs',
        )
        if error:
            return error, status_code

        # Buscar vagas da empresa
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        status = request.args.get('status', '')

        jobs_query = Job.query.filter_by(company_id=company.id, site_id=site.id)

        if status:
            normalized_status = status.strip().lower()
            if normalized_status in ('active', 'true', '1'):
                jobs_query = jobs_query.filter_by(is_active=True)
            elif normalized_status in ('inactive', 'false', '0'):
                jobs_query = jobs_query.filter_by(is_active=False)
            else:
                jobs_query = jobs_query.filter_by(status=normalized_status)

        jobs_query = jobs_query.order_by(Job.created_at.desc())

        pagination = jobs_query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'jobs': [j.to_dict() for j in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'site_status': company_site.status,
            'max_active_jobs': company_site.max_active_jobs
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/my-jobs/<int:job_id>', methods=['GET'])
@jwt_required()
def get_my_company_job(job_id):
    """Obter uma vaga da empresa autenticada, inclusive quando não está pública."""
    try:
        site = get_current_site()
        company, company_site, _, error, status_code = get_company_access(
            permission='view_jobs',
        )
        if error:
            return error, status_code

        job = Job.query.filter_by(
            id=job_id,
            company_id=company.id,
            site_id=site.id,
        ).first()
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        payload = job.to_dict(include_details=True)
        payload['site_status'] = company_site.status
        payload['max_active_jobs'] = company_site.max_active_jobs
        return jsonify(payload), 200
    except Exception:
        return jsonify({'error': 'Não foi possível carregar a vaga'}), 500


@jobs_bp.route('/<int:job_id>/applications', methods=['GET'])
@jwt_required()
def get_job_applications(job_id):
    """
    Listar todas as candidaturas de uma vaga (apenas empresa dona)
    """
    try:
        site = get_current_site()
        company, _, _, error, status_code = get_company_access(
            require_approved=True,
            permission='view_candidates',
        )
        if error:
            return error, status_code

        # Buscar vaga
        job = Job.query.filter_by(id=job_id, site_id=site.id).first()
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para ver as candidaturas desta vaga'}), 403

        # Buscar candidaturas
        page, per_page, pagination_error = pagination_args()
        if pagination_error:
            return pagination_error
        status = request.args.get('status', '')

        applications_query = Application.query.filter_by(job_id=job_id, site_id=site.id)

        if status:
            normalized_status = ApplicationStatus.normalize(status)
            applications_query = applications_query.filter_by(status=normalized_status)

        applications_query = applications_query.order_by(Application.applied_at.desc())

        pagination = applications_query.paginate(page=page, per_page=per_page, error_out=False)

        applications = []
        for application in pagination.items:
            item = application.to_dict()
            candidate = application.candidate
            item.update({
                'candidate_name': f"{candidate.first_name} {candidate.last_name}".strip(),
                'candidate_email': candidate.user.email,
                'candidate_phone': candidate.phone,
                'candidate_city': candidate.city,
                'candidate_title': candidate.current_title,
                'resume_url': candidate.resume_url,
            })
            applications.append(item)

        return jsonify({
            'applications': applications,
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
        site = get_current_site()
        company, company_site, _, error, status_code = get_company_access(
            require_approved=True,
            permission='manage_jobs',
        )
        if error:
            return error, status_code

        # Buscar vaga dentro do site atual
        job = Job.query.filter_by(id=job_id, site_id=site.id).first()
        if not job:
            return jsonify({'error': 'Vaga não encontrada'}), 404

        # Verificar se a vaga pertence à empresa
        if job.company_id != company.id:
            return jsonify({'error': 'Você não tem permissão para alterar esta vaga'}), 403

        try:
            set_job_activity(job, not job.is_active, company_site=company_site)
        except (ValueError, LookupError, OverflowError) as exc:
            return service_error(exc)

        db.session.commit()

        return jsonify({
            'message': f'Vaga {"ativada" if job.is_active else "pausada"} com sucesso',
            'job': job.to_dict(include_details=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
