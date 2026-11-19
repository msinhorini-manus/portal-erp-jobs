"""Public regional eligibility and name-based catalog counts (read-only SQL).

The general job set deliberately does NOT require a public employer identity.
Name filters preserve the current /api/jobs/?area=... and ?tech=... contracts.
"""
from sqlalchemy import and_, func, literal, or_, select, true, union_all
from sqlalchemy.orm import aliased, joinedload

from src.config import db
from src.models.company import Company, CompanySite, CompanyStatus, company_slug_reservations
from src.models.job import Job, JobSkill, Skill
from src.models.job_area import JobArea
from src.models.user import User
from src.services.jobs import ACTIVE_JOB_STATUSES, text_contains


def public_jobs_query(site):
    """Exactly the existing public job publication predicate, including hidden jobs."""
    return Job.query.join(CompanySite, and_(
        CompanySite.company_id == Job.company_id,
        CompanySite.site_id == Job.site_id,
    )).filter(
        Job.site_id == site.id,
        Job.is_active.is_(True),
        Job.status.in_(ACTIVE_JOB_STATUSES),
        CompanySite.status == CompanyStatus.APPROVED,
        or_(Job.expires_at.is_(None), Job.expires_at > func.current_timestamp()),
    )


def _pattern(value):
    # Reuse the existing normalization and literal LIKE escaping, including
    # %, _, backslashes and accent handling; do not normalize job text in Python.
    return text_contains(Job.title, value).right.value


def _contains(column, pattern):
    # text_contains owns the SQL lower/replace expression as well as escaping.
    return text_contains(column, "").left.like(pattern, escape="\\")


def _technology_predicate(job, pattern):
    return or_(
        job.skills.any(JobSkill.skill.has(_contains(Skill.name, pattern))),
        _contains(job.title, pattern),
        _contains(job.description, pattern),
        _contains(job.requirements, pattern),
    )


def technology_filter(value, *, job=Job):
    return _technology_predicate(job, literal(_pattern(value))) if value else true()


def _area_text_predicate(job, pattern):
    return or_(
        _contains(job.area, pattern),
        job.job_area.has(_contains(JobArea.name, pattern)),
    )


def area_filter(value, *, job=Job):
    if not value:
        return true()
    try:
        return job.area_id == int(value)
    except ValueError:
        return _area_text_predicate(job, literal(_pattern(value)))


def catalog_job_counts(site, entries, *, kind):
    """One grouped SQL aggregate for all returned cards, not one COUNT per card.

    Only catalog names are read in Python. Jobs/descriptions remain in SQL;
    EXISTS avoids M2M duplication and COUNT DISTINCT protects the job identity.
    Technology legacy IDs are never mapped to Skill IDs: names are URL filters.
    """
    if not entries:
        return {}
    if kind not in {"area", "technology"}:
        raise ValueError("Unsupported public catalog kind")
    rows = []
    for entry in entries:
        numeric_id = None
        if kind == "area" and entry.name:
            try:
                numeric_id = int(entry.name)
            except ValueError:
                pass
        rows.append(select(
            literal(entry.id).label("catalog_id"),
            literal(_pattern(entry.name)).label("pattern"),
            literal(numeric_id, type_=db.Integer).label("area_filter_id"),
            literal(not bool(entry.name)).label("no_filter"),
        ))
    catalog = union_all(*rows).subquery("public_catalog_filters")
    eligible = public_jobs_query(site).subquery("eligible_public_jobs")
    job = aliased(Job, eligible)
    if kind == "area":
        predicate = or_(
            catalog.c.no_filter.is_(True),
            and_(catalog.c.area_filter_id.is_not(None), job.area_id == catalog.c.area_filter_id),
            and_(catalog.c.area_filter_id.is_(None), _area_text_predicate(job, catalog.c.pattern)),
        )
    else:
        predicate = or_(catalog.c.no_filter.is_(True), _technology_predicate(job, catalog.c.pattern))
    result = db.session.query(
        catalog.c.catalog_id, func.count(func.distinct(job.id)),
    ).select_from(catalog).outerjoin(job, predicate).group_by(catalog.c.catalog_id).all()
    return {catalog_id: int(count) for catalog_id, count in result}


def public_companies_query(site):
    """Directory identity: approved presence, active owner, valid country reservation.

    Reservation CHECK constraints enforce the frozen valid_slug policy. Matching
    the exact reservation also rejects NULL, foreign-country and unowned slugs.
    The trusted regional site comes exclusively from server-side resolution.
    """
    reserved = select(company_slug_reservations.c.id).where(
        company_slug_reservations.c.company_id == Company.id,
        company_slug_reservations.c.country_code == site.country_code,
        company_slug_reservations.c.slug == CompanySite.public_profile_slug,
    ).exists()
    return db.session.query(Company, CompanySite).join(
        CompanySite, CompanySite.company_id == Company.id,
    ).join(User, User.id == Company.user_id).filter(
        CompanySite.site_id == site.id,
        CompanySite.status == CompanyStatus.APPROVED,
        User.is_active.is_(True),
        CompanySite.public_profile_slug.is_not(None),
        literal(bool(site.is_active)).is_(True),
        reserved,
    )


def public_company_jobs_query(site, company_ids):
    """Only visible public jobs may be associated with public employer cards."""
    eligible_companies = public_companies_query(site).with_entities(Company.id)
    return public_jobs_query(site).filter(
        Job.company_id.in_(company_ids),
        Job.company_id.in_(eligible_companies),
        or_(Job.is_company_hidden.is_(False), Job.is_company_hidden.is_(None)),
    )


def company_job_counts(site, company_ids):
    if not company_ids:
        return {}
    rows = public_company_jobs_query(site, company_ids).with_entities(
        Job.company_id, func.count(func.distinct(Job.id)),
    ).group_by(Job.company_id).all()
    # A successful grouped query legitimately has no row for zero-job companies.
    counts = {company_id: 0 for company_id in company_ids}
    counts.update({company_id: int(count) for company_id, count in rows})
    return counts


def directory_loading_options():
    return (joinedload(Company.user), joinedload(CompanySite.site))


class VerifiedPublicMembership:
    """Read-only DTO adapter for a membership verified by public_companies_query.

    Preserve the model's public projection while avoiding a reservation lookup
    for every directory card. Never use for private or unverified memberships.
    """
    def __init__(self, membership):
        self._membership = membership
        self.resolved_public_profile_slug = membership.public_profile_slug

    def __getattr__(self, name):
        return getattr(self._membership, name)
