"""Editorial email-template records and immutable published versions."""
from datetime import datetime

from sqlalchemy import event

from src.config import db


class EmailTemplate(db.Model):
    """One authorized catalog entry for one regional site and content locale.

    The identity columns are immutable at the service layer. Draft fields are
    intentionally kept on the parent row so optimistic revision checks can be
    performed with one compare-and-swap UPDATE.
    """

    __tablename__ = "email_templates"
    __table_args__ = (
        db.UniqueConstraint(
            "site_id", "locale", "key", name="uq_email_templates_site_locale_key"
        ),
        db.Index("ix_email_templates_site_updated", "site_id", "updated_at"),
        db.Index("ix_email_templates_site_locale", "site_id", "locale"),
    )

    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    locale = db.Column(db.String(35), nullable=False)
    key = db.Column(db.String(120), nullable=False)
    event = db.Column(db.String(120), nullable=False)
    audience = db.Column(db.String(80), nullable=False)
    country_code = db.Column(db.String(2), nullable=True)

    is_inactive = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    revision = db.Column(db.Integer, nullable=False, default=0, server_default="0")

    draft_name = db.Column(db.String(255), nullable=True)
    draft_subject = db.Column(db.String(255), nullable=True)
    draft_html = db.Column(db.Text, nullable=True)
    draft_text = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
    )

    site = db.relationship("Site", backref=db.backref("email_templates", lazy="dynamic"))
    updated_by_admin = db.relationship("Admin", foreign_keys=[updated_by_admin_id])
    versions = db.relationship(
        "EmailTemplateVersion",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="EmailTemplateVersion.version.desc()",
        lazy="selectin",
    )

    @property
    def has_draft(self):
        return all(
            value is not None
            for value in (
                self.draft_name,
                self.draft_subject,
                self.draft_html,
                self.draft_text,
            )
        )

    @property
    def latest_version(self):
        return self.versions[0] if self.versions else None

    @property
    def status(self):
        if self.is_inactive:
            return "inactive"
        if self.latest_version and self.has_draft:
            return "published_with_draft"
        if self.latest_version:
            return "published"
        return "draft"


class EmailTemplateVersion(db.Model):
    """An immutable snapshot created by an explicit publish operation."""

    __tablename__ = "email_template_versions"
    __table_args__ = (
        db.UniqueConstraint("template_id", "version", name="uq_email_template_versions_template_version"),
        db.Index("ix_email_template_versions_template_published", "template_id", "published_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(
        db.Integer,
        db.ForeignKey("email_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    html = db.Column(db.Text, nullable=False)
    text = db.Column(db.Text, nullable=False)
    source_revision = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    published_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    author_admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
    )

    template = db.relationship("EmailTemplate", back_populates="versions")
    author = db.relationship("Admin", foreign_keys=[author_admin_id])


@event.listens_for(EmailTemplateVersion, "before_update")
def _reject_version_update(_mapper, _connection, _target):
    raise ValueError("email template versions are immutable")


@event.listens_for(EmailTemplateVersion, "before_delete")
def _reject_version_delete(_mapper, _connection, _target):
    raise ValueError("email template versions are immutable")
