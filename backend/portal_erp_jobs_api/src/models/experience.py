from datetime import datetime
from src.config import db

class Experience(db.Model):
    """Modelo para experiências profissionais do currículo"""
    __tablename__ = 'experiences'
    
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Dados da experiência
    job_title = db.Column(db.String(200), nullable=False)  # Cargo
    company_name = db.Column(db.String(200), nullable=False)  # Empresa
    city = db.Column(db.String(200))  # Cidade
    state = db.Column(db.String(200))  # Estado
    country = db.Column(db.String(200))  # País
    start_date = db.Column(db.Date)  # Data de início
    end_date = db.Column(db.Date)  # Data de término
    is_current_job = db.Column(db.Boolean, default=False)  # Trabalho atual
    description = db.Column(db.Text)  # Descrição das responsabilidades
    
    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento
    candidate = db.relationship('Candidate', backref=db.backref('experiences', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'job_title': self.job_title,
            'company_name': self.company_name,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_current_job': self.is_current_job,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Experience {self.job_title} at {self.company_name}>'

