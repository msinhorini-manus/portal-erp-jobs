from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.candidate import Candidate, CandidateSkill
from src.models.experience import Experience
from src.models.education import Education
from src.models.user import User
from src.config import db

candidates_bp = Blueprint('candidates', __name__, url_prefix='/api/candidates')

@candidates_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_my_profile():
    """
    Obter perfil completo do candidato autenticado
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é candidato
        if claims.get('user_type') != 'candidate':
            return jsonify({'error': 'Acesso negado. Apenas candidatos podem acessar'}), 403
        
        # Buscar candidato
        candidate = Candidate.query.filter_by(user_id=current_user_id).first()
        
        if not candidate:
            return jsonify({'error': 'Perfil de candidato não encontrado'}), 404
        
        return jsonify(candidate.to_dict(include_details=True)), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@candidates_bp.route('/profile', methods=['POST', 'PUT'])
@jwt_required()
def create_or_update_profile():
    """
    Criar ou atualizar perfil do candidato
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é candidato
        if claims.get('user_type') != 'candidate':
            return jsonify({'error': 'Acesso negado. Apenas candidatos podem acessar'}), 403
        
        data = request.get_json()
        
        # Buscar candidato existente
        candidate = Candidate.query.filter_by(user_id=current_user_id).first()
        
        if candidate:
            # Atualizar
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
            if 'current_title' in data:
                candidate.current_title = data['current_title']
            if 'professional_summary' in data:
                candidate.professional_summary = data['professional_summary']
            if 'years_experience' in data:
                candidate.years_experience = data['years_experience']
            if 'expected_salary' in data:
                candidate.expected_salary = data['expected_salary']
            if 'linkedin_url' in data:
                candidate.linkedin_url = data['linkedin_url']
            if 'github_url' in data:
                candidate.github_url = data['github_url']
            if 'portfolio_url' in data:
                candidate.portfolio_url = data['portfolio_url']
            if 'is_actively_looking' in data:
                candidate.is_actively_looking = data['is_actively_looking']
            if 'available_immediately' in data:
                candidate.available_immediately = data['available_immediately']
            
            db.session.commit()
            
            return jsonify({
                'message': 'Perfil atualizado com sucesso',
                'candidate': candidate.to_dict(include_details=True)
            }), 200
        else:
            # Criar novo
            new_candidate = Candidate(
                user_id=current_user_id,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                phone=data.get('phone'),
                city=data.get('city'),
                state=data.get('state'),
                current_title=data.get('current_title'),
                professional_summary=data.get('professional_summary'),
                years_experience=data.get('years_experience'),
                expected_salary=data.get('expected_salary'),
                linkedin_url=data.get('linkedin_url'),
                github_url=data.get('github_url'),
                portfolio_url=data.get('portfolio_url'),
                is_actively_looking=data.get('is_actively_looking', True),
                available_immediately=data.get('available_immediately', True)
            )
            
            db.session.add(new_candidate)
            db.session.commit()
            
            return jsonify({
                'message': 'Perfil criado com sucesso',
                'candidate': new_candidate.to_dict(include_details=True)
            }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@candidates_bp.route('/search', methods=['GET'])
@jwt_required()
def search_candidates():
    """
    Buscar candidatos (apenas empresas)
    """
    try:
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado. Apenas empresas podem buscar candidatos'}), 403
        
        # Parâmetros de busca
        query = request.args.get('q', '')
        city = request.args.get('city', '')
        state = request.args.get('state', '')
        min_salary = request.args.get('min_salary', type=int)
        max_salary = request.args.get('max_salary', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Construir query
        candidates_query = Candidate.query
        
        # Filtro de texto (nome ou título)
        if query:
            candidates_query = candidates_query.filter(
                db.or_(
                    Candidate.first_name.ilike(f'%{query}%'),
                    Candidate.last_name.ilike(f'%{query}%'),
                    Candidate.current_title.ilike(f'%{query}%')
                )
            )
        
        # Filtro de localização
        if city:
            candidates_query = candidates_query.filter(Candidate.city.ilike(f'%{city}%'))
        if state:
            candidates_query = candidates_query.filter(Candidate.state.ilike(f'%{state}%'))
        
        # Filtro de salário
        if min_salary:
            candidates_query = candidates_query.filter(Candidate.expected_salary >= min_salary)
        if max_salary:
            candidates_query = candidates_query.filter(Candidate.expected_salary <= max_salary)
        
        # Apenas candidatos ativos
        candidates_query = candidates_query.filter(Candidate.is_actively_looking == True)
        
        # Paginação
        pagination = candidates_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'candidates': [c.to_dict() for c in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@candidates_bp.route('/<int:candidate_id>', methods=['GET'])
@jwt_required()
def get_candidate_by_id(candidate_id):
    """
    Obter candidato por ID (apenas empresas)
    """
    try:
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado. Apenas empresas podem ver perfis de candidatos'}), 403
        
        candidate = Candidate.query.get(candidate_id)
        
        if not candidate:
            return jsonify({'error': 'Candidato não encontrado'}), 404
        
        return jsonify(candidate.to_dict(include_details=True)), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

