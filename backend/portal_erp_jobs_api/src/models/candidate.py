"""Candidate and regional candidate-presence models for Portal ERP Jobs."""
from datetime import datetime

from src.config import db


class Candidate(db.Model):
    """Global professional identity and private resume dossier."""

    __tablename__ = "candidates"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    first_name = db.Column(db.String(50), nullable=False, default="Nome")
    last_name = db.Column(db.String(50), nullable=False, default="Pendente")
    phone = db.Column(db.String(20))
    photo_url = db.Column(db.String(500))
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    country = db.Column(db.String(50), default="Brasil")
    current_title = db.Column(db.String(100))
    professional_summary = db.Column(db.Text)
    years_experience = db.Column(db.Integer)
    current_salary = db.Column(db.Float)
    expected_salary = db.Column(db.Float)
    salary_currency = db.Column(db.String(10), default="BRL")
    linkedin_url = db.Column(db.String(500))
    github_url = db.Column(db.String(500))
    portfolio_url = db.Column(db.String(500))
    resume_url = db.Column(db.String(500))

    # Legacy mirrors retained while the SPA is migrated. CandidateSite is authoritative.
    is_actively_looking = db.Column(db.Boolean, default=True)
    available_immediately = db.Column(db.Boolean, default=True)
    curriculo_publico = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    skills = db.relationship("CandidateSkill", backref="candidate", cascade="all, delete-orphan")
    applications = db.relationship(
        "Application",
        backref="candidate",
        cascade="all, delete-orphan",
        foreign_keys="Application.candidate_id",
    )
    site_memberships = db.relationship(
        "CandidateSite",
        back_populates="candidate",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def to_dict(self, include_details=False, site_membership=None):
        regional = site_membership
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": f"{self.first_name} {self.last_name}",
            "phone": self.phone,
            "photo_url": self.photo_url,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "current_title": self.current_title,
            "years_experience": self.years_experience,
            "expected_salary": regional.expected_salary if regional and regional.expected_salary is not None else self.expected_salary,
            "salary_currency": regional.salary_currency if regional and regional.salary_currency else self.salary_currency,
            "linkedin_url": self.linkedin_url,
            "github_url": self.github_url,
            "portfolio_url": self.portfolio_url,
            "is_actively_looking": regional.is_actively_looking if regional else self.is_actively_looking,
            "available_immediately": regional.available_immediately if regional else self.available_immediately,
            "curriculo_publico": regional.is_discoverable if regional else self.curriculo_publico,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if regional:
            data["site_code"] = regional.site.code if regional.site else None
        if include_details:
            data.update(
                {
                    "professional_summary": self.professional_summary,
                    "current_salary": self.current_salary,
                    "resume_url": self.resume_url,
                    "skills": [skill.to_dict() for skill in self.skills],
                    "experiences": [exp.to_dict() for exp in self.experiences],
                    "educations": [edu.to_dict() for edu in self.educations],
                }
            )
        return data

    def to_public_dict(self, site_membership):
        """Return a minimum-privilege candidate projection without contact PII."""
        return {
            "id": self.id,
            "name": f"{self.first_name or ''} {self.last_name or ''}".strip() or "Candidato",
            "first_name": self.first_name,
            "last_name": self.last_name,
            "title": self.current_title or "Profissional",
            "current_title": self.current_title,
            "professional_summary": self.professional_summary,
            "photo_url": self.photo_url,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "location": self.city or self.country or "",
            "years_experience": self.years_experience,
            "expected_salary": site_membership.expected_salary,
            "salary_currency": site_membership.salary_currency,
            "linkedin_url": self.linkedin_url,
            "github_url": self.github_url,
            "portfolio_url": self.portfolio_url,
            "is_actively_looking": site_membership.is_actively_looking,
            "available_immediately": site_membership.available_immediately,
            "technologies": [
                {"name": skill.skill_name, "level": skill.proficiency_level}
                for skill in self.skills
            ],
        }


class CandidateSite(db.Model):
    """Visibility and job-search preferences for a candidate in one site."""

    __tablename__ = "candidate_sites"
    __table_args__ = (
        db.UniqueConstraint("candidate_id", "site_id", name="uq_candidate_sites_candidate_site"),
        db.Index("ix_candidate_sites_discovery", "site_id", "is_active", "is_discoverable"),
    )

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(
        db.Integer,
        db.ForeignKey("candidates.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_discoverable = db.Column(db.Boolean, nullable=False, default=False)
    is_actively_looking = db.Column(db.Boolean, nullable=False, default=True)
    available_immediately = db.Column(db.Boolean, nullable=False, default=True)
    expected_salary = db.Column(db.Float, nullable=True)
    salary_currency = db.Column(db.String(10), nullable=False, default="BRL")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = db.relationship("Candidate", back_populates="site_memberships")
    site = db.relationship("Site")

    def to_dict(self):
        return {
            "site_code": self.site.code if self.site else None,
            "is_active": self.is_active,
            "is_discoverable": self.is_discoverable,
            "is_actively_looking": self.is_actively_looking,
            "available_immediately": self.available_immediately,
            "expected_salary": self.expected_salary,
            "salary_currency": self.salary_currency,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CandidateSkill(db.Model):
    """Candidate skills with proficiency levels."""

    __tablename__ = "candidate_skills"

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidates.id"), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id"), nullable=False)
    proficiency_level = db.Column(db.Integer, default=3)

    @property
    def skill_name(self):
        return self.skill.name if self.skill else None

    def to_dict(self):
        return {
            "id": self.id,
            "skill_id": self.skill_id,
            "skill_name": self.skill_name,
            "proficiency_level": self.proficiency_level,
        }
