"""
Job model for Portal ERP Jobs
"""
from datetime import datetime
from src.config import db

class Job(db.Model):
    """Job posting model"""
    __tablename__ = 'jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # Job Info
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text)
    responsibilities = db.Column(db.Text)
    
    # Job Details
    seniority_level = db.Column(db.String(20))  # junior, pleno, senior, tech_lead, etc
    work_modality = db.Column(db.String(20))  # remote, hybrid, onsite
    contract_type = db.Column(db.String(20))  # clt, pj, freelance, internship
    
    # Salary
    min_salary = db.Column(db.Float)
    max_salary = db.Column(db.Float)
    salary_currency = db.Column(db.String(10), default='BRL')
    
    # Location
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    country = db.Column(db.String(50), default='Brasil')
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_company_hidden = db.Column(db.Boolean, default=False)
    
    # Dates
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    # Relationships
    skills = db.relationship('JobSkill', backref='job', cascade='all, delete-orphan')
    applications = db.relationship('Application', backref='job', cascade='all, delete-orphan')
    
    def to_dict(self, include_details=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'company_id': self.company_id,
            'title': self.title,
            'seniority_level': self.seniority_level,
            'work_modality': self.work_modality,
            'contract_type': self.contract_type,
            'min_salary': self.min_salary,
            'max_salary': self.max_salary,
            'salary_currency': self.salary_currency,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'is_active': self.is_active,
            'is_company_hidden': self.is_company_hidden,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_details:
            data['description'] = self.description
            data['requirements'] = self.requirements
            data['responsibilities'] = self.responsibilities
            data['expires_at'] = self.expires_at.isoformat() if self.expires_at else None
            data['skills'] = [skill.to_dict() for skill in self.skills]
            data['company'] = self.company.to_dict() if self.company and not self.is_company_hidden else None
        
        return data


class JobSkill(db.Model):
    """Required skills for jobs"""
    __tablename__ = 'job_skills'
    
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    is_required = db.Column(db.Boolean, default=False)
    proficiency_level = db.Column(db.Integer, default=3)  # 1-5
    
    def to_dict(self):
        return {
            'id': self.id,
            'skill_id': self.skill_id,
            'skill_name': self.skill.name if self.skill else None,
            'is_required': self.is_required,
            'proficiency_level': self.proficiency_level
        }


class Skill(db.Model):
    """Skills/Technologies catalog"""
    __tablename__ = 'skills'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    category = db.Column(db.String(50))  # language, framework, tool, database, cloud, etc
    
    # Relationships
    candidate_skills = db.relationship('CandidateSkill', backref='skill')
    job_skills = db.relationship('JobSkill', backref='skill')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category
        }

