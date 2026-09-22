"""
CompanyUser model for Portal ERP Jobs
Allows multiple users per company with different roles
"""
from datetime import datetime
from src.config import db

class CompanyUserRole:
    """Company user role constants"""
    OWNER = 'owner'  # Full access, can manage other users
    ADMIN = 'admin'  # Can manage jobs and view all data
    HR = 'hr'  # Can manage jobs and candidates
    VIEWER = 'viewer'  # Read-only access

class CompanyUser(db.Model):
    """Company User model - links users to companies with roles"""
    __tablename__ = 'company_users'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Role and permissions
    role = db.Column(db.String(50), default=CompanyUserRole.VIEWER)

    # Profile within company
    name = db.Column(db.String(255), nullable=False)
    position = db.Column(db.String(100), nullable=True)  # Job title within company
    phone = db.Column(db.String(20), nullable=True)

    # Status
    is_active = db.Column(db.Boolean, default=True)

    # Invitation
    invited_by = db.Column(db.Integer, db.ForeignKey('company_users.id'), nullable=True)
    invitation_accepted = db.Column(db.Boolean, default=False)
    invitation_token = db.Column(db.String(255), nullable=True)
    invitation_expires = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = db.relationship('Company', backref='company_users')
    user = db.relationship('User', backref='company_memberships')

    # Unique constraint: one user can only be in a company once
    __table_args__ = (
        db.UniqueConstraint('company_id', 'user_id', name='unique_company_user'),
    )

    def can_manage_jobs(self):
        """Check if user can manage jobs"""
        return self.role in [CompanyUserRole.OWNER, CompanyUserRole.ADMIN, CompanyUserRole.HR]

    def can_manage_users(self):
        """Check if user can manage other company users"""
        return self.role in [CompanyUserRole.OWNER, CompanyUserRole.ADMIN]

    def can_view_candidates(self):
        """Check if user can view candidates"""
        return self.role in [CompanyUserRole.OWNER, CompanyUserRole.ADMIN, CompanyUserRole.HR]

    def is_owner(self):
        """Check if user is the company owner"""
        return self.role == CompanyUserRole.OWNER

    def __repr__(self):
        return f'<CompanyUser {self.name} ({self.role}) @ Company {self.company_id}>'

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'user_id': self.user_id,
            'role': self.role,
            'name': self.name,
            'position': self.position,
            'phone': self.phone,
            'is_active': self.is_active,
            'invitation_accepted': self.invitation_accepted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
