from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from src.models.user import User
from src.models.company import Company
from src.models.candidate import Candidate
from src.config import db
from datetime import timedelta, datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ============================================
# COMPANY REGISTRATION & LOGIN
# ============================================

@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    """
    Registrar nova empresa
    """
    try:
        data = request.get_json()
        
        # Validar dados obrigatórios
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Verificar se email já existe
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email já cadastrado'}), 409
        
        # Criar usuário
        new_user = User(
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='company'
        )
        
        db.session.add(new_user)
        db.session.flush()  # Get user ID
        
        # Criar empresa (usando os nomes corretos dos campos do modelo)
        new_company = Company(
            user_id=new_user.id,
            company_name=data.get('trade_name') or data.get('legal_name', 'Empresa'),
            cnpj=data.get('tax_id', ''),
            website=data.get('website', ''),
            sector=data.get('sector', ''),
            company_size=data.get('company_size', ''),
            description=data.get('description', ''),
            country=data.get('country', 'Brasil'),
            state=data.get('state', ''),
            city=data.get('city', ''),
            street_address=data.get('address', ''),
            phone=data.get('phone', '')
        )
        
        db.session.add(new_company)
        db.session.commit()
        
        # Gerar tokens (identity deve ser string)
        access_token = create_access_token(
            identity=str(new_user.id),
            additional_claims={'user_type': 'company', 'company_id': new_company.id},
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=str(new_user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'Empresa registrada com sucesso',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'user_type': 'company',
                'company_id': new_company.id,
                'company_name': new_company.company_name
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error registering company: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login/company', methods=['POST'])
def login_company():
    """
    Login de empresa
    """
    try:
        data = request.get_json()
        
        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Buscar usuário
        user = User.query.filter_by(email=data['email'], user_type='company').first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Email ou senha inválidos'}), 401
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=user.id).first()
        
        if not company:
            return jsonify({'error': 'Empresa não encontrada'}), 404
        
        # Gerar tokens (identity deve ser string)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'user_type': 'company', 'company_id': company.id},
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': 'company',
                'company_id': company.id,
                'company_name': company.company_name
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        print(f"Error logging in company: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# CANDIDATE REGISTRATION & LOGIN
# ============================================

@auth_bp.route('/register/candidate', methods=['POST'])
def register_candidate():
    """
    Registrar novo candidato
    """
    try:
        data = request.get_json()
        
        # Validar dados obrigatórios
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Verificar se email já existe
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email já cadastrado'}), 409
        
        # Criar usuário
        new_user = User(
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            user_type='candidate'
        )
        
        db.session.add(new_user)
        db.session.flush()  # Get user ID
        
        # Criar candidato
        # Separar nome completo em first_name e last_name
        full_name = data.get('name', data.get('full_name', '')).strip()
        name_parts = full_name.split(' ', 1) if full_name else []
        
        # Garantir que first_name e last_name nunca sejam vazios (nullable=False no modelo)
        first_name = name_parts[0].strip() if name_parts and name_parts[0].strip() else 'Nome'
        last_name = name_parts[1].strip() if len(name_parts) > 1 and name_parts[1].strip() else 'Pendente'
        
        new_candidate = Candidate(
            user_id=new_user.id,
            first_name=first_name,
            last_name=last_name,
            phone=data.get('phone', ''),
            city=data.get('city', ''),
            state=data.get('state', ''),
            country=data.get('country', 'Brasil'),
            current_title=data.get('current_position', ''),
            professional_summary=data.get('professional_summary', ''),
            years_experience=data.get('years_of_experience', 0),
            expected_salary=data.get('desired_salary'),
            linkedin_url=data.get('linkedin_url', ''),
            github_url=data.get('github_url', ''),
            portfolio_url=data.get('portfolio_url', '')
        )
        
        db.session.add(new_candidate)
        db.session.commit()
        
        # Gerar tokens (identity deve ser string)
        access_token = create_access_token(
            identity=str(new_user.id),
            additional_claims={'user_type': 'candidate', 'candidate_id': new_candidate.id},
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=str(new_user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'Candidato registrado com sucesso',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'user_type': 'candidate',
                'candidate_id': new_candidate.id,
                'name': f"{new_candidate.first_name} {new_candidate.last_name}"
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error registering candidate: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login/candidate', methods=['POST'])
def login_candidate():
    """
    Login de candidato
    """
    try:
        data = request.get_json()
        
        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Buscar usuário
        user = User.query.filter_by(email=data['email'], user_type='candidate').first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Email ou senha inválidos'}), 401
        
        # Buscar candidato
        candidate = Candidate.query.filter_by(user_id=user.id).first()
        
        if not candidate:
            return jsonify({'error': 'Candidato não encontrado'}), 404
        
        # Gerar tokens
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'user_type': 'candidate', 'candidate_id': candidate.id},
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': 'candidate',
                'candidate_id': candidate.id,
                'full_name': f"{candidate.first_name} {candidate.last_name}"
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        print(f"Error logging in candidate: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# GENERIC ENDPOINTS
# ============================================

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Renovar access token usando refresh token
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Gerar novo access token (identity deve ser string)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'user_type': user.user_type},
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Obter dados do usuário autenticado
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        return jsonify({
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'created_at': user.created_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """
    Alterar senha do usuário autenticado
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validar dados
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Senha atual e nova senha são obrigatórias'}), 400
        
        # Buscar usuário
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Verificar senha atual
        if not check_password_hash(user.password_hash, data['current_password']):
            return jsonify({'error': 'Senha atual incorreta'}), 401
        
        # Atualizar senha
        user.password_hash = generate_password_hash(data['new_password'])
        db.session.commit()
        
        return jsonify({'message': 'Senha alterada com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# ============================================
# ADMIN LOGIN
# ============================================

@auth_bp.route('/login/admin', methods=['POST'])
def login_admin():
    """
    Login de administrador
    """
    try:
        data = request.get_json()
        
        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Buscar usuário
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            return jsonify({'error': 'Email ou senha inválidos'}), 401
        
        # Verificar se é admin
        if user.user_type != 'admin':
            return jsonify({'error': 'Acesso negado. Apenas administradores podem acessar este painel.'}), 403
        
        # Verificar senha
        if not check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Email ou senha inválidos'}), 401
        
        # Buscar perfil admin
        from src.models.admin import Admin
        admin = Admin.query.filter_by(user_id=user.id).first()
        
        if not admin:
            return jsonify({'error': 'Perfil de administrador não encontrado'}), 404
        
        # Gerar tokens
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'user_type': 'admin', 'admin_id': admin.id},
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'user_id': user.id,
            'email': user.email,
            'name': admin.name,
            'user_type': 'admin',
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        print(f"Error in admin login: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# GENERIC LOGIN (for backward compatibility)
# ============================================

@auth_bp.route('/login', methods=['POST'])
def login_generic():
    """
    Login genérico - detecta tipo de usuário e faz login apropriado
    """
    try:
        data = request.get_json()
        
        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Buscar usuário
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            return jsonify({'error': 'Email ou senha inválidos'}), 401
        
        # Verificar senha
        if not check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Email ou senha inválidos'}), 401
        
        # Se user_type foi especificado, validar
        requested_type = data.get('user_type')
        if requested_type and user.user_type != requested_type:
            return jsonify({'error': f'Este usuário não é do tipo {requested_type}'}), 403
        
        # Preparar resposta baseada no tipo de usuário
        response_data = {
            'user_id': user.id,
            'email': user.email,
            'user_type': user.user_type
        }
        
        # Adicionar dados específicos do tipo
        if user.user_type == 'company':
            company = Company.query.filter_by(user_id=user.id).first()
            if company:
                response_data['company_id'] = company.id
                response_data['name'] = company.company_name
                additional_claims = {'user_type': 'company', 'company_id': company.id}
            else:
                return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
                
        elif user.user_type == 'candidate':
            candidate = Candidate.query.filter_by(user_id=user.id).first()
            if candidate:
                response_data['candidate_id'] = candidate.id
                response_data['name'] = f"{candidate.first_name} {candidate.last_name}"
                additional_claims = {'user_type': 'candidate', 'candidate_id': candidate.id}
            else:
                return jsonify({'error': 'Perfil de candidato não encontrado'}), 404
                
        elif user.user_type == 'admin':
            from src.models.admin import Admin
            admin = Admin.query.filter_by(user_id=user.id).first()
            if admin:
                response_data['admin_id'] = admin.id
                response_data['name'] = admin.name
                additional_claims = {'user_type': 'admin', 'admin_id': admin.id}
            else:
                return jsonify({'error': 'Perfil de administrador não encontrado'}), 404
        else:
            return jsonify({'error': 'Tipo de usuário inválido'}), 400
        
        # Gerar tokens
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30)
        )
        
        response_data['access_token'] = access_token
        response_data['refresh_token'] = refresh_token
        response_data['message'] = 'Login realizado com sucesso'
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error in generic login: {e}")
        return jsonify({'error': str(e)}), 500

