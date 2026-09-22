"""Company and regional company-presence models for Portal ERP Jobs."""
from datetime import datetime

from src.config import db


class CompanyStatus:
    """Regional company status constants."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

    ALL = (PENDING, APPROVED, REJECTED, SUSPENDED)


class Company(db.Model):
    """Global legal identity for a company."""

    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)

    company_name = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(18), unique=True)
    description = db.Column(db.Text)
    website = db.Column(db.String(500))
    logo_url = db.Column(db.String(500))
    company_size = db.Column(db.String(50))
    sector = db.Column(db.String(100))
    establishment_date = db.Column(db.Date)
    street_address = db.Column(db.String(200))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    country = db.Column(db.String(50), default="Brasil")
    zip_code = db.Column(db.String(10))
    phone = db.Column(db.String(20))

    # Legacy global fields kept during the transition. CompanySite is authoritative.
    status = db.Column(db.String(20), default=CompanyStatus.PENDING)
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey("admins.id"), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    is_member = db.Column(db.Boolean, default=False)
    max_active_jobs = db.Column(db.Integer, default=3)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = db.relationship("Job", backref="company", cascade="all, delete-orphan")
    approver = db.relationship("Admin", foreign_keys=[approved_by])
    site_memberships = db.relationship(
        "CompanySite",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def to_dict(self, include_details=False, site_membership=None):
        """Return a private company DTO with optional regional overrides."""
        regional = site_membership
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "company_name": regional.display_name if regional and regional.display_name else self.company_name,
            "logo_url": regional.logo_url if regional and regional.logo_url is not None else self.logo_url,
            "company_size": regional.company_size if regional and regional.company_size is not None else self.company_size,
            "sector": regional.sector if regional and regional.sector is not None else self.sector,
            "city": regional.city if regional and regional.city is not None else self.city,
            "state": regional.state if regional and regional.state is not None else self.state,
            "country": regional.country if regional and regional.country is not None else self.country,
            "website": regional.website if regional and regional.website is not None else self.website,
            "status": regional.status if regional else self.status,
            "is_member": regional.is_member if regional else self.is_member,
            "max_active_jobs": regional.max_active_jobs if regional else self.max_active_jobs,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if regional:
            data["site_code"] = regional.site.code if regional.site else None

        if include_details:
            data.update(
                {
                    "cnpj": self.cnpj,
                    "description": regional.description if regional and regional.description is not None else self.description,
                    "establishment_date": self.establishment_date.isoformat() if self.establishment_date else None,
                    "street_address": regional.street_address if regional and regional.street_address is not None else self.street_address,
                    "zip_code": regional.zip_code if regional and regional.zip_code is not None else self.zip_code,
                    "phone": self.phone,
                    "approved_at": regional.approved_at.isoformat() if regional and regional.approved_at else None,
                    "rejection_reason": regional.approval_reason if regional else self.rejection_reason,
                    "updated_at": self.updated_at.isoformat() if self.updated_at else None,
                }
            )
        return data

    def to_public_dict(self, site_membership):
        """Return the public, site-scoped company projection."""
        data = self.to_dict(include_details=False, site_membership=site_membership)
        data.pop("user_id", None)
        data.pop("max_active_jobs", None)
        data.pop("is_member", None)
        data["description"] = site_membership.description or self.description
        return data


class CompanySite(db.Model):
    """Commercial and public presence of one company in one regional site."""

    __tablename__ = "company_sites"
    __table_args__ = (
        db.UniqueConstraint("company_id", "site_id", name="uq_company_sites_company_site"),
        db.CheckConstraint(
            "status IN ('pending','approved','rejected','suspended')",
            name="ck_company_sites_status",
        ),
        db.CheckConstraint("max_active_jobs >= 0", name="ck_company_sites_job_limit"),
        db.Index("ix_company_sites_site_status_name", "site_id", "status", "display_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status = db.Column(db.String(20), nullable=False, default=CompanyStatus.PENDING)
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey("admins.id"), nullable=True)
    approval_reason = db.Column(db.Text, nullable=True)
    is_member = db.Column(db.Boolean, nullable=False, default=False)
    max_active_jobs = db.Column(db.Integer, nullable=False, default=3)

    display_name = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    website = db.Column(db.String(500), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    company_size = db.Column(db.String(50), nullable=True)
    sector = db.Column(db.String(100), nullable=True)
    street_address = db.Column(db.String(200), nullable=True)
    city = db.Column(db.String(50), nullable=True)
    state = db.Column(db.String(50), nullable=True)
    country = db.Column(db.String(50), nullable=True)
    zip_code = db.Column(db.String(10), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship("Company", back_populates="site_memberships")
    site = db.relationship("Site")
    approver = db.relationship("Admin", foreign_keys=[approved_by])

    @property
    def is_approved(self):
        return self.status == CompanyStatus.APPROVED

    def approve(self, admin_id):
        self.status = CompanyStatus.APPROVED
        self.approved_at = datetime.utcnow()
        self.approved_by = admin_id
        self.approval_reason = None

    def reject(self, admin_id, reason):
        self.status = CompanyStatus.REJECTED
        self.approved_at = datetime.utcnow()
        self.approved_by = admin_id
        self.approval_reason = reason

    def suspend(self, admin_id, reason):
        self.status = CompanyStatus.SUSPENDED
        self.approved_at = datetime.utcnow()
        self.approved_by = admin_id
        self.approval_reason = reason

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "site_code": self.site.code if self.site else None,
            "status": self.status,
            "is_member": self.is_member,
            "max_active_jobs": self.max_active_jobs,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "approval_reason": self.approval_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
