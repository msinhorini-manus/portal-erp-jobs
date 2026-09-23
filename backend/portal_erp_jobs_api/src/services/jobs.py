"""Shared validation and lifecycle helpers for regional job CRUD."""
from __future__ import annotations

from datetime import datetime

from flask import jsonify, request

from src.config import db
from src.models.company import CompanySite
from src.models.job import Job, JobSkill, Skill
from src.models.job_area import JobArea


MAX_PAGE_SIZE = 100
JOB_STATUSES = {"active", "approved", "pending", "rejected", "closed", "inactive", "archived"}
ACTIVE_JOB_STATUSES = {"active", "approved"}
WORK_MODALITIES = {"remote", "hybrid", "onsite"}
WORK_MODALITY_ALIASES = {
    "remoto": "remote",
    "híbrido": "hybrid",
    "hibrido": "hybrid",
    "presencial": "onsite",
}
CONTRACT_TYPES = {"clt", "pj", "freelance", "internship", "temporary", "contract"}


def api_error(message, status=400):
    return jsonify({"error": message}), status


def pagination_args(*, default=20):
    """Return bounded positive pagination values or an API error tuple."""
    raw_page = request.args.get("page", "1")
    raw_per_page = request.args.get("per_page", str(default))
    try:
        page = int(raw_page)
        per_page = int(raw_per_page)
    except (TypeError, ValueError):
        return None, None, api_error("Paginação inválida", 400)
    if page < 1 or per_page < 1:
        return None, None, api_error("Paginação deve usar valores positivos", 400)
    return page, min(per_page, MAX_PAGE_SIZE), None


def json_object(request):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, api_error("O corpo da requisição deve ser um objeto JSON", 400)
    return data, None


def _clean_text(value, field, *, required=False, max_length=None):
    if value is None:
        if required:
            raise ValueError(f"{field} é obrigatório")
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} deve ser texto")
    value = value.strip()
    if required and not value:
        raise ValueError(f"{field} é obrigatório")
    if max_length and len(value) > max_length:
        raise ValueError(f"{field} excede {max_length} caracteres")
    return value


def _number(value, field):
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        raise ValueError(f"{field} deve ser numérico")
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} deve ser numérico") from None
    if result < 0:
        raise ValueError(f"{field} não pode ser negativo")
    return result


def _boolean(value, field):
    if not isinstance(value, bool):
        raise ValueError(f"{field} deve ser booleano")
    return value


def desired_active(data, *, current=None):
    """Read compatible activity aliases and reject ambiguous/invalid values."""
    requested = None
    if "is_active" in data:
        requested = _boolean(data["is_active"], "is_active")
    if "status" in data:
        raw_status = data["status"]
        if not isinstance(raw_status, str) or raw_status.strip().lower() not in JOB_STATUSES:
            raise ValueError("status inválido")
        status_active = raw_status.strip().lower() in ACTIVE_JOB_STATUSES
        if requested is not None and requested != status_active:
            raise ValueError("status e is_active são incompatíveis")
        requested = status_active
    return current if requested is None else requested


def validate_job_payload(data, *, partial=False, admin=False):
    """Normalize legacy aliases while validating fields used by current clients."""
    if not isinstance(data, dict):
        raise ValueError("O corpo da requisição deve ser um objeto JSON")

    normalized = {}
    if not partial or "title" in data:
        normalized["title"] = _clean_text(data.get("title"), "Título", required=True, max_length=100)
    if not partial or "description" in data:
        normalized["description"] = _clean_text(
            data.get("description"), "Descrição", required=True, max_length=100000
        )

    text_fields = {
        "requirements": ("requirements", None),
        "responsibilities": ("responsibilities", None),
        "benefits": ("benefits", None),
        "area": ("area", 100),
        "city": ("city", 50),
        "state": ("state", 50),
    }
    for output, (source, limit) in text_fields.items():
        if source in data:
            normalized[output] = _clean_text(data[source], source, max_length=limit)

    aliases = {
        "seniority_level": ("seniority_level", "level", "experience_level"),
        "work_modality": ("work_modality", "work_mode", "modality"),
    }
    for output, names in aliases.items():
        supplied = next((name for name in names if name in data), None)
        if supplied:
            normalized[output] = _clean_text(data[supplied], supplied, max_length=20)

    if "contract_type" in data:
        normalized["contract_type"] = _clean_text(data["contract_type"], "contract_type", max_length=20)

    modality = normalized.get("work_modality")
    if modality:
        modality = WORK_MODALITY_ALIASES.get(modality.lower(), modality.lower())
        normalized["work_modality"] = modality
    if modality and modality not in WORK_MODALITIES:
        raise ValueError("work_modality inválida")
    contract = normalized.get("contract_type")
    if contract:
        contract = contract.lower()
        normalized["contract_type"] = contract
    if contract and contract not in CONTRACT_TYPES:
        raise ValueError("contract_type inválido")

    if "area_id" in data:
        area_id = data["area_id"]
        if area_id in (None, ""):
            normalized["area_id"] = None
        elif isinstance(area_id, bool):
            raise ValueError("area_id inválido")
        else:
            try:
                normalized["area_id"] = int(area_id)
            except (TypeError, ValueError):
                raise ValueError("area_id inválido") from None
            if normalized["area_id"] < 1 or not db.session.get(JobArea, normalized["area_id"]):
                raise ValueError(f"Área com ID {normalized['area_id']} não encontrada")

    salary_aliases = {
        "min_salary": ("min_salary", "salary_min"),
        "max_salary": ("max_salary", "salary_max"),
    }
    for output, names in salary_aliases.items():
        supplied = next((name for name in names if name in data), None)
        if supplied:
            normalized[output] = _number(data[supplied], supplied)

    effective_min = normalized.get("min_salary")
    effective_max = normalized.get("max_salary")
    if effective_min is not None and effective_max is not None and effective_min > effective_max:
        raise ValueError("Salário mínimo não pode exceder o salário máximo")

    if "is_featured" in data:
        if not admin:
            raise ValueError("is_featured só pode ser alterado por administrador")
        normalized["is_featured"] = _boolean(data["is_featured"], "is_featured")

    if "skills" in data and "technologies" in data:
        raise ValueError("Envie apenas skills ou technologies")
    skills_key = "skills" if "skills" in data else "technologies" if "technologies" in data else None
    if skills_key:
        normalized["skills"] = normalize_skills(data[skills_key])

    return normalized


def normalize_skills(items):
    if not isinstance(items, list):
        raise ValueError("skills deve ser uma lista de IDs, nomes ou objetos")
    result = []
    seen = set()
    for item in items:
        required = False
        proficiency = 3
        if isinstance(item, int) and not isinstance(item, bool):
            skill_id = item
        elif isinstance(item, str):
            skill = Skill.query.filter(db.func.lower(Skill.name) == item.strip().lower()).first()
            if not skill:
                raise ValueError(f"Skill '{item}' não encontrada")
            skill_id = skill.id
        elif isinstance(item, dict):
            skill_id = item.get("skill_id", item.get("id"))
            if skill_id is None and item.get("name"):
                skill = Skill.query.filter(
                    db.func.lower(Skill.name) == str(item["name"]).strip().lower()
                ).first()
                skill_id = skill.id if skill else None
            required = item.get("is_required", False)
            proficiency = item.get("proficiency_level", 3)
            if not isinstance(required, bool):
                raise ValueError("is_required deve ser booleano")
        else:
            raise ValueError("Cada skill deve ser um ID, nome ou objeto")
        try:
            skill_id = int(skill_id)
            proficiency = int(proficiency)
        except (TypeError, ValueError):
            raise ValueError("ID ou proficiência de skill inválido") from None
        if skill_id < 1 or not 1 <= proficiency <= 5:
            raise ValueError("ID ou proficiência de skill inválido")
        if skill_id in seen:
            raise ValueError("skills não pode conter IDs duplicados")
        seen.add(skill_id)
        if not db.session.get(Skill, skill_id):
            raise ValueError(f"Skill com ID {skill_id} não encontrada")
        result.append({"skill_id": skill_id, "is_required": required, "proficiency_level": proficiency})
    return result


def replace_skills(job, skills):
    """Replace all job skills; an explicit empty list clears the relation."""
    job.skills[:] = []
    db.session.flush()
    for item in skills:
        job.skills.append(JobSkill(**item))


def company_site_for_job(job):
    return CompanySite.query.filter_by(company_id=job.company_id, site_id=job.site_id).one_or_none()


def ensure_activation_quota(job, company_site=None):
    """Raise on an inactive->active transition that exceeds the site membership quota."""
    membership = (
        CompanySite.query.filter_by(company_id=job.company_id, site_id=job.site_id)
        .with_for_update()
        .one_or_none()
    )
    if not membership:
        raise LookupError("Empresa não disponível neste site")
    active_jobs = Job.query.filter(
        Job.company_id == job.company_id,
        Job.site_id == job.site_id,
        Job.is_active.is_(True),
        Job.id != job.id,
    ).count()
    if active_jobs >= membership.max_active_jobs:
        raise OverflowError("Limite regional de vagas ativas atingido")


def set_job_activity(job, is_active, *, active_status="active", inactive_status="closed", company_site=None):
    is_active = _boolean(is_active, "is_active")
    if is_active and not job.is_active:
        ensure_activation_quota(job, company_site)
    job.is_active = is_active
    job.status = active_status if is_active else inactive_status
    job.updated_at = datetime.utcnow()


def set_job_status(job, status, *, company_site=None):
    if not isinstance(status, str):
        raise ValueError("status inválido")
    normalized = status.strip().lower()
    if normalized not in JOB_STATUSES:
        raise ValueError("status inválido")
    set_job_activity(
        job,
        normalized in ACTIVE_JOB_STATUSES,
        active_status=normalized if normalized in ACTIVE_JOB_STATUSES else "active",
        inactive_status=normalized,
        company_site=company_site,
    )


def archive_job(job):
    """Soft archive a job while preserving applications and their status events."""
    job.is_active = False
    job.status = "archived"
    job.is_featured = False
    job.updated_at = datetime.utcnow()


def apply_job_fields(job, values):
    skills = values.pop("skills", None)
    for field, value in values.items():
        setattr(job, field, value)
    if skills is not None:
        replace_skills(job, skills)
    job.updated_at = datetime.utcnow()


def validate_salary_pair(job, values):
    minimum = values.get("min_salary", job.min_salary)
    maximum = values.get("max_salary", job.max_salary)
    if minimum is not None and maximum is not None and minimum > maximum:
        raise ValueError("Salário mínimo não pode exceder o salário máximo")


def service_error(exc):
    if isinstance(exc, OverflowError):
        return api_error(str(exc), 409)
    if isinstance(exc, LookupError):
        return api_error(str(exc), 404)
    if isinstance(exc, ValueError):
        return api_error(str(exc), 400)
    raise exc
