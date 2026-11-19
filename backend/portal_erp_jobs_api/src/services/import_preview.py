"""One preview engine for Admin and agent; proposals are never writes.

DTO intentionally contains only presentation names/titles, opaque row keys and
catalogued messages. No CNPJ, contacts, description, CV, raw payload or live IDs.
Jobs has no source identity columns: live deduplication remains heuristic only.
"""
from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from urllib.parse import urlparse

from sqlalchemy import select

from src.config import db
from src.models.company import Company, CompanySite, company_slug_reservations
from src.models.job import Job
from src.company_slug_policy_v12 import valid_slug
from src.services.import_preview_files import MAX_ROWS, parse_input, reject

LIMITATIONS = [
    'Prévia stateless: nenhuma gravação, auditoria, fila ou histórico durável; create/update são apenas propostas.',
    'O schema atual do Jobs não persiste fonte/id_fonte. Deduplicação externa existe somente no lote; a comparação regional empresa/título/cidade é auxiliar e exige revisão.',
    'Nomes ambíguos, empresas confidenciais e cadastro incompleto não geram criação automática.',
    'A prévia não confirma publicação: identidade, descrição, taxonomias e aprovação precisam de homologação administrativa.',
    'Logos são verificados offline; URLs não são baixadas. Imagens, contatos e textos privados não integram o DTO.',
    'Execução, alteração comercial, encerramento de ausentes, estorno e convites não estão implementados.',
]
MESSAGES = {
    'missing_name': ('nome', 'error', 'Nome empresarial obrigatório.'),
    'missing_title': ('titulo', 'error', 'Título obrigatório.'),
    'field_too_long': ('titulo', 'error', 'Campo excede o limite do Jobs; nenhum truncamento será aplicado.'),
    'invalid_cnpj': ('cnpj', 'error', 'CNPJ inválido; informe identidade numérica com verificadores válidos.'),
    'missing_cnpj': ('cnpj', 'warning', 'CNPJ ausente: cadastro requer revisão de identidade.'),
    'invalid_slug': ('slug', 'error', 'Slug inválido ou reservado; identidade pública não será reescrita.'),
    'missing_slug': ('slug', 'warning', 'Slug público ausente; requer definição administrativa.'),
    'company_collision': ('identity', 'error', 'Identidades de empresa conflitam; associação automática bloqueada.'),
    'slug_immutable': ('slug', 'error', 'Slug diverge da identidade pública reservada; reescrita bloqueada.'),
    'ambiguous_company': ('nome', 'warning', 'Identificação somente por nome ou nome ambíguo: revisão obrigatória.'),
    'confidential_company': ('nome', 'warning', 'Empresa confidencial: criação automática bloqueada.'),
    'admin_control_ignored': ('admin', 'warning', 'Membro, limites e aprovação são controles do Admin e não serão aplicados.'),
    'missing_lots': ('vagas', 'warning', 'Documento de empresas sem vagas: faltam lotes; dados não serão inventados.'),
    'empty_jobs': ('vagas', 'warning', 'Lista de vagas vazia; não representa importação concluída.'),
    'missing_description': ('descricao', 'error', 'Descrição ausente: futura publicação bloqueada.'),
    'missing_city': ('cidade', 'warning', 'Cidade ausente; nenhuma localização será inventada.'),
    'missing_contract': ('contrato', 'warning', 'Contrato ausente; nenhum contrato será inferido.'),
    'unknown_taxonomy': ('taxonomy', 'warning', 'Taxonomia desconhecida ou não canônica; nenhum mapeamento silencioso.'),
    'html_review': ('content', 'warning', 'HTML exige revisão e sanitização antes de qualquer futura publicação.'),
    'external_url': ('url', 'warning', 'URL externa detectada; somente validação offline, sem acesso ou download.'),
    'invalid_url': ('url', 'error', 'URL deve ser HTTPS pública, sem credenciais, controles ou endereço privado.'),
    'missing_source_key': ('source', 'warning', 'Fonte/id_fonte ausentes ou não reconhecidos; deduplicação externa indisponível.'),
    'invalid_source_key': ('source', 'error', 'Identidade externa inválida ou incompleta.'),
    'source_collision': ('source', 'error', 'Fonte/id_fonte repetidos com empresa ou conteúdo divergente; fusão bloqueada.'),
    'duplicate_in_batch': ('source', 'warning', 'Registro idêntico repetido no lote; proposta de ignorar a repetição.'),
    'possible_live_duplicate': ('identity', 'warning', 'Possível duplicata regional por empresa/título/cidade; não prova identidade externa.'),
    'company_pending': ('empresa', 'warning', 'Identidade empresarial pendente; vaga requer revisão.'),
    'alias_collision': ('identity', 'error', 'Campos equivalentes divergentes no documento; requer correção.'),
    'unknown_fields': ('fields', 'warning', 'Campos não suportados foram desconsiderados; nenhuma aplicação silenciosa.'),
    'logo_verified': ('logo', 'warning', 'Imagem verificada offline; nenhum logo foi salvo ou publicado.'),
    'logo_company_pending': ('logo', 'warning', 'Identidade empresarial pendente; imagem não está autorizada para publicação.'),
    'invalid_field_type': ('fields', 'error', 'Tipo de campo inválido; corrija o documento antes de prosseguir.'),
    'invalid_salary': ('salary', 'error', 'Salário inválido ou faixa incoerente; nenhum valor será inferido.'),
    'sensitive_label': ('label', 'warning', 'Campo de apresentação contém dados inadequados e foi omitido do DTO.'),
}
ADMIN_FIELDS = frozenset({
    'membro', 'membro_portalerp', 'is_member', 'max_active_jobs', 'limite', 'limites',
    'status', 'aprovado', 'approved_at', 'approved_by', 'approval', 'aprovacao', 'is_active',
})
COMPANY_FIELDS = frozenset({
    'nome_fantasia', 'razao_social', 'nome', 'company_name', 'name', 'cnpj', 'cnpj_numeros',
    'slug', 'public_profile_slug', 'vagas', 'setor', 'porte', 'telefone', 'website',
    'estado', 'cidade', 'endereco', 'cep', 'descricao', 'linkedin', 'cnpj_confirmado',
    'brasilapi', 'fonte_confirmacao', 'situacao_cadastral', 'tipo_unidade', 'observacoes',
    'description', 'sector', 'company_size', 'city', 'state', 'phone', 'email', 'logo_url',
}) | ADMIN_FIELDS
JOB_FIELDS = frozenset({
    'titulo', 'title', 'descricao', 'description', 'cidade', 'city', 'empresa', 'company',
    'fonte', 'source', 'id_fonte', 'source_id', 'url', 'uf', 'state', 'area', 'area_id',
    'senioridade', 'seniority_level', 'modalidade', 'work_modality', 'contrato', 'contract_type',
    'data_publicacao', 'coletado_em', 'requisitos', 'requirements', 'beneficios', 'benefits',
    'responsibilities', 'responsabilidades', 'min_salary', 'max_salary', 'salary_currency',
}) | ADMIN_FIELDS


def normalized(value):
    if not isinstance(value, str):
        return ''
    return ' '.join(unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().casefold().split())


def numeric_cnpj(value):
    if not isinstance(value, str) or not re.fullmatch(r'[0-9./\-\s]+', value):
        return ''
    return re.sub(r'\D', '', value)


def valid_cnpj(value):
    digits = numeric_cnpj(value)
    if len(digits) != 14 or len(set(digits)) == 1:
        return False
    numbers = [int(c) for c in digits]
    for count, weights in ((12, (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)),
                           (13, (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2))):
        remainder = sum(n * w for n, w in zip(numbers[:count], weights)) % 11
        if numbers[count] != (0 if remainder < 2 else 11 - remainder):
            return False
    return True


def safe_label(value, fallback):
    """Display public names/titles only; suspicious values are omitted, not echoed."""
    if not isinstance(value, str) or not value.strip():
        return fallback, False
    if (len(value) > 200 or any(ord(c) < 32 or ord(c) == 127 for c in value)
            or re.search(r'[@<>]|https?://|\b(?:jip_|Bearer\s)|\d[\d .()/+\-]{6,}\d', value, re.I)
            or any(unicodedata.category(c).startswith('C') for c in value)):
        return fallback, True
    return value.strip()[:100], False


def message(item, code, field=None):
    default_field, severity, text = MESSAGES[code]
    record = {'code': code, 'field': field or default_field, 'severity': severity, 'message': text}
    if record not in item['messages']:
        item['messages'].append(record)
    if severity == 'error':
        item['action'] = 'error'


def review(item, code, field=None):
    message(item, code, field)
    if item['action'] not in ('error', 'ignore'):
        item['action'] = 'review'


def item_for(items, entity, value):
    line = len(items) + 1
    label, omitted = safe_label(value, {'company': 'Empresa', 'job': 'Vaga', 'logo': 'Logo'}[entity])
    item = {'line': line, 'entity': entity, 'key': f'{entity}-{line}', 'label': label,
            'action': 'create', 'messages': []}
    items.append(item)
    if omitted:
        review(item, 'sensitive_label')
    return item


def aliased(row, names, item, normalize=lambda v: v):
    present = [(name, row[name]) for name in names if name in row and row[name] not in (None, '')]
    if present and any(normalize(v) != normalize(present[0][1]) for _, v in present[1:]):
        message(item, 'alias_collision')
    return present[0][1] if present else None


def identity_snapshot(site_id):
    """Select scalar identities, never ORM graphs or candidate/contact data.

    Bounded live comparison fails closed rather than returning incomplete matches.
    CNPJ is held only transiently for identity matching and is never serialized.
    """
    with db.session.no_autoflush:
        companies = db.session.execute(select(
            Company.id, Company.cnpj, Company.company_name,
            CompanySite.display_name, CompanySite.public_profile_slug,
        ).join(CompanySite, CompanySite.company_id == Company.id)
          .where(CompanySite.site_id == site_id).limit(MAX_ROWS + 1)).all()
        reservations = db.session.execute(select(
            company_slug_reservations.c.slug, company_slug_reservations.c.company_id,
        ).where(company_slug_reservations.c.country_code == 'BR').limit(MAX_ROWS + 1)).all()
        jobs = db.session.execute(select(Job.company_id, Job.title, Job.city)
            .where(Job.site_id == site_id).limit(MAX_ROWS + 1)).all()
    if any(len(rows) > MAX_ROWS for rows in (companies, reservations, jobs)):
        reject('import_live_comparison_limit')
    return {'companies': companies, 'reservations': dict(reservations), 'jobs': jobs}


def _valid_url(value):
    import ipaddress
    if not isinstance(value, str) or len(value) > 500 or re.search(r'[\s\\\x00-\x1f\x7f]', value):
        return False
    try:
        parsed = urlparse(value)
        host = parsed.hostname or ''
        if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port not in (None, 443):
            return False
        if not re.fullmatch(r'[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?', host) or '.' not in host:
            return False
        try:
            ipaddress.ip_address(host)
            return False  # No literal addresses; no DNS or external access.
        except ValueError:
            return not host.endswith(('.local', '.internal', '.localhost'))
    except ValueError:
        return False


def _recognized_source(row, description):
    urls = [row.get('url')] if row.get('url') else []
    urls += re.findall(r'https?://[^\s<>]+', description or '')
    recognized = set()
    for value in urls:
        if not isinstance(value, str):
            continue
        value = value.rstrip('.,;)\"\'')
        if not _valid_url(value):
            continue
        parsed = urlparse(value)
        if (re.fullmatch(r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.gupy\.io', parsed.hostname or '')
                and re.fullmatch(r'/jobs/[0-9]{1,30}/?', parsed.path)):
            recognized.add(('gupy', parsed.path.split('/')[2]))
    return recognized


def _common_validation(row, item, fields):
    # Documents may contain metadata objects, but business scalar fields may
    # not. Treat these as line errors rather than internal exception responses.
    for field in fields - {'vagas', 'brasilapi', 'observacoes'} - ADMIN_FIELDS:
        value = row.get(field)
        if value is not None and not isinstance(value, (str, int, float, bool)):
            message(item, 'invalid_field_type')
    for aliases, limit in (
        (('uf', 'state', 'estado'), 50), (('city', 'cidade'), 50),
        (('senioridade', 'seniority_level', 'modalidade', 'work_modality', 'contrato', 'contract_type'), 20),
        (('area', 'setor', 'sector'), 100), (('salary_currency',), 10),
    ):
        for field in aliases:
            value = row.get(field)
            if value not in (None, '') and not isinstance(value, str):
                message(item, 'invalid_field_type')
            elif isinstance(value, str) and len(value) > limit:
                message(item, 'field_too_long', field if field in {'area', 'state', 'salary_currency'} else 'fields')
    salaries = [row.get(field) for field in ('min_salary', 'max_salary')]
    if any(value is not None and (type(value) not in (int, float) or not math.isfinite(value) or value < 0) for value in salaries):
        message(item, 'invalid_salary')
    elif all(value is not None for value in salaries) and salaries[0] > salaries[1]:
        message(item, 'invalid_salary')
    if set(row) - fields:
        review(item, 'unknown_fields')
    if set(row) & ADMIN_FIELDS:
        message(item, 'admin_control_ignored')
    for field in ('website', 'linkedin', 'logo_url', 'url'):
        value = row.get(field)
        if value:
            if not _valid_url(value):
                message(item, 'invalid_url')
            else:
                message(item, 'external_url')
    for field in ('descricao', 'description', 'requisitos', 'requirements', 'beneficios', 'benefits', 'responsibilities'):
        value = row.get(field)
        if isinstance(value, str) and re.search(r'<[^>]+>', value):
            review(item, 'html_review')
        if isinstance(value, str):
            for url in re.findall(r'https?://[^\s<>]+', value):
                if _valid_url(url.rstrip('.,;)\"\'')):
                    message(item, 'external_url')
                else:
                    message(item, 'invalid_url')


def build_preview(data, format_name, snapshot=None, *, parsed=None):
    source = parsed if parsed is not None else parse_input(data, format_name)
    snapshot = snapshot or {'companies': [], 'reservations': {}, 'jobs': []}
    items = []
    by_cnpj, by_name, current_slug = {}, {}, {}
    for company_id, cnpj, name, display_name, slug in snapshot['companies']:
        if numeric_cnpj(cnpj):
            by_cnpj.setdefault(numeric_cnpj(cnpj), set()).add(company_id)
        for value in (name, display_name):
            if normalized(value):
                by_name.setdefault(normalized(value), set()).add(company_id)
        current_slug[company_id] = slug
    live_jobs = {(company_id, normalized(title), normalized(city)) for company_id, title, city in snapshot['jobs']}
    companies = list(source['companies'])
    # Catalog has no legal identities: name grouping is only a review proposal.
    catalog_groups = {}
    for row in source['catalog']:
        name = row.get('empresa') or ''
        key = normalized(name)
        if key not in catalog_groups:
            catalog_groups[key] = {'nome_fantasia': name, 'vagas': []}
        catalog_groups[key]['vagas'].append(row)
    companies.extend(catalog_groups.values())
    source_keys = {}
    batch_cnpj, batch_slug, batch_name = {}, {}, {}
    company_items = {}
    jobs_by_company = {}
    for company in companies:
        name = next((company.get(k) for k in ('nome_fantasia', 'company_name', 'nome', 'name', 'razao_social') if company.get(k)), None)
        item = item_for(items, 'company', name)
        aliased(company, ('nome_fantasia', 'company_name', 'nome', 'name'), item, normalized)
        cnpj_value = aliased(company, ('cnpj_numeros', 'cnpj'), item, numeric_cnpj)
        cnpj = numeric_cnpj(cnpj_value)
        slug = aliased(company, ('slug', 'public_profile_slug'), item)
        _common_validation(company, item, COMPANY_FIELDS)
        if not isinstance(name, str) or not name.strip():
            message(item, 'missing_name')
        elif len(name) > 100:
            message(item, 'field_too_long', 'nome')
        confidential = 'confidencial' in normalized(name) or normalized(name) in ('confidential', 'anonymous', 'anonima')
        if confidential:
            review(item, 'confidential_company')
        if cnpj_value:
            if not valid_cnpj(cnpj_value):
                message(item, 'invalid_cnpj')
        else:
            review(item, 'missing_cnpj')
        if slug:
            if not valid_slug(slug):
                message(item, 'invalid_slug')
        else:
            review(item, 'missing_slug')
        cnpj_matches = by_cnpj.get(cnpj, set()) if cnpj else set()
        name_matches = by_name.get(normalized(name), set())
        reserved = isinstance(slug, str) and slug in snapshot['reservations']
        slug_owner = snapshot['reservations'].get(slug) if isinstance(slug, str) else None
        company_id = next(iter(cnpj_matches)) if len(cnpj_matches) == 1 else None
        if (len(cnpj_matches) > 1 or (reserved and slug_owner != company_id)
                or (company_id is not None and name_matches and company_id not in name_matches)):
            message(item, 'company_collision')
        if company_id is not None:
            if slug and current_slug.get(company_id) and current_slug[company_id] != slug:
                message(item, 'slug_immutable')
            if item['action'] == 'create':
                item['action'] = 'update'
        elif name_matches:
            review(item, 'ambiguous_company')
            if len(name_matches) == 1:
                company_id = next(iter(name_matches))  # heuristic jobs only, never an upsert.
        for identity, index in ((cnpj, batch_cnpj), (slug, batch_slug), (normalized(name), batch_name)):
            if not identity or not isinstance(identity, str):
                continue
            if identity in index:
                other = index[identity]
                message(other, 'company_collision')
                message(item, 'company_collision')
            else:
                index[identity] = item
        if 'vagas' not in company:
            message(item, 'missing_lots')
        elif not company['vagas']:
            message(item, 'empty_jobs')
        if isinstance(slug, str):
            company_items[slug] = item
        company_identity = ('live', company_id) if company_id is not None else ('batch', item['key'])
        job_items = []
        jobs_by_company[item['key']] = job_items
        for row in company.get('vagas', []):
            title = row.get('titulo') if 'titulo' in row else row.get('title')
            job = item_for(items, 'job', title)
            job_items.append(job)
            title = aliased(row, ('titulo', 'title'), job)
            description = aliased(row, ('descricao', 'description'), job)
            city = aliased(row, ('cidade', 'city'), job, normalized)
            _common_validation(row, job, JOB_FIELDS)
            row_company = aliased(row, ('empresa', 'company'), job, normalized)
            if row_company and normalized(row_company) != normalized(name):
                message(job, 'company_collision')
            if not isinstance(title, str) or not title.strip():
                message(job, 'missing_title')
            elif len(title) > 100:
                message(job, 'field_too_long')
            if not isinstance(description, str) or not description.strip():
                message(job, 'missing_description')
            if not isinstance(city, str) or not city.strip():
                review(job, 'missing_city')
            elif len(city) > 50:
                message(job, 'field_too_long', 'cidade')
            contract = aliased(row, ('contrato', 'contract_type'), job)
            if not contract:
                review(job, 'missing_contract')
            for aliases, allowed in (
                (('senioridade', 'seniority_level'), {'junior', 'pleno', 'senior', 'tech_lead', 'manager', 'intern'}),
                (('modalidade', 'work_modality'), {'remote', 'hybrid', 'onsite'}),
                (('contrato', 'contract_type'), {'clt', 'pj', 'freelance', 'internship', 'temporary', 'contract'}),
            ):
                value = aliased(row, aliases, job)
                if value and (not isinstance(value, str) or value not in allowed):
                    review(job, 'unknown_taxonomy')
            if row.get('area') or row.get('area_id'):
                review(job, 'unknown_taxonomy', 'area')
            if item['action'] in ('error', 'review'):
                review(job, 'company_pending')
            source_name = aliased(row, ('fonte', 'source'), job)
            source_id = aliased(row, ('id_fonte', 'source_id'), job)
            external_key = None
            recognized = _recognized_source(row, description if isinstance(description, str) else '')
            if source_name or source_id:
                if (not isinstance(source_name, str) or not re.fullmatch(r'[a-z0-9_-]{1,40}', source_name)
                        or not isinstance(source_id, str) or not re.fullmatch(r'[a-zA-Z0-9._:-]{1,128}', source_id)):
                    message(job, 'invalid_source_key')
                else:
                    external_key = (source_name, source_id)
                    if recognized and recognized != {external_key}:
                        message(job, 'source_collision')
            elif len(recognized) == 1:
                external_key = next(iter(recognized))
            elif len(recognized) > 1:
                message(job, 'source_collision')
            else:
                message(job, 'missing_source_key')
            if external_key:
                # Private fingerprints used in RAM only; never included in DTO.
                signature = (company_identity, title, city, description, repr(sorted(row.items())))
                if external_key in source_keys:
                    other, other_signature = source_keys[external_key]
                    if signature == other_signature and other['action'] != 'error' and job['action'] != 'error':
                        job['action'] = 'ignore'
                        message(job, 'duplicate_in_batch')
                    else:
                        message(other, 'source_collision')
                        message(job, 'source_collision')
                else:
                    source_keys[external_key] = (job, signature)
            if company_id is not None and (company_id, normalized(title), normalized(city)) in live_jobs:
                review(job, 'possible_live_duplicate')
    # Earlier proposals can become blocked by a later collision. Propagate to
    # their dependent jobs/logos only after the whole source was checked.
    for item in items[:]:
        if item['entity'] == 'company' and item['action'] in ('review', 'error'):
            for job in jobs_by_company[item['key']]:
                review(job, 'company_pending')
    for slug in source['logos']:
        company_item = company_items[slug]
        logo = item_for(items, 'logo', company_item['label'])
        message(logo, 'logo_verified')
        if company_item['action'] in ('review', 'error'):
            review(logo, 'logo_company_pending')
    if len(items) > MAX_ROWS:
        reject('import_row_limit')
    totals = {entity + 's': sum(item['entity'] == entity for item in items) for entity in ('company', 'job', 'logo')}
    totals['companies'] = totals.pop('companys')
    totals.update({action: sum(item['action'] == action for item in items) for action in ('create', 'update', 'ignore', 'error')})
    totals['warnings'] = sum(m['severity'] == 'warning' for item in items for m in item['messages'])
    return {
        'preview_id': 'jipreview_' + hashlib.sha256(data).hexdigest()[:32],
        'dry_run': True, 'status': 'preview_only', 'country_code': 'BR',
        'execution_enabled': False, 'totals': totals, 'limitations': list(LIMITATIONS), 'items': items,
    }
