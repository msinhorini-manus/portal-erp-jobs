"""
Candidate model for Portal ERP Jobs
"""
from datetime import datetime
from src.config import db

class Candidate(db.Model):
    """Candidate profile model"""
    __tablename__ = 'candidates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Personal Info
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    photo_url = db.Column(db.String(500))
    
    # Location
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    country = db.Column(db.String(50), default='Brasil')
    
    # Professional Info
    current_title = db.Column(db.String(100))
    professional_summary = db.Column(db.Text)
    years_experience = db.Column(db.Integer)
    
    # Salary
    current_salary = db.Column(db.Float)
    expected_salary = db.Column(db.Float)
    salary_currency = db.Column(db.String(10), default='BRL')
    
    # Links
    linkedin_url = db.Column(db.String(500))
    github_url = db.Column(db.String(500))
    portfolio_url = db.Column(db.String(500))
    resume_url = db.Column(db.String(500))
    
    # Status
    is_actively_looking = db.Column(db.Boolean, default=True)
    available_immediately = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    skills = db.relationship('CandidateSkill', backref='candidate', cascade='all, delete-orphan')
    applications = db.relationship('Application', backref='candidate', cascade='all, delete-orphan')
    
    def to_dict(self, include_details=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'phone': self.phone,
            'photo_url': self.photo_url,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'current_title': self.current_title,
            'years_experience': self.years_experience,
            'expected_salary': self.expected_salary,
            'salary_currency': self.salary_currency,
            'linkedin_url': self.linkedin_url,
            'github_url': self.github_url,
            'portfolio_url': self.portfolio_url,
            'is_actively_looking': self.is_actively_looking,
            'available_immediately': self.available_immediately,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_details:
            data['professional_summary'] = self.professional_summary
            data['current_salary'] = self.current_salary
            data['resume_url'] = self.resume_url
            data['skills'] = [skill.to_dict() for skill in self.skills]
            data['experiences'] = [exp.to_dict() for exp in self.experiences]
            data['educations'] = [edu.to_dict() for edu in self.educations]
        
        return data


class CandidateSkill(db.Model):
    """Candidate skills with proficiency levels"""
    __tablename__ = 'candidate_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    proficiency_level = db.Column(db.Integer, default=3)  # 1-5
    
    def to_dict(self):
        return {
            'id': self.id,
            'skill_id': self.skill_id,
            'skill_name': self.skill.name if self.skill else None,
            'proficiency_level': self.proficiency_level
        }


