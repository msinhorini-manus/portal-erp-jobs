import hashlib
import ipaddress
import secrets
import uuid
from datetime import datetime, timedelta
from urllib.parse import quote

from flask import Blueprint, current_app, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt, get_jwt_identity
from src.models.user import User
from src.models.session_family import SessionFamily
from src.models.company import Company, CompanyStatus
from src.models.candidate import Candidate
from src.models.company_user import CompanyUser, CompanyUserRole
from src.config import db
from src.rate_limit import auth_rate_limiter
from src.regional_access import ensure_candidate_site, ensure_company_site, get_active_user, token_claims
from src.regional_context import get_current_site
from src.services.email import (
    EmailDeliveryUnavailable,
    configured_email_provider,
    send_password_reset_email,
)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

INVALID_CREDENTIALS = {'error': 'Email ou senha inválidos'}
GENERIC_RECOVERY = {
    'message': 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
}
RECOVERY_UNAVAILABLE = {
    'error': 'Serviço de recuperação temporariamente indisponível. Tente novamente mais tarde.'
}
_DUMMY_PASSWORD_HASH = generate_password_hash('not-a-real-password')


def _password_policy_error(password):
    value = password or ''
    if (
        len(value) < 8
        or not any(character.isupper() for character in value)
        or not any(character.islower() for character in value)
        or not any(character.isdigit() for character in value)
    ):
        return 'A senha deve ter ao menos 8 caracteres, com maiúscula, minúscula e número'
    return None


def _rate_limit(scope, email, limit_key, window_key):
    allowed, retry_after = auth_rate_limiter.check(
        scope=scope,
        ip_address=request.remote_addr or 'unknown',
        email=email,
        limit=current_app.config[limit_key],
        window_seconds=current_app.config[window_key],
    )
    if allowed:
        return None
    response = jsonify({'error': 'Muitas tentativas. Tente novamente mais tarde.'})
    response.headers['Retry-After'] = str(retry_after)
    return response, 429


def _authenticate_user(email, password, *, expected_type=None):
    """Authenticate without account enumeration and persist lockout changes."""
    normalized_email = (email or '').strip().lower()
    user = User.query.filter(db.func.lower(User.email) == normalized_email).first()

    if user and user.is_locked():
        return None

    if not user:
        check_password_hash(_DUMMY_PASSWORD_HASH, password or '')
        return None

    valid_password = user.check_password(password or '')
    if not user.is_active or (expected_type and user.user_type != expected_type) or not valid_password:
        user.record_failed_login()
        db.session.commit()
        return None

    user.record_successful_login()
    db.session.commit()
    return user


def _client_ip_prefix():
    try:
        address = ipaddress.ip_address(request.remote_addr or '')
    except ValueError:
        return None
    prefix = 24 if address.version == 4 else 64
    return str(ipaddress.ip_network(f'{address}/{prefix}', strict=False))


def _user_agent_hash():
    value = request.headers.get('User-Agent', '').strip()
    return hashlib.sha256(value.encode('utf-8')).hexdigest() if value else None


def _issue_tokens(user, site, *, company=None, candidate=None, admin=None):
    family_id = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())
    refresh_lifetime = current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
    claims = token_claims(
        user,
        site,
        company=company,
        candidate=candidate,
        admin=admin,
        family_id=family_id,
    )
    family = SessionFamily(
        user_id=user.id,
        site_id=site.id,
        family_id=family_id,
        current_refresh_jti=refresh_jti,
        expires_at=datetime.utcnow() + refresh_lifetime,
        user_agent_hash=_user_agent_hash(),
        ip_prefix=_client_ip_prefix(),
    )
    db.session.add(family)
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=claims,
        expires_delta=current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={**claims, 'jti': refresh_jti},
        expires_delta=refresh_lifetime,
    )
    db.session.commit()
    return access_token, refresh_token

# ============================================
# COMPANY REGISTRATION & LOGIN
# ============================================

@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    """
    Registrar nova empresa
    """
    try:
        site = get_current_site()
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'O corpo da requisição deve ser um objeto JSON'}), 400

        # Validar dados obrigatórios
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        password_error = _password_policy_error(data['password'])
        if password_error:
            return jsonify({'error': password_error}), 400

        # Verificar se email já existe
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'error': 'Email já cadastrado'}), 409

        tax_id = str(data.get('cnpj') or data.get('tax_id') or '').strip()
        if not tax_id:
            return jsonify({'error': 'Identificação fiscal é obrigatória'}), 400
        if Company.query.filter_by(cnpj=tax_id).first():
            return jsonify({'error': 'Identificação fiscal já cadastrada'}), 409

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
            company_name=data.get('trade_name') or data.get('name') or data.get('legal_name', 'Empresa'),
            cnpj=tax_id,
            website=data.get('website', ''),
            sector=data.get('sector', ''),
            company_size=data.get('company_size', ''),
            description=data.get('description', ''),
            country=site.name,
            state=data.get('state', ''),
            city=data.get('city', ''),
            street_address=data.get('address', ''),
            phone=data.get('phone', '')
        )

        db.session.add(new_company)
        db.session.flush()
        company_site = ensure_company_site(
            new_company,
            site,
            status=CompanyStatus.PENDING,
        )
        db.session.add(CompanyUser(
            company_id=new_company.id,
            user_id=new_user.id,
            role=CompanyUserRole.OWNER,
            name=new_company.company_name,
            position='Owner',
            is_active=True,
            invitation_accepted=True,
        ))
        db.session.commit()

        access_token, refresh_token = _issue_tokens(
            new_user,
            site,
            company=new_company,
        )

        return jsonify({
            'message': 'Empresa registrada com sucesso',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'user_type': 'company',
                'company_id': new_company.id,
                'company_name': new_company.company_name,
                'site_code': site.code,
                'site_status': company_site.status
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201

    except Exception:
        db.session.rollback()
        current_app.logger.error('Company registration failed')
        return jsonify({'error': 'Não foi possível registrar a empresa'}), 500


@auth_bp.route('/login/company', methods=['POST'])
def login_company():
    """
    Login de empresa
    """
    try:
        site = get_current_site()
        data = request.get_json(silent=True) or {}
        email = data.get('email', '')
        limited = _rate_limit(
            'login-company', email, 'AUTH_LOGIN_RATE_LIMIT', 'AUTH_LOGIN_RATE_WINDOW'
        )
        if limited:
            return limited

        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400

        user = _authenticate_user(email, data['password'], expected_type='company')
        if not user:
            return jsonify(INVALID_CREDENTIALS), 401

        # Buscar empresa
        company = Company.query.filter_by(user_id=user.id).first()

        if not company:
            return jsonify({'error': 'Empresa não encontrada'}), 404

        company_site = ensure_company_site(company, site)
        owner = CompanyUser.query.filter_by(company_id=company.id, user_id=user.id).first()
        if not owner:
            db.session.add(CompanyUser(
                company_id=company.id,
                user_id=user.id,
                role=CompanyUserRole.OWNER,
                name=company.company_name,
                position='Owner',
                is_active=True,
                invitation_accepted=True,
            ))
        db.session.commit()

        access_token, refresh_token = _issue_tokens(user, site, company=company)

        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': 'company',
                'company_id': company.id,
                'company_name': company.company_name,
                'site_code': site.code,
                'site_status': company_site.status
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200

    except Exception:
        current_app.logger.error('Company login failed')
        return jsonify({'error': 'Não foi possível realizar o login'}), 500


# ============================================
# CANDIDATE REGISTRATION & LOGIN
# ============================================

@auth_bp.route('/register/candidate', methods=['POST'])
def register_candidate():
    """
    Registrar novo candidato
    """
    try:
        site = get_current_site()
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'O corpo da requisição deve ser um objeto JSON'}), 400

        # Validar dados obrigatórios
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        password_error = _password_policy_error(data['password'])
        if password_error:
            return jsonify({'error': password_error}), 400

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
            country=site.name,
            current_title=data.get('current_position', ''),
            professional_summary=data.get('professional_summary', ''),
            years_experience=data.get('years_of_experience', 0),
            expected_salary=data.get('desired_salary'),
            linkedin_url=data.get('linkedin_url', ''),
            github_url=data.get('github_url', ''),
            portfolio_url=data.get('portfolio_url', '')
        )

        db.session.add(new_candidate)
        db.session.flush()
        candidate_site = ensure_candidate_site(new_candidate, site)
        db.session.commit()

        access_token, refresh_token = _issue_tokens(
            new_user,
            site,
            candidate=new_candidate,
        )

        return jsonify({
            'message': 'Candidato registrado com sucesso',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'user_type': 'candidate',
                'candidate_id': new_candidate.id,
                'name': f"{new_candidate.first_name} {new_candidate.last_name}",
                'site_code': site.code,
                'is_discoverable': candidate_site.is_discoverable
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201

    except Exception:
        db.session.rollback()
        current_app.logger.error('Candidate registration failed')
        return jsonify({'error': 'Não foi possível registrar o candidato'}), 500


@auth_bp.route('/login/candidate', methods=['POST'])
def login_candidate():
    """
    Login de candidato
    """
    try:
        site = get_current_site()
        data = request.get_json(silent=True) or {}
        email = data.get('email', '')
        limited = _rate_limit(
            'login-candidate', email, 'AUTH_LOGIN_RATE_LIMIT', 'AUTH_LOGIN_RATE_WINDOW'
        )
        if limited:
            return limited

        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400

        user = _authenticate_user(email, data['password'], expected_type='candidate')
        if not user:
            return jsonify(INVALID_CREDENTIALS), 401

        # Buscar candidato
        candidate = Candidate.query.filter_by(user_id=user.id).first()

        if not candidate:
            return jsonify({'error': 'Candidato não encontrado'}), 404

        candidate_site = ensure_candidate_site(candidate, site)
        db.session.commit()
        access_token, refresh_token = _issue_tokens(user, site, candidate=candidate)

        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': 'candidate',
                'candidate_id': candidate.id,
                'full_name': f"{candidate.first_name} {candidate.last_name}",
                'site_code': site.code,
                'is_discoverable': candidate_site.is_discoverable
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
@jwt_required(refresh=True, verify_type=True, skip_revocation_check=True)
def refresh():
    """
    Renovar access token usando refresh token
    """
    try:
        site = get_current_site()
        current_claims = get_jwt()
        if current_claims.get('site_id') != site.id or current_claims.get('site_code') != site.code:
            return jsonify({'error': 'Sessão não pertence a este site regional'}), 403
        try:
            current_user_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return jsonify({'error': 'Sessão inválida ou revogada. Faça login novamente.'}), 401

        family = SessionFamily.query.filter_by(
            family_id=current_claims.get('family_id'),
            user_id=current_user_id,
            site_id=site.id,
        ).first()
        if not family or not family.is_valid():
            return jsonify({'error': 'Sessão inválida ou revogada. Faça login novamente.'}), 401
        if not family.accepts_refresh_jti(current_claims.get('jti')):
            family.revoke()
            db.session.commit()
            return jsonify({'error': 'Reutilização de token detectada. Sessão revogada.'}), 401

        user = db.session.get(User, current_user_id)

        if not user or not user.is_active:
            family.revoke()
            db.session.commit()
            return jsonify({'error': 'Sessão inválida ou revogada. Faça login novamente.'}), 401

        company = Company.query.filter_by(user_id=user.id).first() if user.user_type == 'company' else None
        candidate = Candidate.query.filter_by(user_id=user.id).first() if user.user_type == 'candidate' else None
        admin = None
        if user.user_type == 'admin':
            from src.models.admin import Admin
            admin = Admin.query.filter_by(user_id=user.id).first()
        claims = token_claims(
            user,
            site,
            company=company,
            candidate=candidate,
            admin=admin,
            family_id=family.family_id,
        )
        new_refresh_jti = str(uuid.uuid4())
        refresh_lifetime = current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
        if not family.rotate(
            current_claims.get('jti'),
            new_refresh_jti,
            datetime.utcnow() + refresh_lifetime,
        ):
            db.session.commit()
            return jsonify({'error': 'Reutilização de token detectada. Sessão revogada.'}), 401
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=claims,
            expires_delta=current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims={**claims, 'jti': new_refresh_jti},
            expires_delta=refresh_lifetime,
        )
        db.session.commit()

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required(verify_type=False, skip_revocation_check=True)
def logout():
    """Revoke the family represented by either an access or refresh token."""
    claims = get_jwt()
    family = SessionFamily.query.filter_by(family_id=claims.get('family_id')).first()
    if family:
        family.revoke()
        db.session.commit()
    return jsonify({'message': 'Logout realizado com sucesso'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Obter dados do usuário autenticado
    """
    try:
        user, site, error, status = get_active_user()
        if error:
            return error, status

        return jsonify({
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'site_code': site.code,
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
        user, _, error, status = get_active_user()
        if error:
            return error, status
        data = request.get_json()

        # Validar dados
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Senha atual e nova senha são obrigatórias'}), 400

        # Verificar senha atual
        if not check_password_hash(user.password_hash, data['current_password']):
            return jsonify({'error': 'Senha atual incorreta'}), 401

        password_error = _password_policy_error(data['new_password'])
        if password_error:
            return jsonify({'error': password_error}), 400

        # Atualizar senha e invalidar todas as sessões, inclusive a atual.
        user.set_password(data['new_password'])
        user.revoke_all_sessions()
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
        site = get_current_site()
        data = request.get_json(silent=True) or {}
        email = data.get('email', '')
        limited = _rate_limit(
            'login-admin', email, 'AUTH_LOGIN_RATE_LIMIT', 'AUTH_LOGIN_RATE_WINDOW'
        )
        if limited:
            return limited

        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400

        user = _authenticate_user(email, data['password'], expected_type='admin')
        if not user:
            return jsonify(INVALID_CREDENTIALS), 401

        # Buscar perfil admin
        from src.models.admin import Admin
        admin = Admin.query.filter_by(user_id=user.id).first()

        if not admin:
            return jsonify({'error': 'Perfil de administrador não encontrado'}), 404

        access_token, refresh_token = _issue_tokens(user, site, admin=admin)

        return jsonify({
            'message': 'Login realizado com sucesso',
            'user_id': user.id,
            'email': user.email,
            'name': admin.name,
            'user_type': 'admin',
            'site_code': site.code,
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
        site = get_current_site()
        data = request.get_json(silent=True) or {}
        email = data.get('email', '')
        limited = _rate_limit(
            'login-generic', email, 'AUTH_LOGIN_RATE_LIMIT', 'AUTH_LOGIN_RATE_WINDOW'
        )
        if limited:
            return limited

        # Validar dados
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400

        requested_type = data.get('user_type')
        user = _authenticate_user(email, data['password'], expected_type=requested_type)
        if not user:
            return jsonify(INVALID_CREDENTIALS), 401

        # Preparar resposta baseada no tipo de usuário
        response_data = {
            'user_id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'site_code': site.code
        }
        company = None
        candidate = None
        admin = None

        # Adicionar dados específicos do tipo
        if user.user_type == 'company':
            company = Company.query.filter_by(user_id=user.id).first()
            if company:
                company_site = ensure_company_site(company, site)
                response_data['company_id'] = company.id
                response_data['name'] = company.company_name
                response_data['site_status'] = company_site.status
            else:
                return jsonify({'error': 'Perfil de empresa não encontrado'}), 404

        elif user.user_type == 'candidate':
            candidate = Candidate.query.filter_by(user_id=user.id).first()
            if candidate:
                candidate_site = ensure_candidate_site(candidate, site)
                response_data['candidate_id'] = candidate.id
                response_data['name'] = f"{candidate.first_name} {candidate.last_name}"
                response_data['is_discoverable'] = candidate_site.is_discoverable
            else:
                return jsonify({'error': 'Perfil de candidato não encontrado'}), 404

        elif user.user_type == 'admin':
            from src.models.admin import Admin
            admin = Admin.query.filter_by(user_id=user.id).first()
            if admin:
                response_data['admin_id'] = admin.id
                response_data['name'] = admin.name
            else:
                return jsonify({'error': 'Perfil de administrador não encontrado'}), 404
        else:
            return jsonify({'error': 'Tipo de usuário inválido'}), 400

        db.session.commit()
        access_token, refresh_token = _issue_tokens(
            user,
            site,
            company=company,
            candidate=candidate,
            admin=admin,
        )

        response_data['access_token'] = access_token
        response_data['refresh_token'] = refresh_token
        response_data['message'] = 'Login realizado com sucesso'

        return jsonify(response_data), 200

    except Exception as e:
        print(f"Error in generic login: {e}")
        return jsonify({'error': str(e)}), 500



# ============================================
# PASSWORD RESET
# ============================================

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Solicitar recuperação de senha
    """
    try:
        site = get_current_site()
        data = request.get_json(silent=True) or {}
        email = data.get('email', '').lower().strip()
        limited = _rate_limit(
            'forgot-password', email, 'AUTH_FORGOT_RATE_LIMIT', 'AUTH_FORGOT_RATE_WINDOW'
        )
        if limited:
            return limited

        if not email:
            return jsonify({'error': 'Email é obrigatório'}), 400

        if configured_email_provider() is None:
            return jsonify(RECOVERY_UNAVAILABLE), 503

        user = User.query.filter_by(email=email).first()

        # Sempre retorna sucesso para evitar enumeração de emails
        if not user:
            return jsonify(GENERIC_RECOVERY), 200

        if not site.canonical_origin:
            return jsonify(RECOVERY_UNAVAILABLE), 503

        raw_token = user.generate_reset_token()
        reset_url = (
            f"{site.canonical_origin.rstrip('/')}/redefinir-senha?token={quote(raw_token)}"
        )
        try:
            send_password_reset_email(
                recipient=user.email,
                reset_url=reset_url,
                site_name=site.name,
            )
        except EmailDeliveryUnavailable:
            db.session.rollback()
            return jsonify(RECOVERY_UNAVAILABLE), 503

        db.session.commit()
        return jsonify(GENERIC_RECOVERY), 200

    except Exception:
        db.session.rollback()
        return jsonify(RECOVERY_UNAVAILABLE), 503


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Redefinir senha usando token
    """
    try:
        data = request.get_json(silent=True) or {}
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        limited = _rate_limit(
            'reset-password', token, 'AUTH_RESET_RATE_LIMIT', 'AUTH_RESET_RATE_WINDOW'
        )
        if limited:
            return limited

        if not token or not new_password:
            return jsonify({'error': 'Token e nova senha são obrigatórios'}), 400

        password_error = _password_policy_error(new_password)
        if password_error:
            return jsonify({'error': password_error}), 400

        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        user = User.query.filter_by(reset_token=token_hash).first()

        if not user or not user.verify_reset_token(token):
            return jsonify({'error': 'Token inválido ou expirado'}), 400

        # Redefinir senha, consumir token e revogar todas as sessões.
        user.set_password(new_password)
        user.clear_reset_token()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.revoke_all_sessions()

        db.session.commit()

        return jsonify({
            'message': 'Senha redefinida com sucesso. Você já pode fazer login.'
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Não foi possível redefinir a senha'}), 500


# ============================================
# SOCIAL LOGIN - GOOGLE
# ============================================

@auth_bp.route('/social/google', methods=['POST'])
def google_login():
    """
    Login/Registro com Google OAuth
    """
    try:
        site = get_current_site()
        data = request.get_json()
        google_token = data.get('token', '')

        if not google_token:
            return jsonify({'error': 'Token do Google é obrigatório'}), 400

        # Verificar token com Google
        import requests as http_requests

        google_response = http_requests.get(
            f'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={google_token}'
        )

        if google_response.status_code != 200:
            return jsonify({'error': 'Token do Google inválido'}), 401

        google_data = google_response.json()

        email = google_data.get('email', '').lower()
        google_id = google_data.get('sub')
        name = google_data.get('name', '')
        picture = google_data.get('picture', '')

        if not email or not google_id:
            return jsonify({'error': 'Dados do Google incompletos'}), 400

        # Verificar se usuário já existe
        user = User.query.filter_by(email=email).first()

        if user:
            # Usuário existe - verificar se é candidato
            if user.user_type != 'candidate':
                return jsonify({
                    'error': f'Este email está cadastrado como {user.user_type}. Use o login apropriado.'
                }), 400

            # Atualizar social_id se necessário
            if hasattr(user, 'social_id') and not user.social_id:
                user.social_id = google_id
                user.auth_provider = 'google'
                db.session.commit()

            candidate = Candidate.query.filter_by(user_id=user.id).first()

        else:
            # Criar novo usuário e candidato
            name_parts = name.split(' ', 1) if name else ['Usuário', 'Google']
            first_name = name_parts[0] if name_parts else 'Usuário'
            last_name = name_parts[1] if len(name_parts) > 1 else 'Google'

            user = User(
                email=email,
                user_type='candidate',
                is_active=True,
                auth_provider='google',
                social_id=google_id
            )
            if hasattr(user, 'is_verified'):
                user.is_verified = True  # Email já verificado pelo Google

            db.session.add(user)
            db.session.flush()

            candidate = Candidate(
                user_id=user.id,
                first_name=first_name,
                last_name=last_name
            )
            if picture and hasattr(candidate, 'avatar_url'):
                candidate.avatar_url = picture

            db.session.add(candidate)
            db.session.flush()

        candidate_site = ensure_candidate_site(candidate, site)
        # Atualizar último login
        if hasattr(user, 'last_login'):
            user.last_login = datetime.utcnow()
        db.session.commit()

        access_token, refresh_token = _issue_tokens(user, site, candidate=candidate)

        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': 'candidate',
                'candidate_id': candidate.id,
                'name': f"{candidate.first_name} {candidate.last_name}",
                'auth_provider': 'google',
                'site_code': site.code,
                'is_discoverable': candidate_site.is_discoverable
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in Google login: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# SOCIAL LOGIN - LINKEDIN
# ============================================

@auth_bp.route('/social/linkedin', methods=['POST'])
def linkedin_login():
    """
    Login/Registro com LinkedIn OAuth
    """
    try:
        site = get_current_site()
        data = request.get_json()
        linkedin_code = data.get('code', '')
        redirect_uri = data.get('redirect_uri', '')

        if not linkedin_code:
            return jsonify({'error': 'Código do LinkedIn é obrigatório'}), 400

        import requests as http_requests
        import os

        # Obter access token do LinkedIn
        linkedin_client_id = os.environ.get('LINKEDIN_CLIENT_ID', '')
        linkedin_client_secret = os.environ.get('LINKEDIN_CLIENT_SECRET', '')

        if not linkedin_client_id or not linkedin_client_secret:
            return jsonify({'error': 'LinkedIn não configurado no servidor'}), 500

        token_response = http_requests.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            data={
                'grant_type': 'authorization_code',
                'code': linkedin_code,
                'redirect_uri': redirect_uri,
                'client_id': linkedin_client_id,
                'client_secret': linkedin_client_secret
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        if token_response.status_code != 200:
            return jsonify({'error': 'Falha ao obter token do LinkedIn'}), 401

        token_data = token_response.json()
        linkedin_access_token = token_data.get('access_token')

        # Obter dados do perfil
        profile_response = http_requests.get(
            'https://api.linkedin.com/v2/userinfo',
            headers={'Authorization': f'Bearer {linkedin_access_token}'}
        )

        if profile_response.status_code != 200:
            return jsonify({'error': 'Falha ao obter perfil do LinkedIn'}), 401

        profile_data = profile_response.json()

        email = profile_data.get('email', '').lower()
        linkedin_id = profile_data.get('sub')
        name = profile_data.get('name', '')
        picture = profile_data.get('picture', '')

        if not email or not linkedin_id:
            return jsonify({'error': 'Dados do LinkedIn incompletos'}), 400

        # Verificar se usuário já existe
        user = User.query.filter_by(email=email).first()

        if user:
            # Usuário existe - verificar se é candidato
            if user.user_type != 'candidate':
                return jsonify({
                    'error': f'Este email está cadastrado como {user.user_type}. Use o login apropriado.'
                }), 400

            # Atualizar social_id se necessário
            if hasattr(user, 'social_id') and not user.social_id:
                user.social_id = linkedin_id
                user.auth_provider = 'linkedin'
                db.session.commit()

            candidate = Candidate.query.filter_by(user_id=user.id).first()

        else:
            # Criar novo usuário e candidato
            name_parts = name.split(' ', 1) if name else ['Usuário', 'LinkedIn']
            first_name = name_parts[0] if name_parts else 'Usuário'
            last_name = name_parts[1] if len(name_parts) > 1 else 'LinkedIn'

            user = User(
                email=email,
                user_type='candidate',
                is_active=True,
                auth_provider='linkedin',
                social_id=linkedin_id
            )
            if hasattr(user, 'is_verified'):
                user.is_verified = True  # Email já verificado pelo LinkedIn

            db.session.add(user)
            db.session.flush()

            candidate = Candidate(
                user_id=user.id,
                first_name=first_name,
                last_name=last_name
            )
            if picture and hasattr(candidate, 'avatar_url'):
                candidate.avatar_url = picture
            if hasattr(candidate, 'linkedin_url'):
                candidate.linkedin_url = f"https://www.linkedin.com/in/{linkedin_id}"

            db.session.add(candidate)
            db.session.flush()

        candidate_site = ensure_candidate_site(candidate, site)
        # Atualizar último login
        if hasattr(user, 'last_login'):
            user.last_login = datetime.utcnow()
        db.session.commit()

        access_token, refresh_token = _issue_tokens(user, site, candidate=candidate)

        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': 'candidate',
                'candidate_id': candidate.id,
                'name': f"{candidate.first_name} {candidate.last_name}",
                'auth_provider': 'linkedin',
                'site_code': site.code,
                'is_discoverable': candidate_site.is_discoverable
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in LinkedIn login: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# ADMIN MANAGEMENT
# ============================================

@auth_bp.route('/admin/register', methods=['POST'])
@jwt_required()
def register_admin():
    """
    Registrar novo administrador (apenas super_admin pode fazer isso)
    """
    try:
        current_user, _, error, status = get_active_user('admin')
        if error:
            return error, status

        from src.models.admin import Admin, AdminRole, DEFAULT_PERMISSIONS
        current_admin = Admin.query.filter_by(user_id=current_user.id).first()

        if not current_admin or current_admin.role != 'super_admin':
            return jsonify({'error': 'Apenas super administradores podem criar novos admins'}), 403

        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        role = data.get('role', 'moderator')

        if not email or not password or not name:
            return jsonify({'error': 'Email, senha e nome são obrigatórios'}), 400

        password_error = _password_policy_error(password)
        if password_error:
            return jsonify({'error': password_error}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 409

        # Criar usuário
        new_user = User(
            email=email,
            password_hash=generate_password_hash(password),
            user_type='admin',
            is_active=True
        )
        if hasattr(new_user, 'is_verified'):
            new_user.is_verified = True
        if hasattr(new_user, 'auth_provider'):
            new_user.auth_provider = 'email'

        db.session.add(new_user)
        db.session.flush()

        # Criar perfil admin
        new_admin = Admin(
            user_id=new_user.id,
            name=name,
            role=role,
            permissions=DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS.get('moderator', {})),
            created_by=current_admin.id
        )
        db.session.add(new_admin)
        db.session.commit()

        return jsonify({
            'message': 'Administrador criado com sucesso',
            'admin': {
                'id': new_admin.id,
                'user_id': new_user.id,
                'email': new_user.email,
                'name': new_admin.name,
                'role': new_admin.role
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error registering admin: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/admin/list', methods=['GET'])
@jwt_required()
def list_admins():
    """
    Listar todos os administradores (apenas super_admin)
    """
    try:
        current_user, _, error, status = get_active_user('admin')
        if error:
            return error, status

        from src.models.admin import Admin
        current_admin = Admin.query.filter_by(user_id=current_user.id).first()

        if not current_admin or current_admin.role != 'super_admin':
            return jsonify({'error': 'Apenas super administradores podem listar admins'}), 403

        admins = Admin.query.all()
        admins_data = []

        for admin in admins:
            user = User.query.get(admin.user_id)
            admins_data.append({
                'id': admin.id,
                'user_id': admin.user_id,
                'email': user.email if user else None,
                'name': admin.name,
                'role': admin.role,
                'permissions': admin.permissions,
                'is_active': user.is_active if user else False,
                'last_activity': admin.last_activity.isoformat() if admin.last_activity else None,
                'created_at': admin.created_at.isoformat() if admin.created_at else None
            })

        return jsonify({
            'admins': admins_data,
            'total': len(admins_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
