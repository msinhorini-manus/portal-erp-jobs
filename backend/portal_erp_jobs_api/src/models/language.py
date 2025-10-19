from datetime import datetime
from src.config import db

class Language(db.Model):
    """Modelo para idiomas do currículo"""
    __tablename__ = 'languages'
    
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Dados do idioma
    name = db.Column(db.String(100), nullable=False)  # Nome do idioma
    proficiency = db.Column(db.String(50))  # Nível de proficiência
    can_read = db.Column(db.Boolean, default=True)
    can_write = db.Column(db.Boolean, default=True)
    can_speak = db.Column(db.Boolean, default=True)
    can_listen = db.Column(db.Boolean, default=True)
    
    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento
    candidate = db.relationship('Candidate', backref=db.backref('languages', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'name': self.name,
            'proficiency': self.proficiency,
            'can_read': self.can_read,
            'can_write': self.can_write,
            'can_speak': self.can_speak,
            'can_listen': self.can_listen,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Language {self.name} - {self.proficiency}>'

