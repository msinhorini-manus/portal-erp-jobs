"""
Rotas de API para configurações da plataforma
(Áreas de Atuação, Níveis de Experiência, Modalidades, Tecnologias, Softwares, Tags)
"""

from flask import Blueprint, request, jsonify
from src.config import db
from src.models.job_area import JobArea
from src.models.experience_level import ExperienceLevel
from src.models.work_modality import WorkModality
from src.models.software import Software
from src.models.technology import Technology
from src.models.tag import Tag
from src.routes.admin import admin_required

config_bp = Blueprint('config', __name__, url_prefix='/api/config')

# ==================== ÁREAS DE ATUAÇÃO ====================

@config_bp.route('/areas', methods=['GET'])
def get_areas():
    """Listar todas as áreas de atuação"""
    areas = JobArea.query.filter_by(is_active=True).order_by(JobArea.name).all()
    return jsonify([area.to_dict() for area in areas])

@config_bp.route('/areas/<int:area_id>', methods=['GET'])
def get_area(area_id):
    """Buscar área de atuação por ID"""
    area = JobArea.query.get(area_id)
    if not area:
        return jsonify({'error': 'Área não encontrada'}), 404
    return jsonify(area.to_dict())

@config_bp.route('/areas', methods=['POST'])
@admin_required
def create_area():
    """Criar nova área de atuação"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    # Verificar se já existe
    existing = JobArea.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Área já existe'}), 400

    area = JobArea(
        name=data['name'],
        description=data.get('description'),
        icon=data.get('icon'),
        color=data.get('color', 'blue')
    )

    db.session.add(area)
    db.session.commit()

    return jsonify(area.to_dict()), 201

@config_bp.route('/areas/<int:area_id>', methods=['PUT'])
@admin_required
def update_area(area_id):
    """Atualizar área de atuação"""
    area = JobArea.query.get_or_404(area_id)
    data = request.get_json()

    if 'name' in data:
        area.name = data['name']
    if 'description' in data:
        area.description = data['description']
    if 'icon' in data:
        area.icon = data['icon']
    if 'color' in data:
        area.color = data['color']

    db.session.commit()
    return jsonify(area.to_dict())

@config_bp.route('/areas/<int:area_id>', methods=['DELETE'])
@admin_required
def delete_area(area_id):
    """Excluir área de atuação"""
    area = JobArea.query.get(area_id)
    if not area:
        return jsonify({'error': 'Área não encontrada'}), 404
    db.session.delete(area)
    db.session.commit()
    return jsonify({'message': 'Área excluída com sucesso'}), 200

# ==================== NÍVEIS DE EXPERIÊNCIA ====================

@config_bp.route('/levels', methods=['GET'])
def get_levels():
    """Listar todos os níveis de experiência"""
    levels = ExperienceLevel.query.filter_by(is_active=True).order_by(ExperienceLevel.order).all()
    return jsonify([level.to_dict() for level in levels])

@config_bp.route('/levels/<int:level_id>', methods=['GET'])
def get_level(level_id):
    """Buscar nível de experiência por ID"""
    level = ExperienceLevel.query.get(level_id)
    if not level:
        return jsonify({'error': 'Nível não encontrado'}), 404
    return jsonify(level.to_dict())

@config_bp.route('/levels', methods=['POST'])
@admin_required
def create_level():
    """Criar novo nível de experiência"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    existing = ExperienceLevel.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Nível já existe'}), 400

    level = ExperienceLevel(
        name=data['name'],
        description=data.get('description'),
        order=data.get('order', 0)
    )

    db.session.add(level)
    db.session.commit()

    return jsonify(level.to_dict()), 201

@config_bp.route('/levels/<int:level_id>', methods=['PUT'])
@admin_required
def update_level(level_id):
    """Atualizar nível de experiência"""
    level = ExperienceLevel.query.get_or_404(level_id)
    data = request.get_json()

    if 'name' in data:
        level.name = data['name']
    if 'description' in data:
        level.description = data['description']
    if 'order' in data:
        level.order = data['order']

    db.session.commit()
    return jsonify(level.to_dict())

@config_bp.route('/levels/<int:level_id>', methods=['DELETE'])
@admin_required
def delete_level(level_id):
    """Excluir nível de experiência"""
    level = ExperienceLevel.query.get(level_id)
    if not level:
        return jsonify({'error': 'Nível não encontrado'}), 404
    db.session.delete(level)
    db.session.commit()
    return jsonify({'message': 'Nível excluído com sucesso'}), 200

# ==================== MODALIDADES DE TRABALHO ====================

@config_bp.route('/modalities', methods=['GET'])
def get_modalities():
    """Listar todas as modalidades de trabalho"""
    modalities = WorkModality.query.filter_by(is_active=True).order_by(WorkModality.name).all()
    return jsonify([modality.to_dict() for modality in modalities])

@config_bp.route('/modalities/<int:modality_id>', methods=['GET'])
def get_modality(modality_id):
    """Buscar modalidade de trabalho por ID"""
    modality = WorkModality.query.get(modality_id)
    if not modality:
        return jsonify({'error': 'Modalidade não encontrada'}), 404
    return jsonify(modality.to_dict())

@config_bp.route('/modalities', methods=['POST'])
@admin_required
def create_modality():
    """Criar nova modalidade de trabalho"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    existing = WorkModality.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Modalidade já existe'}), 400

    modality = WorkModality(
        name=data['name'],
        description=data.get('description'),
        icon=data.get('icon')
    )

    db.session.add(modality)
    db.session.commit()

    return jsonify(modality.to_dict()), 201

@config_bp.route('/modalities/<int:modality_id>', methods=['PUT'])
@admin_required
def update_modality(modality_id):
    """Atualizar modalidade de trabalho"""
    modality = WorkModality.query.get_or_404(modality_id)
    data = request.get_json()

    if 'name' in data:
        modality.name = data['name']
    if 'description' in data:
        modality.description = data['description']
    if 'icon' in data:
        modality.icon = data['icon']

    db.session.commit()
    return jsonify(modality.to_dict())

@config_bp.route('/modalities/<int:modality_id>', methods=['DELETE'])
@admin_required
def delete_modality(modality_id):
    """Excluir modalidade de trabalho"""
    modality = WorkModality.query.get(modality_id)
    if not modality:
        return jsonify({'error': 'Modalidade não encontrada'}), 404
    db.session.delete(modality)
    db.session.commit()
    return jsonify({'message': 'Modalidade excluída com sucesso'}), 200

# ==================== SOFTWARES/ERPs ====================

@config_bp.route('/softwares', methods=['GET'])
def get_softwares():
    """Listar todos os softwares/ERPs"""
    softwares = Software.query.filter_by(is_active=True).order_by(Software.name).all()
    return jsonify([software.to_dict() for software in softwares])

@config_bp.route('/softwares/<int:software_id>', methods=['GET'])
def get_software(software_id):
    """Buscar software/ERP por ID"""
    software = Software.query.get(software_id)
    if not software:
        return jsonify({'error': 'Software não encontrado'}), 404
    return jsonify(software.to_dict())

@config_bp.route('/softwares', methods=['POST'])
@admin_required
def create_software():
    """Criar novo software/ERP"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    existing = Software.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Software já existe'}), 400

    software = Software(
        name=data['name'],
        description=data.get('description'),
        category=data.get('category'),
        vendor=data.get('vendor')
    )

    db.session.add(software)
    db.session.commit()

    return jsonify(software.to_dict()), 201

@config_bp.route('/softwares/<int:software_id>', methods=['PUT'])
@admin_required
def update_software(software_id):
    """Atualizar software/ERP"""
    software = Software.query.get_or_404(software_id)
    data = request.get_json()

    if 'name' in data:
        software.name = data['name']
    if 'description' in data:
        software.description = data['description']
    if 'category' in data:
        software.category = data['category']
    if 'vendor' in data:
        software.vendor = data['vendor']

    db.session.commit()
    return jsonify(software.to_dict())

@config_bp.route('/softwares/<int:software_id>', methods=['DELETE'])
@admin_required
def delete_software(software_id):
    """Excluir software/ERP"""
    software = Software.query.get(software_id)
    if not software:
        return jsonify({'error': 'Software não encontrado'}), 404
    db.session.delete(software)
    db.session.commit()
    return jsonify({'message': 'Software excluído com sucesso'}), 200

# ==================== TECNOLOGIAS ====================

@config_bp.route('/technologies', methods=['GET'])
def get_technologies():
    """Listar todas as tecnologias"""
    technologies = Technology.query.filter_by(is_active=True).order_by(Technology.name).all()
    return jsonify([tech.to_dict() for tech in technologies])

@config_bp.route('/technologies/<int:tech_id>', methods=['GET'])
def get_technology(tech_id):
    """Buscar tecnologia por ID"""
    technology = Technology.query.get(tech_id)
    if not technology:
        return jsonify({'error': 'Tecnologia não encontrada'}), 404
    return jsonify(technology.to_dict())

@config_bp.route('/technologies', methods=['POST'])
@admin_required
def create_technology():
    """Criar nova tecnologia"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    existing = Technology.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Tecnologia já existe'}), 400

    technology = Technology(
        name=data['name'],
        description=data.get('description'),
        category=data.get('category'),
        icon=data.get('icon'),
        color=data.get('color', 'blue')
    )

    db.session.add(technology)
    db.session.commit()

    return jsonify(technology.to_dict()), 201

@config_bp.route('/technologies/<int:tech_id>', methods=['PUT'])
@admin_required
def update_technology(tech_id):
    """Atualizar tecnologia"""
    technology = Technology.query.get_or_404(tech_id)
    data = request.get_json()

    if 'name' in data:
        technology.name = data['name']
    if 'description' in data:
        technology.description = data['description']
    if 'category' in data:
        technology.category = data['category']
    if 'icon' in data:
        technology.icon = data['icon']
    if 'color' in data:
        technology.color = data['color']

    db.session.commit()
    return jsonify(technology.to_dict())

@config_bp.route('/technologies/<int:tech_id>', methods=['DELETE'])
@admin_required
def delete_technology(tech_id):
    """Excluir tecnologia"""
    technology = Technology.query.get(tech_id)
    if not technology:
        return jsonify({'error': 'Tecnologia não encontrada'}), 404
    db.session.delete(technology)
    db.session.commit()
    return jsonify({'message': 'Tecnologia excluída com sucesso'}), 200

# ==================== TAGS/KEYWORDS ====================

@config_bp.route('/tags', methods=['GET'])
def get_tags():
    """Listar todas as tags"""
    tags = Tag.query.filter_by(is_active=True).order_by(Tag.name).all()
    return jsonify([tag.to_dict() for tag in tags])

@config_bp.route('/tags/<int:tag_id>', methods=['GET'])
def get_tag(tag_id):
    """Buscar tag por ID"""
    tag = Tag.query.get(tag_id)
    if not tag:
        return jsonify({'error': 'Tag não encontrada'}), 404
    return jsonify(tag.to_dict())

@config_bp.route('/tags', methods=['POST'])
@admin_required
def create_tag():
    """Criar nova tag"""
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    existing = Tag.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Tag já existe'}), 400

    tag = Tag(
        name=data['name'],
        description=data.get('description'),
        color=data.get('color', 'gray')
    )

    db.session.add(tag)
    db.session.commit()

    return jsonify(tag.to_dict()), 201

@config_bp.route('/tags/<int:tag_id>', methods=['PUT'])
@admin_required
def update_tag(tag_id):
    """Atualizar tag"""
    tag = Tag.query.get_or_404(tag_id)
    data = request.get_json()

    if 'name' in data:
        tag.name = data['name']
    if 'description' in data:
        tag.description = data['description']
    if 'color' in data:
        tag.color = data['color']

    db.session.commit()
    return jsonify(tag.to_dict())

@config_bp.route('/tags/<int:tag_id>', methods=['DELETE'])
@admin_required
def delete_tag(tag_id):
    """Excluir tag"""
    tag = Tag.query.get(tag_id)
    if not tag:
        return jsonify({'error': 'Tag não encontrada'}), 404
    db.session.delete(tag)
    db.session.commit()
    return jsonify({'message': 'Tag excluída com sucesso'}), 200

# ==================== SEED DATA ====================

@config_bp.route('/seed', methods=['POST'])
@admin_required
def seed_config_data():
    """Popular dados iniciais de configuração"""
    try:
        # Seed Áreas de Atuação
        areas_data = [
            {'name': 'Desenvolvimento', 'description': 'Frontend, Backend, Full Stack', 'icon': 'Code', 'color': 'blue'},
            {'name': 'Consultoria & ERP', 'description': 'SAP, Oracle, Protheus', 'icon': 'Users', 'color': 'green'},
            {'name': 'Suporte & Infraestrutura', 'description': 'L1, L2, L3, SysAdmin', 'icon': 'Headphones', 'color': 'orange'},
            {'name': 'DevOps & Cloud', 'description': 'AWS, Azure, Kubernetes', 'icon': 'Cloud', 'color': 'cyan'},
            {'name': 'Dados & Analytics', 'description': 'Data Science, BI', 'icon': 'Database', 'color': 'purple'},
            {'name': 'Segurança', 'description': 'Cybersecurity, InfoSec', 'icon': 'Shield', 'color': 'red'},
            {'name': 'Gestão & Liderança', 'description': 'Tech Lead, IT Manager', 'icon': 'Users2', 'color': 'pink'},
            {'name': 'Mobile', 'description': 'iOS, Android, React Native', 'icon': 'Smartphone', 'color': 'green'},
            {'name': 'QA & Testes', 'description': 'QA, Testes Automatizados', 'icon': 'CheckCircle', 'color': 'yellow'}
        ]

        for area_data in areas_data:
            if not JobArea.query.filter_by(name=area_data['name']).first():
                area = JobArea(**area_data)
                db.session.add(area)

        # Seed Níveis de Experiência
        levels_data = [
            {'name': 'Estágio', 'description': 'Posição para estudantes', 'order': 1},
            {'name': 'Júnior', 'description': '0-2 anos de experiência', 'order': 2},
            {'name': 'Pleno', 'description': '2-5 anos de experiência', 'order': 3},
            {'name': 'Sênior', 'description': '5+ anos de experiência', 'order': 4},
            {'name': 'Especialista', 'description': 'Expert na área', 'order': 5},
            {'name': 'Coordenador', 'description': 'Liderança técnica', 'order': 6},
            {'name': 'Gerente', 'description': 'Gestão de equipes', 'order': 7},
            {'name': 'Diretor', 'description': 'Liderança executiva', 'order': 8}
        ]

        for level_data in levels_data:
            if not ExperienceLevel.query.filter_by(name=level_data['name']).first():
                level = ExperienceLevel(**level_data)
                db.session.add(level)

        # Seed Modalidades de Trabalho
        modalities_data = [
            {'name': 'Presencial', 'description': 'Trabalho no escritório', 'icon': 'Building'},
            {'name': 'Remoto', 'description': 'Trabalho 100% home office', 'icon': 'Home'},
            {'name': 'Híbrido', 'description': 'Parte presencial, parte remoto', 'icon': 'Laptop'},
            {'name': 'Flexível', 'description': 'Horários flexíveis', 'icon': 'Clock'}
        ]

        for modality_data in modalities_data:
            if not WorkModality.query.filter_by(name=modality_data['name']).first():
                modality = WorkModality(**modality_data)
                db.session.add(modality)

        # Seed Softwares/ERPs
        softwares_data = [
            {'name': 'SAP S/4HANA', 'description': 'ERP da SAP', 'category': 'ERP', 'vendor': 'SAP'},
            {'name': 'SAP Business One', 'description': 'ERP para PMEs', 'category': 'ERP', 'vendor': 'SAP'},
            {'name': 'TOTVS Protheus', 'description': 'ERP brasileiro', 'category': 'ERP', 'vendor': 'TOTVS'},
            {'name': 'TOTVS RM', 'description': 'Sistema de gestão', 'category': 'ERP', 'vendor': 'TOTVS'},
            {'name': 'Oracle EBS', 'description': 'E-Business Suite', 'category': 'ERP', 'vendor': 'Oracle'},
            {'name': 'Oracle Cloud', 'description': 'ERP em nuvem', 'category': 'ERP', 'vendor': 'Oracle'},
            {'name': 'Microsoft Dynamics', 'description': 'ERP Microsoft', 'category': 'ERP', 'vendor': 'Microsoft'},
            {'name': 'Salesforce', 'description': 'CRM líder de mercado', 'category': 'CRM', 'vendor': 'Salesforce'},
            {'name': 'ServiceNow', 'description': 'ITSM e workflows', 'category': 'ITSM', 'vendor': 'ServiceNow'},
            {'name': 'Jira', 'description': 'Gestão de projetos', 'category': 'PM', 'vendor': 'Atlassian'}
        ]

        for software_data in softwares_data:
            if not Software.query.filter_by(name=software_data['name']).first():
                software = Software(**software_data)
                db.session.add(software)

        # Seed Tecnologias
        technologies_data = [
            {'name': 'React', 'description': 'Biblioteca JavaScript', 'category': 'Frontend', 'color': 'blue'},
            {'name': 'Vue.js', 'description': 'Framework JavaScript', 'category': 'Frontend', 'color': 'green'},
            {'name': 'Angular', 'description': 'Framework TypeScript', 'category': 'Frontend', 'color': 'red'},
            {'name': 'Node.js', 'description': 'Runtime JavaScript', 'category': 'Backend', 'color': 'green'},
            {'name': 'Python', 'description': 'Linguagem versátil', 'category': 'Backend', 'color': 'yellow'},
            {'name': 'Java', 'description': 'Linguagem enterprise', 'category': 'Backend', 'color': 'orange'},
            {'name': 'C#', 'description': 'Linguagem Microsoft', 'category': 'Backend', 'color': 'purple'},
            {'name': 'PostgreSQL', 'description': 'Banco relacional', 'category': 'Database', 'color': 'blue'},
            {'name': 'MongoDB', 'description': 'Banco NoSQL', 'category': 'Database', 'color': 'green'},
            {'name': 'Docker', 'description': 'Containerização', 'category': 'DevOps', 'color': 'blue'},
            {'name': 'Kubernetes', 'description': 'Orquestração', 'category': 'DevOps', 'color': 'blue'},
            {'name': 'AWS', 'description': 'Amazon Web Services', 'category': 'Cloud', 'color': 'orange'},
            {'name': 'Azure', 'description': 'Microsoft Cloud', 'category': 'Cloud', 'color': 'blue'},
            {'name': 'GCP', 'description': 'Google Cloud', 'category': 'Cloud', 'color': 'red'}
        ]

        for tech_data in technologies_data:
            if not Technology.query.filter_by(name=tech_data['name']).first():
                technology = Technology(**tech_data)
                db.session.add(technology)

        # Seed Tags
        tags_data = [
            {'name': 'Urgente', 'description': 'Vaga com urgência', 'color': 'red'},
            {'name': 'Destaque', 'description': 'Vaga em destaque', 'color': 'yellow'},
            {'name': 'Novo', 'description': 'Vaga recém publicada', 'color': 'green'},
            {'name': 'Home Office', 'description': 'Trabalho remoto', 'color': 'blue'},
            {'name': 'PJ', 'description': 'Pessoa Jurídica', 'color': 'purple'},
            {'name': 'CLT', 'description': 'Carteira assinada', 'color': 'cyan'},
            {'name': 'Temporário', 'description': 'Contrato temporário', 'color': 'orange'},
            {'name': 'Efetivo', 'description': 'Contrato efetivo', 'color': 'green'}
        ]

        for tag_data in tags_data:
            if not Tag.query.filter_by(name=tag_data['name']).first():
                tag = Tag(**tag_data)
                db.session.add(tag)

        db.session.commit()

        return jsonify({
            'message': 'Dados de configuração populados com sucesso',
            'areas': JobArea.query.count(),
            'levels': ExperienceLevel.query.count(),
            'modalities': WorkModality.query.count(),
            'softwares': Software.query.count(),
            'technologies': Technology.query.count(),
            'tags': Tag.query.count()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
