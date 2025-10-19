from datetime import datetime
from src.config import db

class Education(db.Model):
    """Modelo para formação acadêmica do currículo"""
    __tablename__ = 'educations'
    
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Dados da formação
    degree_name = db.Column(db.String(200), nullable=False)  # Grau (Bacharelado, Mestrado, etc.)
    major = db.Column(db.String(200), nullable=False)  # Área de estudo/curso
    institution_name = db.Column(db.String(200), nullable=False)  # Instituição
    start_date = db.Column(db.Date)  # Data de início
    completion_date = db.Column(db.Date)  # Data de conclusão
    grade = db.Column(db.String(50))  # Nota/conceito
    
    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento
    candidate = db.relationship('Candidate', backref=db.backref('educations', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Converte o objeto para dicionário"""
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'degree_name': self.degree_name,
            'major': self.major,
            'institution_name': self.institution_name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'grade': self.grade,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Education {self.degree_name} in {self.major} from {self.institution_name}>'

