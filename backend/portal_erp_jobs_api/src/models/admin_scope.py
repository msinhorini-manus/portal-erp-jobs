"""Regional assignments and immutable audit events for platform administrators."""
from datetime import datetime

from src.config import db


class AdminSite(db.Model):
    """Explicitly authorizes one administrator to operate one regional site."""

    __tablename__ = "admin_sites"
    __table_args__ = (
        db.UniqueConstraint("admin_id", "site_id", name="uq_admin_sites_admin_site"),
        db.Index("ix_admin_sites_site_active", "site_id", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id", ondelete="CASCADE"),
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
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    admin = db.relationship("Admin", back_populates="site_assignments")
    site = db.relationship("Site")

    def to_dict(self):
        return {
            "site_code": self.site.code if self.site else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AdminAuditEvent(db.Model):
    """Append-only record of successful administrative mutations."""

    __tablename__ = "admin_audit_events"
    __table_args__ = (
        db.Index("ix_admin_audit_events_site_created", "site_id", "created_at"),
        db.Index("ix_admin_audit_events_actor_created", "actor_admin_id", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    actor_admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action = db.Column(db.String(120), nullable=False)
    target_type = db.Column(db.String(80), nullable=False)
    target_id = db.Column(db.String(80), nullable=True)
    details = db.Column(db.JSON, nullable=False, default=dict)
    ip_prefix = db.Column(db.String(64), nullable=True)
    user_agent_hash = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    site = db.relationship("Site")
    actor = db.relationship("Admin")

    def to_dict(self):
        return {
            "id": self.id,
            "site_id": self.site_id,
            "actor_admin_id": self.actor_admin_id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "details": self.details or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
