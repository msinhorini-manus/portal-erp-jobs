from datetime import datetime
from src.config import db

class Project(db.Model):
    """Modelo para projetos do currículo"""
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Dados do projeto
    name = db.Column(db.String(200), nullable=False)  # Nome do projeto
    description = db.Column(db.Text, nullable=False)  # Descrição do projeto
    role = db.Column(db.String(200))  # Papel no projeto
    technologies = db.Column(db.Text)  # Tecnologias utilizadas (JSON string ou comma-separated)
    start_date = db.Column(db.Date)  # Data de início
    end_date = db.Column(db.Date)  # Data de término
    is_current = db.Column(db.Boolean, default=False)  # Projeto em andamento
    project_url = db.Column(db.String(500))  # URL do projeto (GitHub, site, etc.)
    repository_url = db.Column(db.String(500))  # URL do repositório
    
    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento
    candidate = db.relationship('Candidate', backref=db.backref('projects', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'name': self.name,
            'description': self.description,
            'role': self.role,
            'technologies': self.technologies,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_current': self.is_current,
            'project_url': self.project_url,
            'repository_url': self.repository_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Project {self.name}>'

