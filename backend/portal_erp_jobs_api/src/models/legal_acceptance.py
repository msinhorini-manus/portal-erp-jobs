"""Versioned legal-document acceptances recorded at account creation."""
from datetime import datetime

from src.config import db


class LegalAcceptance(db.Model):
    __tablename__ = "legal_acceptances"
    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "site_id",
            "document_type",
            "document_version",
            name="uq_legal_acceptance_user_site_document_version",
        ),
        db.CheckConstraint(
            "document_type IN ('terms','privacy')",
            name="ck_legal_acceptances_document_type",
        ),
        db.Index("ix_legal_acceptances_user_site", "user_id", "site_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
    )
    document_type = db.Column(db.String(20), nullable=False)
    document_version = db.Column(db.String(20), nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ip_prefix = db.Column(db.String(64), nullable=True)
    user_agent_hash = db.Column(db.String(64), nullable=True)

    user = db.relationship("User", backref=db.backref("legal_acceptances", lazy="select"))
    site = db.relationship("Site")
