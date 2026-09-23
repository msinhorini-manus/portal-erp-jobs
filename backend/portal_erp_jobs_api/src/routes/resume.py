"""Validated resume CRUD routes for candidate-owned curriculum data."""
from datetime import datetime
import re
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.config import db
from src.models.candidate import CandidateSkill
from src.models.certification import Certification
from src.models.education import Education
from src.models.experience import Experience
from src.models.job import Skill
from src.models.language import Language
from src.models.project import Project
from src.regional_access import get_candidate_access


resume_bp = Blueprint("resume", __name__, url_prefix="/api/resume")

_MISSING = object()
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_PROFICIENCY_LEVELS = {1, 2, 3, 4}
_LANGUAGE_LEVELS = {"Básico", "Intermediário", "Avançado", "Fluente", "Nativo"}


class PayloadValidationError(ValueError):
    """A safe validation error that never includes submitted values."""

    def __init__(self, field, message):
        super().__init__(message)
        self.field = field
        self.message = message


def get_authenticated_candidate():
    """Resolve a candidate only after JWT, user, site and membership checks."""
    candidate, _, error_response, status_code = get_candidate_access()
    return candidate, error_response, status_code


def _json_object():
    if not request.is_json:
        return None, (jsonify({"error": "O corpo deve ser um objeto JSON"}), 400)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"error": "O corpo deve ser um objeto JSON"}), 400)
    return data, None


def _validation_response(exc):
    return jsonify({
        "error": "Payload inválido",
        "field": exc.field,
        "message": exc.message,
    }), 422


def _internal_error():
    db.session.rollback()
    return jsonify({"error": "Não foi possível concluir a operação de currículo"}), 500


def _reject_unknown(data, allowed):
    unknown = sorted(set(data) - set(allowed))
    if unknown:
        raise PayloadValidationError(unknown[0], "campo não permitido")


def _aliases(data, mapping):
    normalized = dict(data)
    for alias, canonical in mapping.items():
        if alias not in normalized:
            continue
        if canonical in normalized and normalized[canonical] != normalized[alias]:
            raise PayloadValidationError(canonical, "valores conflitantes para o mesmo campo")
        normalized[canonical] = normalized.pop(alias)
    return normalized


def _text(data, field, limit, *, required=False, nullable=True):
    if field not in data:
        if required:
            raise PayloadValidationError(field, "campo obrigatório")
        return _MISSING
    value = data[field]
    if value is None:
        if required or not nullable:
            raise PayloadValidationError(field, "deve ser texto não vazio")
        return None
    if not isinstance(value, str):
        raise PayloadValidationError(field, "deve ser texto")
    value = value.strip()
    if (required or not nullable) and not value:
        raise PayloadValidationError(field, "não pode ser vazio")
    if len(value) > limit:
        raise PayloadValidationError(field, f"deve ter no máximo {limit} caracteres")
    return value


def _boolean(data, field, *, default=_MISSING):
    if field not in data:
        return default
    value = data[field]
    if type(value) is not bool:  # bool JSON estrito; 0/1 e strings não são aceitos.
        raise PayloadValidationError(field, "deve ser booleano JSON")
    return value


def _integer(data, field, *, default=_MISSING, allowed=None):
    if field not in data:
        return default
    value = data[field]
    if type(value) is not int:
        raise PayloadValidationError(field, "deve ser inteiro")
    if allowed is not None and value not in allowed:
        raise PayloadValidationError(field, "valor fora do intervalo permitido")
    return value


def _date(data, field):
    if field not in data:
        return _MISSING
    value = data[field]
    if value is None:
        return None
    if not isinstance(value, str) or not _DATE_PATTERN.fullmatch(value):
        raise PayloadValidationError(field, "deve ser uma data YYYY-MM-DD ou null")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise PayloadValidationError(field, "deve ser uma data válida no formato YYYY-MM-DD") from exc


def _url(data, field):
    value = _text(data, field, 500)
    if value is _MISSING or value is None:
        return value
    if not value:
        return None
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise PayloadValidationError(field, "deve ser uma URL HTTP(S) válida")
    return value


def _check_date_order(start, end, start_field="start_date", end_field="end_date"):
    start = None if start is _MISSING else start
    end = None if end is _MISSING else end
    if start is not None and end is not None and end < start:
        raise PayloadValidationError(end_field, f"não pode ser anterior a {start_field}")


def _candidate_payload(candidate):
    payload = candidate.to_dict()
    payload["professional_summary"] = candidate.professional_summary
    return payload


def _complete_payload(candidate):
    return {
        "candidate": _candidate_payload(candidate),
        "experiences": [
            item.to_dict()
            for item in Experience.query.filter_by(candidate_id=candidate.id)
            .order_by(Experience.start_date.desc()).all()
        ],
        "educations": [
            item.to_dict()
            for item in Education.query.filter_by(candidate_id=candidate.id)
            .order_by(Education.start_date.desc()).all()
        ],
        "skills": [
            item.to_dict()
            for item in CandidateSkill.query.filter_by(candidate_id=candidate.id).all()
        ],
        "certifications": [
            item.to_dict()
            for item in Certification.query.filter_by(candidate_id=candidate.id)
            .order_by(Certification.issue_date.desc()).all()
        ],
        "projects": [
            item.to_dict()
            for item in Project.query.filter_by(candidate_id=candidate.id)
            .order_by(Project.start_date.desc()).all()
        ],
        "languages": [
            item.to_dict()
            for item in Language.query.filter_by(candidate_id=candidate.id).all()
        ],
    }


def _experience_values(data, *, required=False):
    allowed = {
        "job_title", "company_name", "city", "state", "country", "start_date",
        "end_date", "is_current_job", "description",
    }
    _reject_unknown(data, allowed)
    values = {
        "job_title": _text(data, "job_title", 200, required=required),
        "company_name": _text(data, "company_name", 200, required=required),
        "city": _text(data, "city", 200),
        "state": _text(data, "state", 200),
        "country": _text(data, "country", 200),
        "start_date": _date(data, "start_date"),
        "end_date": _date(data, "end_date"),
        "is_current_job": _boolean(data, "is_current_job", default=False if required else _MISSING),
        "description": _text(data, "description", 5000),
    }
    return values


def _education_values(data, *, required=False):
    data = _aliases(data, {
        "degree": "degree_name",
        "field_of_study": "major",
        "institution": "institution_name",
        "end_date": "completion_date",
    })
    allowed = {"degree_name", "major", "institution_name", "start_date", "completion_date", "grade"}
    _reject_unknown(data, allowed)
    return {
        "degree_name": _text(data, "degree_name", 200, required=required),
        "major": _text(data, "major", 200, required=required),
        "institution_name": _text(data, "institution_name", 200, required=required),
        "start_date": _date(data, "start_date"),
        "completion_date": _date(data, "completion_date"),
        "grade": _text(data, "grade", 50),
    }


def _certification_values(data, *, required=False):
    allowed = {
        "name", "issuing_organization", "issue_date", "expiration_date",
        "credential_id", "credential_url", "description",
    }
    _reject_unknown(data, allowed)
    return {
        "name": _text(data, "name", 200, required=required),
        "issuing_organization": _text(data, "issuing_organization", 200, required=required),
        "issue_date": _date(data, "issue_date"),
        "expiration_date": _date(data, "expiration_date"),
        "credential_id": _text(data, "credential_id", 200),
        "credential_url": _url(data, "credential_url"),
        "description": _text(data, "description", 5000),
    }


def _project_values(data, *, required=False):
    allowed = {
        "name", "description", "role", "technologies", "start_date", "end_date",
        "is_current", "project_url", "repository_url",
    }
    _reject_unknown(data, allowed)
    return {
        "name": _text(data, "name", 200, required=required),
        "description": _text(data, "description", 5000, required=required),
        "role": _text(data, "role", 200),
        "technologies": _text(data, "technologies", 2000),
        "start_date": _date(data, "start_date"),
        "end_date": _date(data, "end_date"),
        "is_current": _boolean(data, "is_current", default=False if required else _MISSING),
        "project_url": _url(data, "project_url"),
        "repository_url": _url(data, "repository_url"),
    }


def _language_values(data, *, required=False):
    data = _aliases(data, {"language": "name", "proficiency_level": "proficiency"})
    allowed = {"name", "proficiency", "can_read", "can_write", "can_speak", "can_listen"}
    _reject_unknown(data, allowed)
    proficiency = _text(data, "proficiency", 50, required=required)
    if proficiency is not _MISSING and proficiency is not None and proficiency not in _LANGUAGE_LEVELS:
        raise PayloadValidationError("proficiency", "nível de proficiência inválido")
    return {
        "name": _text(data, "name", 100, required=required),
        "proficiency": proficiency,
        "can_read": _boolean(data, "can_read", default=True if required else _MISSING),
        "can_write": _boolean(data, "can_write", default=True if required else _MISSING),
        "can_speak": _boolean(data, "can_speak", default=True if required else _MISSING),
        "can_listen": _boolean(data, "can_listen", default=True if required else _MISSING),
    }


def _assign(model, values):
    for field, value in values.items():
        if value is not _MISSING:
            setattr(model, field, value)


@resume_bp.route("/experiences", methods=["GET"])
@jwt_required()
def get_experiences():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        items = Experience.query.filter_by(candidate_id=candidate.id).order_by(Experience.start_date.desc()).all()
        return jsonify({"experiences": [item.to_dict() for item in items]}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/experiences", methods=["POST"])
@jwt_required()
def create_experience():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _experience_values(data, required=True)
        if values["is_current_job"] and values["end_date"] not in {_MISSING, None}:
            raise PayloadValidationError("end_date", "deve ser null para trabalho atual")
        _check_date_order(values["start_date"], values["end_date"])
        item = Experience(candidate_id=candidate.id)
        _assign(item, values)
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "Experiência criada com sucesso", "experience": item.to_dict()}), 201
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/experiences/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_experience(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Experience.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Experiência não encontrada"}), 404
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _experience_values(data)
        start = item.start_date if values["start_date"] is _MISSING else values["start_date"]
        end = item.end_date if values["end_date"] is _MISSING else values["end_date"]
        current = item.is_current_job if values["is_current_job"] is _MISSING else values["is_current_job"]
        if current and end is not None:
            raise PayloadValidationError("end_date", "deve ser null para trabalho atual")
        _check_date_order(start, end)
        _assign(item, values)
        db.session.commit()
        return jsonify({"message": "Experiência atualizada com sucesso", "experience": item.to_dict()}), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/experiences/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_experience(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Experience.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Experiência não encontrada"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Experiência excluída com sucesso"}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/educations", methods=["GET"])
@jwt_required()
def get_educations():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        items = Education.query.filter_by(candidate_id=candidate.id).order_by(Education.start_date.desc()).all()
        return jsonify({"educations": [item.to_dict() for item in items]}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/educations", methods=["POST"])
@jwt_required()
def create_education():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _education_values(data, required=True)
        _check_date_order(values["start_date"], values["completion_date"], "start_date", "completion_date")
        item = Education(candidate_id=candidate.id)
        _assign(item, values)
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "Formação criada com sucesso", "education": item.to_dict()}), 201
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/educations/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_education(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Education.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Formação não encontrada"}), 404
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _education_values(data)
        start = item.start_date if values["start_date"] is _MISSING else values["start_date"]
        end = item.completion_date if values["completion_date"] is _MISSING else values["completion_date"]
        _check_date_order(start, end, "start_date", "completion_date")
        _assign(item, values)
        db.session.commit()
        return jsonify({"message": "Formação atualizada com sucesso", "education": item.to_dict()}), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/educations/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_education(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Education.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Formação não encontrada"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Formação excluída com sucesso"}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/skills", methods=["GET"])
@jwt_required()
def get_skills():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        items = CandidateSkill.query.filter_by(candidate_id=candidate.id).all()
        return jsonify({"skills": [item.to_dict() for item in items]}), 200
    except Exception:
        return _internal_error()


def _skill_values(data, *, required=False):
    _reject_unknown(data, {"name", "category", "proficiency_level"})
    return {
        "name": _text(data, "name", 50, required=required),
        "category": _text(data, "category", 50),
        "proficiency_level": _integer(
            data, "proficiency_level", default=3 if required else _MISSING, allowed=_PROFICIENCY_LEVELS
        ),
    }


def _catalog_skill(name, category=_MISSING):
    skill = Skill.query.filter_by(name=name).first()
    if not skill:
        skill = Skill(name=name, category="other" if category in {_MISSING, None, ""} else category)
        db.session.add(skill)
        db.session.flush()
    return skill


@resume_bp.route("/skills", methods=["POST"])
@jwt_required()
def create_skill():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _skill_values(data, required=True)
        skill = _catalog_skill(values["name"], values["category"])
        duplicate = CandidateSkill.query.filter_by(candidate_id=candidate.id, skill_id=skill.id).first()
        if duplicate:
            db.session.rollback()
            return jsonify({"error": "Habilidade já adicionada ao currículo"}), 409
        item = CandidateSkill(
            candidate_id=candidate.id,
            skill_id=skill.id,
            proficiency_level=values["proficiency_level"],
        )
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "Habilidade adicionada com sucesso", "skill": item.to_dict()}), 201
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/skills/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_skill(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = CandidateSkill.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Habilidade não encontrada"}), 404
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _skill_values(data)
        if values["name"] is not _MISSING:
            target = _catalog_skill(values["name"], values["category"])
            duplicate = CandidateSkill.query.filter(
                CandidateSkill.candidate_id == candidate.id,
                CandidateSkill.skill_id == target.id,
                CandidateSkill.id != item.id,
            ).first()
            if duplicate:
                db.session.rollback()
                return jsonify({"error": "Habilidade já adicionada ao currículo"}), 409
            item.skill_id = target.id
        if values["proficiency_level"] is not _MISSING:
            item.proficiency_level = values["proficiency_level"]
        db.session.commit()
        return jsonify({"message": "Habilidade atualizada com sucesso", "skill": item.to_dict()}), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/skills/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_skill(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = CandidateSkill.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Habilidade não encontrada"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Habilidade removida com sucesso"}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/certifications", methods=["GET"])
@jwt_required()
def get_certifications():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        items = Certification.query.filter_by(candidate_id=candidate.id).order_by(Certification.issue_date.desc()).all()
        return jsonify({"certifications": [item.to_dict() for item in items]}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/certifications", methods=["POST"])
@jwt_required()
def create_certification():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _certification_values(data, required=True)
        _check_date_order(values["issue_date"], values["expiration_date"], "issue_date", "expiration_date")
        item = Certification(candidate_id=candidate.id)
        _assign(item, values)
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "Certificação criada com sucesso", "certification": item.to_dict()}), 201
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/certifications/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_certification(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Certification.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Certificação não encontrada"}), 404
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _certification_values(data)
        start = item.issue_date if values["issue_date"] is _MISSING else values["issue_date"]
        end = item.expiration_date if values["expiration_date"] is _MISSING else values["expiration_date"]
        _check_date_order(start, end, "issue_date", "expiration_date")
        _assign(item, values)
        db.session.commit()
        return jsonify({"message": "Certificação atualizada com sucesso", "certification": item.to_dict()}), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/certifications/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_certification(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Certification.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Certificação não encontrada"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Certificação excluída com sucesso"}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/projects", methods=["GET"])
@jwt_required()
def get_projects():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        items = Project.query.filter_by(candidate_id=candidate.id).order_by(Project.start_date.desc()).all()
        return jsonify({"projects": [item.to_dict() for item in items]}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/projects", methods=["POST"])
@jwt_required()
def create_project():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _project_values(data, required=True)
        if values["is_current"] and values["end_date"] not in {_MISSING, None}:
            raise PayloadValidationError("end_date", "deve ser null para projeto atual")
        _check_date_order(values["start_date"], values["end_date"])
        item = Project(candidate_id=candidate.id)
        _assign(item, values)
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "Projeto criado com sucesso", "project": item.to_dict()}), 201
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/projects/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_project(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Project.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Projeto não encontrado"}), 404
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _project_values(data)
        start = item.start_date if values["start_date"] is _MISSING else values["start_date"]
        end = item.end_date if values["end_date"] is _MISSING else values["end_date"]
        current = item.is_current if values["is_current"] is _MISSING else values["is_current"]
        if current and end is not None:
            raise PayloadValidationError("end_date", "deve ser null para projeto atual")
        _check_date_order(start, end)
        _assign(item, values)
        db.session.commit()
        return jsonify({"message": "Projeto atualizado com sucesso", "project": item.to_dict()}), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/projects/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_project(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Project.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Projeto não encontrado"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Projeto excluído com sucesso"}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/languages", methods=["GET"])
@jwt_required()
def get_languages():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        items = Language.query.filter_by(candidate_id=candidate.id).all()
        return jsonify({"languages": [item.to_dict() for item in items]}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/languages", methods=["POST"])
@jwt_required()
def create_language():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _language_values(data, required=True)
        item = Language(candidate_id=candidate.id)
        _assign(item, values)
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "Idioma adicionado com sucesso", "language": item.to_dict()}), 201
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/languages/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_language(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Language.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Idioma não encontrado"}), 404
        data, invalid = _json_object()
        if invalid:
            return invalid
        values = _language_values(data)
        _assign(item, values)
        db.session.commit()
        return jsonify({"message": "Idioma atualizado com sucesso", "language": item.to_dict()}), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/languages/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_language(item_id):
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        item = Language.query.filter_by(id=item_id, candidate_id=candidate.id).first()
        if not item:
            return jsonify({"error": "Idioma não encontrado"}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Idioma removido com sucesso"}), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/complete", methods=["GET"])
@jwt_required()
def get_complete_resume():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        return jsonify(_complete_payload(candidate)), 200
    except Exception:
        return _internal_error()


@resume_bp.route("/complete", methods=["PUT"])
@jwt_required()
def update_complete_resume():
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        data, invalid = _json_object()
        if invalid:
            return invalid
        allowed = {
            "first_name", "last_name", "phone", "city", "state", "country",
            "linkedin_url", "github_url", "portfolio_url", "professional_summary",
        }
        _reject_unknown(data, allowed)
        values = {
            "first_name": _text(data, "first_name", 50, nullable=False),
            "last_name": _text(data, "last_name", 50, nullable=False),
            "phone": _text(data, "phone", 20),
            "city": _text(data, "city", 50),
            "state": _text(data, "state", 50),
            "country": _text(data, "country", 50),
            "linkedin_url": _url(data, "linkedin_url"),
            "github_url": _url(data, "github_url"),
            "portfolio_url": _url(data, "portfolio_url"),
            "professional_summary": _text(data, "professional_summary", 1500),
        }
        _assign(candidate, values)
        db.session.commit()
        return jsonify({
            "message": "Dados pessoais atualizados com sucesso",
            "candidate": _candidate_payload(candidate),
        }), 200
    except PayloadValidationError as exc:
        db.session.rollback()
        return _validation_response(exc)
    except Exception:
        return _internal_error()


@resume_bp.route("/", methods=["GET"])
@jwt_required()
def get_resume_root():
    """Compatibility endpoint with the same complete-resume projection."""
    try:
        candidate, error, status = get_authenticated_candidate()
        if error:
            return error, status
        return jsonify(_complete_payload(candidate)), 200
    except Exception:
        return _internal_error()
