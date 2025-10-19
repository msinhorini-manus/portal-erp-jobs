from datetime import datetime
from src.config import db

class Certification(db.Model):
    """Modelo para certificações do currículo"""
    __tablename__ = 'certifications'
    
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Dados da certificação
    name = db.Column(db.String(200), nullable=False)  # Nome da certificação
    issuing_organization = db.Column(db.String(200), nullable=False)  # Organização emissora
    issue_date = db.Column(db.Date)  # Data de emissão
    expiration_date = db.Column(db.Date)  # Data de expiração
    credential_id = db.Column(db.String(200))  # ID da credencial
    credential_url = db.Column(db.String(500))  # URL da credencial
    description = db.Column(db.Text)  # Descrição adicional
    
    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento
    candidate = db.relationship('Candidate', backref=db.backref('certifications', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'name': self.name,
            'issuing_organization': self.issuing_organization,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'credential_id': self.credential_id,
            'credential_url': self.credential_url,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Certification {self.name} from {self.issuing_organization}>'

