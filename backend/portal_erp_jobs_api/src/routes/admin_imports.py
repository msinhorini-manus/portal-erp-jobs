"""BR-only stateless preview API. Confirmation is platform-Admin-only, 501.

Agent token is server-configured SHA256 only; no issuance, storage or JWT reuse.
Process-local request limits match the current single-worker limiter topology;
shared limiting is necessary before a multi-worker/replica deployment.
"""
from functools import wraps
import hashlib
import hmac
from pathlib import PurePosixPath
import re

from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import get_jwt
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError
from werkzeug.exceptions import BadRequest, RequestEntityTooLarge

from src.config import db
from src.rate_limit import InMemoryRateLimiter
from src.models.site import PREFIX_RE, SiteDomain, normalize_host
from src.regional_context import (
    CLIENT_SITE_HEADERS, CLIENT_SITE_KEYS, INTERNAL_CONTEXT_HEADERS,
    _is_trusted_internal_request, get_current_site,
)
from src.routes.admin import platform_admin_required
from src.services.import_preview import build_preview, identity_snapshot
from src.services.import_preview_files import (
    ImportInputError, MAX_FILE_BYTES, MAX_ROWS, bounded_read, parse_json,
)

admin_imports_bp = Blueprint('admin_imports', __name__, url_prefix='/api/admin/importacoes')
import_rate_limiter = InMemoryRateLimiter()
PREFIX = '/api/admin/importacoes'
ERROR_MESSAGES = {
    400: 'Formato de requisição ou arquivo inválido.',
    401: 'Credencial de prévia ou sessão inválida.',
    403: 'Permissão insuficiente para esta operação.',
    404: 'Região não disponível para o importador.',
    413: 'Arquivo ou requisição excede o limite permitido.',
    422: 'Arquivo não atende à validação estrutural ou de consistência.',
    429: 'Limite de requisições atingido. Tente novamente mais tarde.',
    500: 'Não foi possível analisar a prévia com segurança.',
    501: 'Gravação ainda não habilitada nesta etapa.',
}


def _error(code, status):
    return jsonify({'error': ERROR_MESSAGES[status], 'code': code}), status


def agent_configured():
    value = current_app.config.get('IMPORT_PREVIEW_AGENT_TOKEN_SHA256', '')
    return isinstance(value, str) and bool(re.fullmatch(r'[a-fA-F0-9]{64}', value))


def _agent_valid(token):
    value = current_app.config.get('IMPORT_PREVIEW_AGENT_TOKEN_SHA256', '')
    configured = agent_configured()
    expected = value.lower() if configured else '0' * 64
    actual = hashlib.sha256(token.encode('utf-8')).hexdigest()
    equal = hmac.compare_digest(actual, expected)
    return configured and equal and bool(re.fullmatch(r'jip_[a-zA-Z0-9_-]{32,256}', token))


def _limited(scope, limit):
    allowed, retry = import_rate_limiter.check(
        scope=scope, ip_address=request.remote_addr or 'unknown', email='',
        limit=limit, window_seconds=600,
    )
    if not allowed:
        response, status = _error('import_rate_limited', 429)
        response.headers['Retry-After'] = str(retry)
        return response, status
    return None


def init_import_preview_guards(app):
    """Register ahead of regional JSON inspection. Affect only importer URLs."""
    @app.before_request
    def import_request_bounds():
        if not (request.path == PREFIX or request.path.startswith(PREFIX + '/')):
            return None
        if request.method == 'OPTIONS':
            # JWT extension exempts OPTIONS. Never let a JSON OPTIONS body
            # reach the global inspector under that preflight exemption.
            return _error('import_invalid_request', 400) if request.is_json else None
        # Request envelope allows bounded multipart overhead; the file itself
        # always has the exact advertised 50 MiB limit.
        envelope_limit = MAX_FILE_BYTES + (1024 * 1024 if request.mimetype == 'multipart/form-data' else 0)
        request.max_content_length = envelope_limit
        request.max_form_memory_size = 1024 * 1024
        request.max_form_parts = 4
        if request.content_length is not None and request.content_length > envelope_limit:
            return _error('import_file_too_large', 413)
        limited = _limited('imports-request-envelope', current_app.config.get('IMPORT_PREVIEW_REQUEST_RATE_LIMIT', 60))
        if limited:
            return limited
        # This importer-only resolver deliberately does not call the global
        # resolver: it inspects JSON. The unchanged global boundary still runs
        # afterward and enforces body authority with the one bounded cache.
        with db.session.no_autoflush:
            regional_error = _header_site_preflight()
            if regional_error:
                return regional_error
            @_authorized(allow_agent=request.path != PREFIX + '/confirm')
            def credential_probe():
                g.import_credential_preflight = True
                g.import_authorized_site_id = get_current_site().id
                return None
            result = credential_probe()
            if result is not None:
                return result
        if request.is_json:
            try:
                data = request.get_data(cache=True)
                document = parse_json(data)  # lexical limits BEFORE json.loads
                # Flask's silent/non-silent JSON cache is per-request. Both
                # regional calls and the route reuse this exact object, never
                # a second full document. Not a global request-class override.
                request._cached_json = (document, document)
                g.import_json_document = document
            except ImportInputError as error:
                return _error(error.code, error.status)
            except RequestEntityTooLarge:
                return _error('import_file_too_large', 413)
        return None

    @app.after_request
    def import_safe_response(response):
        if not (request.path == PREFIX or request.path.startswith(PREFIX + '/')):
            return response
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        if response.status_code >= 400:
            payload = response.get_json(silent=True)
            if not isinstance(payload, dict) or not isinstance(payload.get('code'), str):
                status = response.status_code
                # Flatten safe existing JWT/regional guards without propagating
                # library messages, nested details, paths or request values.
                code = {400: 'import_invalid_request', 401: 'import_invalid_token',
                        403: 'import_forbidden', 404: 'import_region_unavailable',
                        413: 'import_file_too_large', 422: 'import_invalid_structure',
                        429: 'import_rate_limited'}.get(status, 'import_request_failed')
                response.set_data(current_app.json.dumps({'error': ERROR_MESSAGES.get(status, ERROR_MESSAGES[500]), 'code': code}))
                response.content_type = 'application/json'
        return response


def _header_site_preflight():
    """Mirror host/prefix transport policy ONLY for importer, without BODY."""
    trusted = _is_trusted_internal_request()
    if (any(header in request.headers for header in CLIENT_SITE_HEADERS)
            or (any(header in request.headers for header in INTERNAL_CONTEXT_HEADERS) and not trusted)
            or CLIENT_SITE_KEYS.intersection(request.args.keys())):
        return _error('client_site_authority_forbidden', 400)
    source_host = request.headers.get('X-Regional-Host', request.host) if trusted else request.host
    prefix = request.headers.get('X-Regional-Prefix', '') if trusted else ''
    if not PREFIX_RE.fullmatch(prefix):
        return _error('import_region_unavailable', 404)
    try:
        hostname = normalize_host(source_host)
    except ValueError:
        return _error('import_region_unavailable', 404)
    domains = SiteDomain.query.filter_by(hostname=hostname, url_prefix=prefix, is_active=True).limit(2).all()
    if len(domains) != 1:
        return _error('import_region_unavailable', 404)
    site = domains[0].site
    if not site.is_active or site.code != 'BR' or site.country_code != 'BR':
        return _error('import_region_unavailable', 404)
    g.site, g.site_id, g.locale = site, site.id, site.default_locale
    return None


def _authorized(*, allow_agent=True):
    def decorate(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            site = get_current_site()
            if site.code != 'BR' or site.country_code != 'BR' or not site.is_active:
                return _error('import_region_unavailable', 404)
            if getattr(g, 'import_credential_preflight', False):
                if site.id != g.import_authorized_site_id:
                    return _error('import_forbidden', 403)
                if not allow_agent and g.import_actor == 'agent':
                    return _error('import_agent_confirmation_forbidden', 403)
                return view(*args, **kwargs)
            authorization = request.headers.get('Authorization', '')
            if len(authorization) > 8192:
                return _error('import_invalid_token', 401)
            parts = authorization.split()
            token = parts[1] if len(parts) == 2 and parts[0].lower() == 'bearer' else ''
            if token.startswith('jip_'):
                if not _agent_valid(token):
                    return _error('import_invalid_token', 401)
                if not allow_agent:
                    return _error('import_agent_confirmation_forbidden', 403)
                g.import_actor = 'agent'
                return view(*args, **kwargs)
            # Reuse the actual JWT session/revocation and current platform guard.
            # jwt_required() reads its locations from application config. Fail
            # closed if a future global change enables JSON/query/cookies; this
            # importer must authenticate exclusively from Authorization BEFORE
            # any body inspection, without changing config for other routes.
            locations = current_app.config.get('JWT_TOKEN_LOCATION')
            if not token or locations not in ('headers', ['headers'], ('headers',), {'headers'}):
                return _error('import_invalid_token', 401)
            @platform_admin_required
            def admin_view():
                if get_jwt().get('user_type') != 'admin':
                    return _error('import_forbidden', 403)
                g.import_actor = 'platform_admin'
                return view(*args, **kwargs)
            with db.session.no_autoflush:
                try:
                    return admin_view()
                except (JWTExtendedException, PyJWTError):
                    # Only this API normalizes malformed/wrong-type JWTs to
                    # token error 401; existing global JWT callbacks stay intact.
                    return _error('import_invalid_token', 401)
        return wrapper
    return decorate


@admin_imports_bp.route('/capabilities', methods=['GET'])
@_authorized()
def capabilities():
    return jsonify({
        'country_code': 'BR', 'preview_enabled': True, 'execution_enabled': False,
        'agent_preview_configured': agent_configured(), 'actor': g.import_actor,
        'max_file_bytes': MAX_FILE_BYTES, 'max_rows': MAX_ROWS,
        'formats': ['json', 'csv', 'zip'],
    })


@admin_imports_bp.route('/preview', methods=['POST'])
@_authorized()
def preview():
    limited = _limited('imports-preview-upload', current_app.config.get('IMPORT_PREVIEW_UPLOAD_RATE_LIMIT', 6))
    if limited:
        return limited
    try:
        if request.is_json:
            # Already credential-gated, prescanned and parsed exactly once.
            data = request.get_data(cache=True)
            format_name = 'json'
        elif request.mimetype == 'multipart/form-data':
            if set(request.files) != {'file'} or len(request.files.getlist('file')) != 1 or request.form:
                return _error('import_invalid_upload', 400)
            upload = request.files['file']
            format_name = PurePosixPath(upload.filename or '').suffix.lstrip('.').lower()
            if format_name not in ('json', 'csv', 'zip'):
                return _error('import_unsupported_format', 400)
            data = bounded_read(upload.stream)
        else:
            return _error('import_unsupported_format', 400)
        # Parse/preflight before the scalar live reads; engine keeps one path.
        from src.services.import_preview_files import parse_input
        if request.is_json:
            parsed = parse_input(data, format_name, json_document=g.import_json_document)
        else:
            parsed = parse_input(data, format_name)
        snapshot = identity_snapshot(get_current_site().id)
        return jsonify(build_preview(data, format_name, snapshot, parsed=parsed))
    except ImportInputError as error:
        return _error(error.code, error.status)
    except RequestEntityTooLarge:
        return _error('import_file_too_large', 413)
    except BadRequest:
        return _error('import_invalid_request', 400)
    except Exception:
        # No traceback/request/PII logging and no rollback/commit/audit action.
        return _error('import_preview_unavailable', 500)


@admin_imports_bp.route('/confirm', methods=['POST'])
@_authorized(allow_agent=False)
def confirm():
    return _error('import_execution_not_implemented', 501)
