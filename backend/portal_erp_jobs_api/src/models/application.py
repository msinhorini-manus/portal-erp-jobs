"""Regional job-application models and status audit trail."""
from datetime import datetime

from src.config import db


class ApplicationStatus:
    APPLIED = "applied"
    REVIEWING = "reviewing"
    INTERVIEW = "interview"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

    ALL = (APPLIED, REVIEWING, INTERVIEW, ACCEPTED, REJECTED, WITHDRAWN)
    INPUT_ALIASES = {"pending": APPLIED, "approved": ACCEPTED}
    TRANSITIONS = {
        APPLIED: {REVIEWING, REJECTED, WITHDRAWN},
        REVIEWING: {INTERVIEW, ACCEPTED, REJECTED, WITHDRAWN},
        INTERVIEW: {ACCEPTED, REJECTED, WITHDRAWN},
        ACCEPTED: set(),
        REJECTED: set(),
        WITHDRAWN: set(),
    }

    @classmethod
    def normalize(cls, value):
        normalized = (value or "").strip().lower()
        return cls.INPUT_ALIASES.get(normalized, normalized)


class Application(db.Model):
    """A candidate application scoped to the same site as its job."""

    __tablename__ = "applications"
    __table_args__ = (
        db.UniqueConstraint("job_id", "candidate_id", name="unique_job_candidate"),
        db.UniqueConstraint("id", "site_id", name="uq_applications_id_site"),
        db.CheckConstraint(
            "status IN ('applied','reviewing','interview','accepted','rejected','withdrawn')",
            name="ck_applications_status",
        ),
        db.ForeignKeyConstraint(
            ["job_id", "site_id"],
            ["jobs.id", "jobs.site_id"],
            name="fk_applications_job_site",
            ondelete="RESTRICT",
        ),
        db.ForeignKeyConstraint(
            ["candidate_id", "site_id"],
            ["candidate_sites.candidate_id", "candidate_sites.site_id"],
            name="fk_applications_candidate_site",
            ondelete="RESTRICT",
        ),
        db.Index("ix_applications_site_candidate_applied", "site_id", "candidate_id", "applied_at"),
        db.Index("ix_applications_site_job_status", "site_id", "job_id", "status", "applied_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id"), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidates.id"), nullable=False)
    site_id = db.Column(db.Integer, db.ForeignKey("sites.id", ondelete="RESTRICT"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=ApplicationStatus.APPLIED)
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    site = db.relationship("Site")
    status_events = db.relationship(
        "ApplicationStatusEvent",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusEvent.changed_at",
    )

    def can_transition_to(self, requested_status):
        target = ApplicationStatus.normalize(requested_status)
        return target in ApplicationStatus.TRANSITIONS.get(self.status, set())

    def transition_to(self, requested_status, actor_user_id, actor_role, reason=None):
        target = ApplicationStatus.normalize(requested_status)
        if not self.can_transition_to(target):
            raise ValueError(f"invalid application transition: {self.status} -> {target}")
        previous = self.status
        self.status = target
        self.updated_at = datetime.utcnow()
        event = ApplicationStatusEvent(
            application=self,
            from_status=previous,
            to_status=target,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            reason=reason,
        )
        db.session.add(event)
        return event

    def add_created_event(self, actor_user_id, actor_role="candidate"):
        event = ApplicationStatusEvent(
            application=self,
            from_status=None,
            to_status=self.status,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
        )
        db.session.add(event)
        return event

    def to_dict(self, include_history=False):
        data = {
            "id": self.id,
            "job_id": self.job_id,
            "candidate_id": self.candidate_id,
            "site_code": self.site.code if self.site else None,
            "status": self.status,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_history:
            data["history"] = [event.to_dict() for event in self.status_events]
        return data


class ApplicationStatusEvent(db.Model):
    """Append-only status history for a job application."""

    __tablename__ = "application_status_events"
    __table_args__ = (
        db.CheckConstraint(
            "from_status IS NULL OR from_status IN ('applied','reviewing','interview','accepted','rejected','withdrawn')",
            name="ck_application_events_from_status",
        ),
        db.CheckConstraint(
            "to_status IN ('applied','reviewing','interview','accepted','rejected','withdrawn')",
            name="ck_application_events_to_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(
        db.Integer,
        db.ForeignKey("applications.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    from_status = db.Column(db.String(20), nullable=True)
    to_status = db.Column(db.String(20), nullable=False)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    actor_role = db.Column(db.String(30), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    changed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    application = db.relationship("Application", back_populates="status_events")

    def to_dict(self):
        return {
            "id": self.id,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "actor_role": self.actor_role,
            "reason": self.reason,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
        }
