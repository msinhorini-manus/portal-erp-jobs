"""
Company model for Portal ERP Jobs
"""
from datetime import datetime
from src.config import db

class CompanyStatus:
    """Company status constants"""
    PENDING = 'pending'  # Aguardando aprovação do admin
    APPROVED = 'approved'  # Aprovada e ativa
    REJECTED = 'rejected'  # Rejeitada pelo admin
    SUSPENDED = 'suspended'  # Suspensa temporariamente

class Company(db.Model):
    """Company profile model"""
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)

    # Company Info
    company_name = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(18), unique=True)
    description = db.Column(db.Text)
    website = db.Column(db.String(500))
    logo_url = db.Column(db.String(500))

    # Company Details
    company_size = db.Column(db.String(50))  # 1-10, 11-50, 51-200, 201-500, 500+
    sector = db.Column(db.String(100))
    establishment_date = db.Column(db.Date)

    # Location
    street_address = db.Column(db.String(200))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    country = db.Column(db.String(50), default='Brasil')
    zip_code = db.Column(db.String(10))

    # Contact
    phone = db.Column(db.String(20))

    # Approval Status (Admin controlled)
    status = db.Column(db.String(20), default=CompanyStatus.PENDING)
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    # Membership & Limits (Admin controlled)
    is_member = db.Column(db.Boolean, default=False)  # Se é empresa membro do Portal ERP
    max_active_jobs = db.Column(db.Integer, default=3)  # Limite de vagas ativas (padrão: 3)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    jobs = db.relationship('Job', backref='company', cascade='all, delete-orphan')
    approver = db.relationship('Admin', foreign_keys=[approved_by])

    def is_approved(self):
        """Check if company is approved"""
        return self.status == CompanyStatus.APPROVED

    def is_pending(self):
        """Check if company is pending approval"""
        return self.status == CompanyStatus.PENDING

    def approve(self, admin_id):
        """Approve the company"""
        self.status = CompanyStatus.APPROVED
        self.approved_at = datetime.utcnow()
        self.approved_by = admin_id
        self.rejection_reason = None

    def reject(self, admin_id, reason):
        """Reject the company"""
        self.status = CompanyStatus.REJECTED
        self.approved_by = admin_id
        self.rejection_reason = reason

    def suspend(self, reason):
        """Suspend the company"""
        self.status = CompanyStatus.SUSPENDED
        self.rejection_reason = reason

    def to_dict(self, include_details=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'logo_url': self.logo_url,
            'company_size': self.company_size,
            'sector': self.sector,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'website': self.website,
            'status': self.status,
            'is_member': self.is_member,
            'max_active_jobs': self.max_active_jobs,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_details:
            data['cnpj'] = self.cnpj
            data['description'] = self.description
            data['establishment_date'] = self.establishment_date.isoformat() if self.establishment_date else None
            data['street_address'] = self.street_address
            data['zip_code'] = self.zip_code
            data['phone'] = self.phone
            data['approved_at'] = self.approved_at.isoformat() if self.approved_at else None
            data['rejection_reason'] = self.rejection_reason
            data['updated_at'] = self.updated_at.isoformat() if self.updated_at else None

        return data
