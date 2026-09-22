"""Persistent JWT session families used for rotating refresh tokens."""
from __future__ import annotations

import uuid
from datetime import datetime

from src.config import db


class SessionFamily(db.Model):
    """A revocable chain containing one current refresh token at a time."""

    __tablename__ = "auth_session_families"
    __table_args__ = (
        db.Index("ix_auth_session_families_user_active", "user_id", "revoked_at"),
        db.Index("ix_auth_session_families_site_expires", "site_id", "expires_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    site_id = db.Column(
        db.Integer,
        db.ForeignKey("sites.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    family_id = db.Column(
        db.String(36),
        nullable=False,
        unique=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )
    current_refresh_jti = db.Column(db.String(36), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    user_agent_hash = db.Column(db.String(64), nullable=True)
    ip_prefix = db.Column(db.String(64), nullable=True)

    user = db.relationship(
        "User",
        backref=db.backref("session_families", lazy="dynamic", cascade="all, delete-orphan"),
    )
    site = db.relationship("Site")

    def revoke(self, *, when: datetime | None = None) -> None:
        """Revoke this family idempotently."""
        if self.revoked_at is None:
            self.revoked_at = when or datetime.utcnow()
        self.updated_at = when or datetime.utcnow()

    def is_valid(self, *, when: datetime | None = None) -> bool:
        """Return whether the family may authenticate a request."""
        now = when or datetime.utcnow()
        return self.revoked_at is None and self.expires_at > now

    def accepts_refresh_jti(self, jti: str | None) -> bool:
        """Only the most recently issued refresh token is accepted."""
        return bool(jti) and self.current_refresh_jti == jti and self.is_valid()

    def rotate(self, old_jti: str, new_jti: str, expires_at: datetime) -> bool:
        """Advance the refresh chain, or revoke it when reuse is detected."""
        if not self.accepts_refresh_jti(old_jti):
            self.revoke()
            return False
        self.current_refresh_jti = new_jti
        self.expires_at = expires_at
        self.updated_at = datetime.utcnow()
        return True

    @classmethod
    def revoke_all_for_user(cls, user_id: int, *, when: datetime | None = None) -> int:
        """Revoke every currently active family for a user."""
        revoked_at = when or datetime.utcnow()
        return (
            cls.query.filter_by(user_id=user_id, revoked_at=None)
            .update(
                {"revoked_at": revoked_at, "updated_at": revoked_at},
                synchronize_session=False,
            )
        )
