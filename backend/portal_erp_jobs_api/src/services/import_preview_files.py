"""Untrusted offline input only. No extraction, network, ORM or execution SQL.

SQLite accepts the documented plain-text catalog schema, not arbitrary databases.
Temporary copies live in private OS temporary directories and are always removed.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sqlite3
import stat
import tempfile
import time
import unicodedata
import warnings
import zipfile
import zlib

from PIL import Image

from src.services.import_preview_preflight import prescan_json, preflight_zip

MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_ROWS = 10_000
MAX_ENTRIES = 1_000
MAX_FIELD_CHARS = 262_144
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_DIMENSION = 4096
MAX_IMAGE_PIXELS = 8_000_000
SQLITE_SECONDS = 2.0
SQLITE_INSTRUCTIONS = 2_000_000
CATALOG_COLUMNS = (
    'fonte', 'id_fonte', 'url', 'titulo', 'empresa', 'cidade', 'uf',
    'modalidade', 'contrato', 'senioridade', 'area', 'data_publicacao', 'coletado_em',
)
SENSITIVE_KEYS = frozenset({
    'password', 'passwordhash', 'senha', 'senhahash', 'token', 'accesstoken',
    'refreshtoken', 'apikey', 'authorization', 'secret', 'curriculo', 'curriculum',
    'resume', 'cv', 'candidato', 'candidatos', 'candidate', 'candidates',
    'applications', 'candidaturas', 'privatepayload', 'resetpassword',
})


class ImportInputError(Exception):
    """Only catalogued codes/messages may cross the transport boundary."""
    def __init__(self, code, status=422):
        self.code = code
        self.status = status
        super().__init__(code)


def reject(code, status=422):
    raise ImportInputError(code, status)


def bounded_read(stream, limit=MAX_FILE_BYTES):
    data = stream.read(limit + 1)
    if len(data) > limit:
        reject('import_file_too_large', 413)
    return data


def _key(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower())


def check_document(data):
    """Bound nested metadata and reject private/auth documents before using them."""
    stack = [(data, 0)]
    nodes = 0
    while stack:
        value, depth = stack.pop()
        nodes += 1
        if depth > 16 or nodes > 300_000:
            reject('import_structure_limit')
        if isinstance(value, dict):
            for k, v in value.items():
                if not isinstance(k, str) or len(k) > 100:
                    reject('import_invalid_structure')
                normalized = _key(k)
                if normalized in SENSITIVE_KEYS or any(part in normalized for part in ('password', 'senha', 'token', 'curriculo')):
                    reject('import_private_fields_forbidden')
                stack.append((v, depth + 1))
        elif isinstance(value, list):
            if len(value) > MAX_ROWS:
                reject('import_row_limit')
            stack.extend((v, depth + 1) for v in value)
        elif isinstance(value, str):
            if len(value) > MAX_FIELD_CHARS or '\x00' in value:
                reject('import_field_limit')
        elif value is not None and not isinstance(value, (bool, int, float)):
            reject('import_invalid_structure')


def parse_json(data):
    prescan_json(data)
    def pairs(values):
        result = {}
        for k, v in values:
            if k in result:
                reject('import_duplicate_json_key', 400)
            result[k] = v
        return result
    try:
        value = json.loads(data.decode('utf-8-sig'), object_pairs_hook=pairs,
                           parse_constant=lambda _: reject('import_invalid_json', 400))
    except (UnicodeError, ValueError, RecursionError):
        reject('import_invalid_json', 400)
    check_document(value)
    return value


def companies_document(value):
    if not isinstance(value, dict) or not isinstance(value.get('empresas'), list):
        reject('import_invalid_structure')
    companies = []
    jobs = 0
    for record in value['empresas']:
        if not isinstance(record, dict):
            reject('import_invalid_structure')
        cadastro = record.get('cadastro', {})
        if not isinstance(cadastro, dict):
            reject('import_invalid_structure')
        if any(k in record and record[k] != v for k, v in cadastro.items()):
            reject('import_company_payload_collision')
        company = {**cadastro, **{k: v for k, v in record.items() if k != 'cadastro'}}
        if 'vagas' in company and not isinstance(company['vagas'], list):
            reject('import_invalid_structure')
        for row in company.get('vagas', []):
            if not isinstance(row, dict):
                reject('import_invalid_structure')
        jobs += len(company.get('vagas', []))
        companies.append(company)
    if len(companies) + jobs > MAX_ROWS:
        reject('import_row_limit')
    return companies


def parse_csv(data):
    try:
        text = data.decode('utf-8-sig')
        if '\x00' in text:
            reject('import_invalid_csv', 400)
        reader = csv.DictReader(io.StringIO(text, newline=''), strict=True)
        fields = reader.fieldnames
        if (not fields or len(set(fields)) != len(fields)
                or set(fields) not in (set(CATALOG_COLUMNS), set(CATALOG_COLUMNS) | {'descricao'})):
            reject('import_invalid_csv_header', 400)
        check_document({field: '' for field in fields})
        rows = []
        for row in reader:
            if len(rows) >= MAX_ROWS:
                reject('import_row_limit')
            if None in row or any(v is None for v in row.values()):
                reject('import_invalid_csv', 400)
            check_document(row)
            rows.append(row)
        return rows, fields
    except (UnicodeError, csv.Error):
        reject('import_invalid_csv', 400)


def verify_logo(data, suffix):
    if len(data) > MAX_IMAGE_BYTES:
        reject('import_image_limit')
    expected = {'.png': 'PNG', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.webp': 'WEBP'}[suffix]
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format != expected:
                    reject('import_invalid_image')
                w, h = image.size
                if (min(w, h) < 1 or max(w, h) > MAX_IMAGE_DIMENSION
                        or w * h > MAX_IMAGE_PIXELS or getattr(image, 'n_frames', 1) != 1):
                    reject('import_image_limit')
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                image.load()  # verify alone does not decode JPEG/WebP pixels.
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        reject('import_invalid_image')


def sqlite_catalog(data):
    if len(data) > MAX_FILE_BYTES:
        reject('import_file_too_large', 413)
    if not data.startswith(b'SQLite format 3\x00'):
        reject('import_invalid_sqlite')
    original_hash = hashlib.sha256(data).digest()
    with tempfile.TemporaryDirectory(prefix='jobs-preview-') as directory:
        path = Path(directory) / 'catalog.db'
        with path.open('xb') as file:
            file.write(data)
        os.chmod(path, 0o600)
        connection = None
        try:
            connection = sqlite3.connect(path.as_uri() + '?mode=ro&immutable=1', uri=True, timeout=0.1)
            connection.enable_load_extension(False)
            connection.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, MAX_FIELD_CHARS)
            connection.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 16_384)
            connection.setlimit(sqlite3.SQLITE_LIMIT_COLUMN, 32)
            deadline = time.monotonic() + SQLITE_SECONDS
            ticks = 0
            def progress():
                nonlocal ticks
                ticks += 1
                return int(ticks * 1000 > SQLITE_INSTRUCTIONS or time.monotonic() > deadline)
            connection.set_progress_handler(progress, 1000)
            connection.execute('PRAGMA query_only=ON')
            connection.execute('PRAGMA trusted_schema=OFF')
            connection.execute('PRAGMA cell_size_check=ON')
            objects = connection.execute('SELECT type,name,tbl_name,sql FROM sqlite_master LIMIT 101').fetchall()
            if len(objects) > 100:
                reject('import_sqlite_schema')
            tables = [row for row in objects if row[0] == 'table']
            if len(tables) != 1 or tables[0][1:3] != ('vagas', 'vagas'):
                reject('import_sqlite_schema')
            # Accept only a declarative text table, no default/check/generated SQL,
            # virtual tables, views, triggers, expression indexes or extra objects.
            columns = CATALOG_COLUMNS + ('descricao',)
            declaration = ','.join(
                rf'"?{name}"?\s+TEXT(?:\s+NOT\s+NULL)?' for name in columns
            )
            table_pattern = (r'CREATE\s+TABLE\s+"?vagas"?\s*\(\s*' + declaration.replace(',', r'\s*,\s*')
                             + r'\s*,\s*PRIMARY\s+KEY\s*\(\s*"?fonte"?\s*,\s*"?id_fonte"?\s*\)\s*\)\s*;?')
            if not re.fullmatch(table_pattern, tables[0][3] or '', re.IGNORECASE):
                reject('import_sqlite_schema')
            for typ, name, table, sql in objects:
                if typ == 'table':
                    continue
                if typ != 'index' or table != 'vagas':
                    reject('import_sqlite_schema')
                if sql is None and name == 'sqlite_autoindex_vagas_1':
                    continue
                pattern = (r'CREATE\s+INDEX\s+[a-zA-Z_][a-zA-Z_0-9]*\s+ON\s+vagas\s*\(\s*('
                           + '|'.join(columns) + r')\s*\)\s*;?')
                if not re.fullmatch(pattern, sql or '', re.IGNORECASE):
                    reject('import_sqlite_schema')
            schema = connection.execute('PRAGMA table_xinfo(vagas)').fetchall()
            if tuple(row[1] for row in schema) != columns or any(row[6] for row in schema):
                reject('import_sqlite_schema')
            def authorize(action, arg1, arg2, _database, _source):
                if action == sqlite3.SQLITE_SELECT:
                    return sqlite3.SQLITE_OK
                if action == sqlite3.SQLITE_READ and arg1 == 'vagas' and arg2 in columns:
                    return sqlite3.SQLITE_OK
                return sqlite3.SQLITE_DENY
            connection.set_authorizer(authorize)
            cursor = connection.execute('SELECT ' + ','.join(columns) + ' FROM vagas LIMIT ?', (MAX_ROWS + 1,))
            rows = []
            for values in cursor:
                if len(rows) >= MAX_ROWS:
                    reject('import_row_limit')
                if any(v is not None and not isinstance(v, str) for v in values):
                    reject('import_sqlite_schema')
                row = dict(zip(columns, values))
                check_document(row)
                rows.append(row)
            if time.monotonic() > deadline:
                reject('import_sqlite_limit')
        except sqlite3.Error:
            reject('import_sqlite_rejected')
        finally:
            if connection is not None:
                connection.close()
            if hashlib.sha256(path.read_bytes()).digest() != original_hash:
                reject('import_sqlite_mutation_detected')
    return rows


def _consistent_catalog(csv_rows, fields, db_rows):
    def index(rows):
        result = {}
        for row in rows:
            key = (row.get('fonte'), row.get('id_fonte'))
            if not all(isinstance(v, str) and v.strip() for v in key) or key in result:
                reject('import_catalog_inconsistent')
            result[key] = row
        return result
    csv_index, db_index = index(csv_rows), index(db_rows)
    if csv_index.keys() != db_index.keys():
        reject('import_catalog_inconsistent')
    for key, row in csv_index.items():
        if any((row.get(field) or '') != (db_index[key].get(field) or '') for field in fields):
            reject('import_catalog_inconsistent')
    return [db_index[(row['fonte'], row['id_fonte'])] for row in csv_rows]


def parse_zip(data):
    preflight_zip(data)
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_ENTRIES:
                reject('import_zip_entry_limit')
            total = 0
            seen = set()
            files = {}
            for entry in entries:
                name = entry.filename
                if (not name or entry.orig_filename != name or '\\' in name or ':' in name
                        or name.startswith('/') or any(ord(c) < 32 or ord(c) == 127 for c in name)):
                    reject('import_unsafe_zip_path')
                parts = name.rstrip('/').split('/')
                if any(p in ('', '.', '..') for p in parts):
                    reject('import_unsafe_zip_path')
                normalized = unicodedata.normalize('NFC', name.rstrip('/')).casefold()
                if normalized in seen:
                    reject('import_zip_duplicate_entry')
                seen.add(normalized)
                mode = entry.external_attr >> 16
                kind = stat.S_IFMT(mode)
                if kind not in (0, stat.S_IFDIR if entry.is_dir() else stat.S_IFREG):
                    reject('import_zip_special_file')
                if entry.flag_bits & 1 or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    reject('import_zip_encrypted_or_unsupported')
                if entry.is_dir():
                    if entry.file_size != 0 or name not in ('lotes/', 'logos-small/', 'catalogo/'):
                        reject('import_zip_unauthorized_entry')
                    continue
                allowed = (
                    re.fullmatch(r'(?:novas-lote[0-9]+|empresas)\.json', name)
                    or re.fullmatch(r'lotes/[a-z0-9]+(?:-[a-z0-9]+)*\.json', name)
                    or re.fullmatch(r'logos-small/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)', name)
                    or name in ('catalogo/vagas.csv', 'catalogo/vagas.db')
                )
                if not allowed:
                    reject('import_zip_unauthorized_entry')
                total += entry.file_size
                if total > MAX_FILE_BYTES or entry.file_size > MAX_FILE_BYTES:
                    reject('import_file_too_large', 413)
                if entry.file_size > max(entry.compress_size, 1) * 200:
                    reject('import_zip_expansion_ratio')
                files[name] = entry
            # All central-directory checks precede reads/decompression.
            contents = {}
            for name, entry in files.items():
                with archive.open(entry) as file:
                    contents[name] = bounded_read(file, entry.file_size)
                if len(contents[name]) != entry.file_size:
                    reject('import_invalid_zip', 400)
    except (zipfile.BadZipFile, RuntimeError, NotImplementedError, OSError, EOFError, ValueError, zlib.error):
        reject('import_invalid_zip', 400)
    if 'catalogo/vagas.csv' in contents:
        if any(not name.startswith('catalogo/') for name in contents):
            reject('import_invalid_structure')
        rows, fields = parse_csv(contents['catalogo/vagas.csv'])
        if 'catalogo/vagas.db' in contents:
            rows = _consistent_catalog(rows, fields, sqlite_catalog(contents['catalogo/vagas.db']))
        return {'companies': [], 'catalog': rows, 'logos': [], 'origin': 'catalog_zip'}
    roots = [name for name in contents if '/' not in name]
    if len(roots) != 1 or any(name.startswith('catalogo/') for name in contents):
        reject('import_invalid_structure')
    companies = companies_document(parse_json(contents[roots[0]]))
    slug_index = {}
    for company in companies:
        slug = company.get('slug')
        if not isinstance(slug, str) or slug in slug_index:
            reject('import_company_payload_collision')
        slug_index[slug] = company
    logos = []
    for name, content in contents.items():
        if name.startswith('lotes/'):
            slug = Path(name).stem
            if slug not in slug_index or 'vagas' in slug_index[slug]:
                reject('import_orphan_or_duplicate_lot')
            rows = parse_json(content)
            if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
                reject('import_invalid_structure')
            slug_index[slug]['vagas'] = rows
        elif name.startswith('logos-small/'):
            slug = Path(name).stem
            if slug not in slug_index or slug in logos:
                reject('import_orphan_or_duplicate_logo')
            verify_logo(content, Path(name).suffix)
            logos.append(slug)
    if len(companies) + sum(len(c.get('vagas', [])) for c in companies) + len(logos) > MAX_ROWS:
        reject('import_row_limit')
    return {'companies': companies, 'catalog': [], 'logos': logos, 'origin': 'batch_zip'}


_UNPARSED = object()


def parse_input(data, format_name, *, json_document=_UNPARSED):
    if len(data) > MAX_FILE_BYTES:
        reject('import_file_too_large', 413)
    if not data:
        reject('import_empty_file', 400)
    if format_name == 'json':
        value = parse_json(data) if json_document is _UNPARSED else json_document
        return {'companies': companies_document(value), 'catalog': [], 'logos': [], 'origin': 'json'}
    if format_name == 'csv':
        rows, _fields = parse_csv(data)
        return {'companies': [], 'catalog': rows, 'logos': [], 'origin': 'csv'}
    if format_name == 'zip':
        return parse_zip(data)
    reject('import_unsupported_format', 400)
