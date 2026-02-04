from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.company import Company
from src.models.user import User
from src.config import db

companies_bp = Blueprint('companies', __name__, url_prefix='/api/companies')

@companies_bp.route('/me', methods=['GET'])
@companies_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_my_company_profile():
    """
    Obter perfil completo da empresa autenticada
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado. Apenas empresas podem acessar'}), 403
        
        # Buscar empresa
        company = Company.query.filter_by(user_id=current_user_id).first()
        
        if not company:
            return jsonify({'error': 'Perfil de empresa não encontrado'}), 404
        
        return jsonify(company.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@companies_bp.route('/me', methods=['PUT'])
@companies_bp.route('/profile', methods=['POST', 'PUT'])
@jwt_required()
def create_or_update_company_profile():
    """
    Criar ou atualizar perfil da empresa
    """
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Verificar se é empresa
        if claims.get('user_type') != 'company':
            return jsonify({'error': 'Acesso negado. Apenas empresas podem acessar'}), 403
        
        data = request.get_json()
        
        # Buscar empresa existente
        company = Company.query.filter_by(user_id=current_user_id).first()
        
        if company:
            # Atualizar
            if 'company_name' in data:
                company.company_name = data['company_name']
            if 'cnpj' in data:
                company.cnpj = data['cnpj']
            if 'website' in data:
                company.website = data['website']
            if 'description' in data:
                company.description = data['description']
            if 'logo_url' in data:
                company.logo_url = data['logo_url']
            if 'city' in data:
                company.city = data['city']
            if 'state' in data:
                company.state = data['state']
            if 'size' in data:
                company.size = data['size']
            if 'industry' in data:
                company.industry = data['industry']
            
            db.session.commit()
            
            return jsonify({
                'message': 'Perfil atualizado com sucesso',
                'company': company.to_dict()
            }), 200
        else:
            # Criar novo
            new_company = Company(
                user_id=current_user_id,
                company_name=data.get('company_name'),
                cnpj=data.get('cnpj'),
                website=data.get('website'),
                description=data.get('description'),
                logo_url=data.get('logo_url'),
                city=data.get('city'),
                state=data.get('state'),
                size=data.get('size'),
                industry=data.get('industry')
            )
            
            db.session.add(new_company)
            db.session.commit()
            
            return jsonify({
                'message': 'Perfil criado com sucesso',
                'company': new_company.to_dict()
            }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@companies_bp.route('/<int:company_id>', methods=['GET'])
def get_company_by_id(company_id):
    """
    Obter perfil público de uma empresa específica
    """
    try:
        company = Company.query.get(company_id)
        
        if not company:
            return jsonify({'error': 'Empresa não encontrada'}), 404
        
        return jsonify(company.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@companies_bp.route('/search', methods=['GET'])
def search_companies():
    """
    Buscar empresas (público)
    """
    try:
        # Parâmetros de busca
        query = request.args.get('q', '')
        city = request.args.get('city', '')
        state = request.args.get('state', '')
        size = request.args.get('size', '')
        industry = request.args.get('industry', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Construir query
        companies_query = Company.query
        
        # Filtro de texto (nome ou descrição)
        if query:
            companies_query = companies_query.filter(
                db.or_(
                    Company.company_name.ilike(f'%{query}%'),
                    Company.description.ilike(f'%{query}%')
                )
            )
        
        # Filtro de localização
        if city:
            companies_query = companies_query.filter(Company.city.ilike(f'%{city}%'))
        if state:
            companies_query = companies_query.filter(Company.state.ilike(f'%{state}%'))
        
        # Filtro de tamanho
        if size:
            companies_query = companies_query.filter(Company.size == size)
        
        # Filtro de indústria
        if industry:
            companies_query = companies_query.filter(Company.industry.ilike(f'%{industry}%'))
        
        # Paginação
        pagination = companies_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'companies': [c.to_dict() for c in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

