"""Company team invitations and immutable audit records."""
from datetime import datetime

from src.config import db


class CompanyInvitationStatus:
    PENDING = "pending"
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    ALL = (PENDING, ACCEPTED, CANCELLED, EXPIRED)


class CompanyInvitation(db.Model):
    __tablename__ = "company_invitations"
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('pending','accepted','cancelled','expired')",
            name="ck_company_invitations_status",
        ),
        db.CheckConstraint(
            "role IN ('owner','admin','hr','viewer')",
            name="ck_company_invitations_role",
        ),
        db.Index("ix_company_invitations_company_status", "company_id", "status"),
        db.Index("ix_company_invitations_email", "email"),
    )

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
    )
    email = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    position = db.Column(db.String(100), nullable=True)
    token_hash = db.Column(db.String(64), nullable=False, unique=True)
    status = db.Column(db.String(20), nullable=False, default=CompanyInvitationStatus.PENDING)
    expires_at = db.Column(db.DateTime, nullable=False)
    invited_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    accepted_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    accepted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = db.relationship("Company")
    site = db.relationship("Site")

    def is_pending(self):
        return self.status == CompanyInvitationStatus.PENDING and self.expires_at > datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "position": self.position,
            "status": self.status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CompanyAuditEvent(db.Model):
    __tablename__ = "company_audit_events"
    __table_args__ = (
        db.Index("ix_company_audit_events_company_created", "company_id", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
    )
    actor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type = db.Column(db.String(80), nullable=False)
    details = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "actor_user_id": self.actor_user_id,
            "target_user_id": self.target_user_id,
            "event_type": self.event_type,
            "details": self.details or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
