"""
Resume CRUD routes for Portal ERP Jobs
Handles all curriculum/resume operations including:
- Experience, Education, Skills, Certifications, Projects, Languages
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.candidate import Candidate, CandidateSkill
from src.models.experience import Experience
from src.models.education import Education
from src.models.certification import Certification
from src.models.project import Project
from src.models.language import Language
from src.models.job import Skill
from src.config import db
from datetime import datetime

resume_bp = Blueprint('resume', __name__, url_prefix='/api/resume')


# ==================== HELPER FUNCTIONS ====================

def get_authenticated_candidate():
    """Get authenticated candidate or return error response"""
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    
    if claims.get('user_type') != 'candidate':
        return None, jsonify({'error': 'Acesso negado'}), 403
    
    candidate = Candidate.query.filter_by(user_id=current_user_id).first()
    if not candidate:
        return None, jsonify({'error': 'Candidato não encontrado'}), 404
    
    return candidate, None, None


def parse_date(date_string):
    """Parse date string to date object"""
    if not date_string:
        return None
    try:
        return datetime.strptime(date_string, '%Y-%m-%d').date()
    except:
        return None


# ==================== EXPERIENCE CRUD ====================

@resume_bp.route('/experiences', methods=['GET'])
@jwt_required()
def get_experiences():
    """Get all experiences for authenticated candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        experiences = Experience.query.filter_by(candidate_id=candidate.id).order_by(Experience.start_date.desc()).all()
        
        return jsonify({
            'experiences': [exp.to_dict() for exp in experiences]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/experiences', methods=['POST'])
@jwt_required()
def create_experience():
    """Create new experience"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        new_experience = Experience(
            candidate_id=candidate.id,
            job_title=data.get('job_title'),
            company_name=data.get('company_name'),
            city=data.get('city'),
            state=data.get('state'),
            country=data.get('country'),
            start_date=parse_date(data.get('start_date')),
            end_date=parse_date(data.get('end_date')),
            is_current_job=data.get('is_current_job', False),
            description=data.get('description')
        )
        
        db.session.add(new_experience)
        db.session.commit()
        
        return jsonify({
            'message': 'Experiência criada com sucesso',
            'experience': new_experience.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/experiences/<int:experience_id>', methods=['PUT'])
@jwt_required()
def update_experience(experience_id):
    """Update experience"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        experience = Experience.query.filter_by(id=experience_id, candidate_id=candidate.id).first()
        if not experience:
            return jsonify({'error': 'Experiência não encontrada'}), 404
        
        data = request.get_json()
        
        if 'job_title' in data:
            experience.job_title = data['job_title']
        if 'company_name' in data:
            experience.company_name = data['company_name']
        if 'city' in data:
            experience.city = data['city']
        if 'state' in data:
            experience.state = data['state']
        if 'country' in data:
            experience.country = data['country']
        if 'start_date' in data:
            experience.start_date = parse_date(data['start_date'])
        if 'end_date' in data:
            experience.end_date = parse_date(data['end_date'])
        if 'is_current_job' in data:
            experience.is_current_job = data['is_current_job']
        if 'description' in data:
            experience.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Experiência atualizada com sucesso',
            'experience': experience.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/experiences/<int:experience_id>', methods=['DELETE'])
@jwt_required()
def delete_experience(experience_id):
    """Delete experience"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        experience = Experience.query.filter_by(id=experience_id, candidate_id=candidate.id).first()
        if not experience:
            return jsonify({'error': 'Experiência não encontrada'}), 404
        
        db.session.delete(experience)
        db.session.commit()
        
        return jsonify({'message': 'Experiência excluída com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== EDUCATION CRUD ====================

@resume_bp.route('/educations', methods=['GET'])
@jwt_required()
def get_educations():
    """Get all educations for authenticated candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        educations = Education.query.filter_by(candidate_id=candidate.id).order_by(Education.start_date.desc()).all()
        
        return jsonify({
            'educations': [edu.to_dict() for edu in educations]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/educations', methods=['POST'])
@jwt_required()
def create_education():
    """Create new education"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        new_education = Education(
            candidate_id=candidate.id,
            degree_name=data.get('degree') or data.get('degree_name'),
            major=data.get('field_of_study') or data.get('major'),
            institution_name=data.get('institution') or data.get('institution_name'),
            start_date=parse_date(data.get('start_date')),
            completion_date=parse_date(data.get('end_date') or data.get('completion_date')),
            grade=data.get('grade')
        )
        
        db.session.add(new_education)
        db.session.commit()
        
        return jsonify({
            'message': 'Formação criada com sucesso',
            'education': new_education.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/educations/<int:education_id>', methods=['PUT'])
@jwt_required()
def update_education(education_id):
    """Update education"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        education = Education.query.filter_by(id=education_id, candidate_id=candidate.id).first()
        if not education:
            return jsonify({'error': 'Formação não encontrada'}), 404
        
        data = request.get_json()
        
        if 'degree' in data:
            education.degree = data['degree']
        if 'field_of_study' in data:
            education.field_of_study = data['field_of_study']
        if 'institution' in data:
            education.institution = data['institution']
        if 'location' in data:
            education.location = data['location']
        if 'start_date' in data:
            education.start_date = parse_date(data['start_date'])
        if 'end_date' in data:
            education.end_date = parse_date(data['end_date'])
        if 'is_current' in data:
            education.is_current = data['is_current']
        if 'description' in data:
            education.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Formação atualizada com sucesso',
            'education': education.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/educations/<int:education_id>', methods=['DELETE'])
@jwt_required()
def delete_education(education_id):
    """Delete education"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        education = Education.query.filter_by(id=education_id, candidate_id=candidate.id).first()
        if not education:
            return jsonify({'error': 'Formação não encontrada'}), 404
        
        db.session.delete(education)
        db.session.commit()
        
        return jsonify({'message': 'Formação excluída com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== SKILLS CRUD ====================

@resume_bp.route('/skills', methods=['GET'])
@jwt_required()
def get_skills():
    """Get all skills for authenticated candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        skills = CandidateSkill.query.filter_by(candidate_id=candidate.id).all()
        
        return jsonify({
            'skills': [skill.to_dict() for skill in skills]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/skills', methods=['POST'])
@jwt_required()
def create_skill():
    """Add skill to candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        # Get or create skill in catalog
        skill_name = data.get('name')
        skill = Skill.query.filter_by(name=skill_name).first()
        if not skill:
            skill = Skill(name=skill_name, category=data.get('category', 'other'))
            db.session.add(skill)
            db.session.flush()
        
        new_skill = CandidateSkill(
            candidate_id=candidate.id,
            skill_id=skill.id,
            proficiency_level=data.get('proficiency_level', 3)
        )
        
        db.session.add(new_skill)
        db.session.commit()
        
        return jsonify({
            'message': 'Habilidade adicionada com sucesso',
            'skill': new_skill.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/skills/<int:skill_id>', methods=['PUT'])
@jwt_required()
def update_skill(skill_id):
    """Update skill"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        skill = CandidateSkill.query.filter_by(id=skill_id, candidate_id=candidate.id).first()
        if not skill:
            return jsonify({'error': 'Habilidade não encontrada'}), 404
        
        data = request.get_json()
        
        if 'proficiency_level' in data:
            skill.proficiency_level = data['proficiency_level']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Habilidade atualizada com sucesso',
            'skill': skill.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/skills/<int:skill_id>', methods=['DELETE'])
@jwt_required()
def delete_skill(skill_id):
    """Remove skill from candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        skill = CandidateSkill.query.filter_by(id=skill_id, candidate_id=candidate.id).first()
        if not skill:
            return jsonify({'error': 'Habilidade não encontrada'}), 404
        
        db.session.delete(skill)
        db.session.commit()
        
        return jsonify({'message': 'Habilidade removida com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== CERTIFICATIONS CRUD ====================

@resume_bp.route('/certifications', methods=['GET'])
@jwt_required()
def get_certifications():
    """Get all certifications for authenticated candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        certifications = Certification.query.filter_by(candidate_id=candidate.id).order_by(Certification.issue_date.desc()).all()
        
        return jsonify({
            'certifications': [cert.to_dict() for cert in certifications]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/certifications', methods=['POST'])
@jwt_required()
def create_certification():
    """Create new certification"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        new_certification = Certification(
            candidate_id=candidate.id,
            name=data.get('name'),
            issuing_organization=data.get('issuing_organization'),
            issue_date=parse_date(data.get('issue_date')),
            expiration_date=parse_date(data.get('expiration_date')),
            credential_id=data.get('credential_id'),
            credential_url=data.get('credential_url'),
            description=data.get('description')
        )
        
        db.session.add(new_certification)
        db.session.commit()
        
        return jsonify({
            'message': 'Certificação criada com sucesso',
            'certification': new_certification.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/certifications/<int:certification_id>', methods=['PUT'])
@jwt_required()
def update_certification(certification_id):
    """Update certification"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        certification = Certification.query.filter_by(id=certification_id, candidate_id=candidate.id).first()
        if not certification:
            return jsonify({'error': 'Certificação não encontrada'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            certification.name = data['name']
        if 'issuing_organization' in data:
            certification.issuing_organization = data['issuing_organization']
        if 'issue_date' in data:
            certification.issue_date = parse_date(data['issue_date'])
        if 'expiration_date' in data:
            certification.expiration_date = parse_date(data['expiration_date'])
        if 'credential_id' in data:
            certification.credential_id = data['credential_id']
        if 'credential_url' in data:
            certification.credential_url = data['credential_url']
        if 'description' in data:
            certification.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Certificação atualizada com sucesso',
            'certification': certification.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/certifications/<int:certification_id>', methods=['DELETE'])
@jwt_required()
def delete_certification(certification_id):
    """Delete certification"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        certification = Certification.query.filter_by(id=certification_id, candidate_id=candidate.id).first()
        if not certification:
            return jsonify({'error': 'Certificação não encontrada'}), 404
        
        db.session.delete(certification)
        db.session.commit()
        
        return jsonify({'message': 'Certificação excluída com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== PROJECTS CRUD ====================

@resume_bp.route('/projects', methods=['GET'])
@jwt_required()
def get_projects():
    """Get all projects for authenticated candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        projects = Project.query.filter_by(candidate_id=candidate.id).order_by(Project.start_date.desc()).all()
        
        return jsonify({
            'projects': [proj.to_dict() for proj in projects]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/projects', methods=['POST'])
@jwt_required()
def create_project():
    """Create new project"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        new_project = Project(
            candidate_id=candidate.id,
            name=data.get('name'),
            description=data.get('description'),
            role=data.get('role'),
            technologies=data.get('technologies'),
            start_date=parse_date(data.get('start_date')),
            end_date=parse_date(data.get('end_date')),
            is_current=data.get('is_current', False),
            project_url=data.get('project_url'),
            repository_url=data.get('repository_url')
        )
        
        db.session.add(new_project)
        db.session.commit()
        
        return jsonify({
            'message': 'Projeto criado com sucesso',
            'project': new_project.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Update project"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        project = Project.query.filter_by(id=project_id, candidate_id=candidate.id).first()
        if not project:
            return jsonify({'error': 'Projeto não encontrado'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        if 'role' in data:
            project.role = data['role']
        if 'technologies' in data:
            project.technologies = data['technologies']
        if 'start_date' in data:
            project.start_date = parse_date(data['start_date'])
        if 'end_date' in data:
            project.end_date = parse_date(data['end_date'])
        if 'is_current' in data:
            project.is_current = data['is_current']
        if 'project_url' in data:
            project.project_url = data['project_url']
        if 'repository_url' in data:
            project.repository_url = data['repository_url']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Projeto atualizado com sucesso',
            'project': project.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete project"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        project = Project.query.filter_by(id=project_id, candidate_id=candidate.id).first()
        if not project:
            return jsonify({'error': 'Projeto não encontrado'}), 404
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({'message': 'Projeto excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== LANGUAGES CRUD ====================

@resume_bp.route('/languages', methods=['GET'])
@jwt_required()
def get_languages():
    """Get all languages for authenticated candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        languages = Language.query.filter_by(candidate_id=candidate.id).all()
        
        return jsonify({
            'languages': [lang.to_dict() for lang in languages]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/languages', methods=['POST'])
@jwt_required()
def create_language():
    """Add language to candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        new_language = Language(
            candidate_id=candidate.id,
            name=data.get('language') or data.get('name'),
            proficiency=data.get('proficiency_level') or data.get('proficiency'),
            can_read=data.get('can_read', True),
            can_write=data.get('can_write', True),
            can_speak=data.get('can_speak', True),
            can_listen=data.get('can_listen', True)
        )
        
        db.session.add(new_language)
        db.session.commit()
        
        return jsonify({
            'message': 'Idioma adicionado com sucesso',
            'language': new_language.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/languages/<int:language_id>', methods=['PUT'])
@jwt_required()
def update_language(language_id):
    """Update language"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        language = Language.query.filter_by(id=language_id, candidate_id=candidate.id).first()
        if not language:
            return jsonify({'error': 'Idioma não encontrado'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            language.name = data['name']
        if 'proficiency' in data:
            language.proficiency = data['proficiency']
        if 'can_read' in data:
            language.can_read = data['can_read']
        if 'can_write' in data:
            language.can_write = data['can_write']
        if 'can_speak' in data:
            language.can_speak = data['can_speak']
        if 'can_listen' in data:
            language.can_listen = data['can_listen']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Idioma atualizado com sucesso',
            'language': language.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/languages/<int:language_id>', methods=['DELETE'])
@jwt_required()
def delete_language(language_id):
    """Remove language from candidate"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        language = Language.query.filter_by(id=language_id, candidate_id=candidate.id).first()
        if not language:
            return jsonify({'error': 'Idioma não encontrado'}), 404
        
        db.session.delete(language)
        db.session.commit()
        
        return jsonify({'message': 'Idioma removido com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== COMPLETE RESUME ====================

@resume_bp.route('/complete', methods=['GET'])
@jwt_required()
def get_complete_resume():
    """Get complete resume with all sections"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        # Get all resume sections
        experiences = Experience.query.filter_by(candidate_id=candidate.id).order_by(Experience.start_date.desc()).all()
        educations = Education.query.filter_by(candidate_id=candidate.id).order_by(Education.start_date.desc()).all()
        skills = CandidateSkill.query.filter_by(candidate_id=candidate.id).all()
        certifications = Certification.query.filter_by(candidate_id=candidate.id).order_by(Certification.issue_date.desc()).all()
        projects = Project.query.filter_by(candidate_id=candidate.id).order_by(Project.start_date.desc()).all()
        languages = Language.query.filter_by(candidate_id=candidate.id).all()
        
        return jsonify({
            'candidate': candidate.to_dict(),
            'experiences': [exp.to_dict() for exp in experiences],
            'educations': [edu.to_dict() for edu in educations],
            'skills': [skill.to_dict() for skill in skills],
            'certifications': [cert.to_dict() for cert in certifications],
            'projects': [proj.to_dict() for proj in projects],
            'languages': [lang.to_dict() for lang in languages]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@resume_bp.route('/complete', methods=['PUT'])
@jwt_required()
def update_complete_resume():
    """Update candidate personal data and summary"""
    try:
        candidate, error_response, status_code = get_authenticated_candidate()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        
        # Update personal data
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
        
        # Update professional summary
        if 'professional_summary' in data:
            candidate.professional_summary = data['professional_summary']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Dados pessoais atualizados com sucesso',
            'candidate': candidate.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

