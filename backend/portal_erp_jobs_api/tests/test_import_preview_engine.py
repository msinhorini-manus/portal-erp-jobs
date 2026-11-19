"""Own isolated process; no real env/network/DB. Synthetic data only in Git."""
import copy
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import sqlite3
import stat
import tempfile
import unittest
from unittest.mock import patch
import zipfile

os.environ['SECRET_KEY'] = 'preview-tests-secret-key-32-characters-only'
os.environ['JWT_SECRET_KEY'] = 'preview-tests-jwt-secret-32-characters-only'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['PYTHON_DOTENV_DISABLED'] = '1'

from PIL import Image
from src.services import import_preview_files as files
from src.services.import_preview import build_preview, valid_cnpj


def company(**changes):
    record = {'nome_fantasia': 'Empresa Teste', 'cnpj': '11222333000181', 'slug': 'empresa-teste',
              'vagas': [job()]}
    record.update(changes)
    return record


def job(**changes):
    record = {'titulo': 'Analista', 'descricao': 'Descrição sintética', 'cidade': 'Curitiba',
              'contrato': 'clt', 'modalidade': 'remote', 'senioridade': 'pleno',
              'fonte': 'synthetic', 'id_fonte': 'one'}
    record.update(changes)
    return record


def encoded(companies=None):
    return json.dumps({'empresas': companies if companies is not None else [company()]}).encode()


def zipped(entries, compression=zipfile.ZIP_DEFLATED):
    result = io.BytesIO()
    with zipfile.ZipFile(result, 'w', compression=compression) as archive:
        for name, data in entries:
            archive.writestr(name, data)
    return result.getvalue()


def csv_bytes(rows, description=False):
    result = io.StringIO(newline='')
    fields = files.CATALOG_COLUMNS + (('descricao',) if description else ())
    writer = csv.DictWriter(result, fields)
    writer.writeheader()
    writer.writerows({k: row.get(k, '') for k in fields} for row in rows)
    return result.getvalue().encode()


def catalog_row(**changes):
    row = {key: '' for key in files.CATALOG_COLUMNS}
    row.update(fonte='synthetic', id_fonte='one', titulo='Analista', empresa='Empresa Teste',
               cidade='Curitiba', descricao='Descrição sintética', contrato='clt')
    row.update(changes)
    return row


def sqlite_bytes(rows=None, extra=None, schema=None):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'fixture.db'
        con = sqlite3.connect(path)
        con.execute(schema or ('CREATE TABLE vagas (' + ','.join(k + ' TEXT' for k in files.CATALOG_COLUMNS + ('descricao',)) + ',PRIMARY KEY(fonte,id_fonte))'))
        if rows:
            cols = files.CATALOG_COLUMNS + ('descricao',)
            con.executemany('INSERT INTO vagas VALUES (' + ','.join('?' for _ in cols) + ')', [tuple(row.get(k) for k in cols) for row in rows])
        if extra:
            con.execute(extra)
        con.commit()
        con.close()
        return path.read_bytes()


class InputTests(unittest.TestCase):
    def assert_rejected(self, data, fmt, code=None, status=None):
        with self.assertRaises(files.ImportInputError) as error:
            files.parse_input(data, fmt)
        if code:
            self.assertEqual(error.exception.code, code)
        if status:
            self.assertEqual(error.exception.status, status)

    def test_clean_json_and_safe_dto(self):
        data = build_preview(encoded(), 'json')
        self.assertEqual(data['totals'], {'companies': 1, 'jobs': 1, 'logos': 0, 'create': 2, 'update': 0, 'ignore': 0, 'error': 0, 'warnings': 0})
        self.assertEqual(set(data), {'preview_id', 'dry_run', 'status', 'country_code', 'execution_enabled', 'totals', 'limitations', 'items'})
        for item in data['items']:
            self.assertEqual(set(item), {'line', 'entity', 'key', 'label', 'action', 'messages'})
        rendered = json.dumps(data)
        self.assertNotIn('11222333000181', rendered)
        self.assertNotIn('Descrição sintética', rendered)

    def test_cnpj_check_digits_and_input_types(self):
        for value in ('11222333000181', '11.222.333/0001-81'):
            self.assertTrue(valid_cnpj(value))
        for value in ('11111111111111', '11222333000180', 11222333000181, [], None, 'foo11222333000181'):
            self.assertFalse(valid_cnpj(value))

    def test_invalid_json_empty_format_and_duplicate_keys(self):
        for data in (b'{', b'\xff', b'{"empresas": [NaN]}'):
            self.assert_rejected(data, 'json', 'import_invalid_json', 400)
        self.assert_rejected(b'{"empresas": [], "empresas": []}', 'json', 'import_duplicate_json_key')
        self.assert_rejected(b'', 'json', 'import_empty_file')
        self.assert_rejected(b'[]', 'bin', 'import_unsupported_format')

    def test_structure_types_missing_lots_and_cadastro(self):
        for data in (b'[]', b'{"empresas": [1]}', encoded([company(vagas={})]), encoded([company(vagas=[1])])):
            self.assert_rejected(data, 'json', 'import_invalid_structure')
        dto = build_preview(encoded([company(vagas=[]), {'cadastro': {'nome_fantasia': 'Outra'}, 'vagas': []}]), 'json')
        self.assertEqual(dto['totals']['jobs'], 0)
        record = company();record.pop('vagas')
        self.assertIn('missing_lots', [m['code'] for m in build_preview(encoded([record]), 'json')['items'][0]['messages']])
        self.assert_rejected(encoded([company(cadastro={'slug': 'different'})]), 'json', 'import_company_payload_collision')

    def test_private_documents_rejected_recursively(self):
        for key in ('senha', 'password_hash', 'access_token', 'cv', 'candidatos', 'currículo', 'private_payload', 'api_key'):
            record = company(metadata={key: 'PRIVATE-SENTINEL'})
            self.assert_rejected(encoded([record]), 'json', 'import_private_fields_forbidden')

    def test_nested_size_and_row_limits(self):
        value = []
        for _ in range(18):
            value = [value]
        self.assert_rejected(json.dumps({'empresas': [], 'metadata': value}).encode(), 'json', 'import_structure_limit')
        with patch.object(files, 'MAX_ROWS', 1):
            self.assert_rejected(encoded(), 'json', 'import_row_limit')
        self.assert_rejected(encoded([company(observacoes='x' * (files.MAX_FIELD_CHARS + 1))]), 'json', 'import_field_limit')
        with patch.object(files, 'MAX_FILE_BYTES', 1):
            self.assert_rejected(b'ab', 'json', 'import_file_too_large', 413)
        with self.assertRaises(files.ImportInputError):
            files.bounded_read(io.BytesIO(b'ab'), 1)

    def test_zip_slip_absolute_alias_special_encrypted_and_allowlist(self):
        for name in ('../empresas.json', '/empresas.json', 'lotes/../x.json', 'lotes\\x.json', 'C:/empresas.json', 'lotes//x.json', './empresas.json', 'lotes/x\x00.json'):
            self.assert_rejected(zipped([(name, b'[]')]), 'zip')
        for name in ('evil.py', 'catalogo/vagas.db-wal', 'logo.svg', 'lotes/x.exe', 'other/'):
            self.assert_rejected(zipped([(name, b'')]), 'zip', 'import_zip_unauthorized_entry')
        with self.assertWarns(UserWarning):
            duplicate = zipped([('empresas.json', b'{}'), ('empresas.json', b'{}')])
        self.assert_rejected(duplicate, 'zip', 'import_zip_duplicate_entry')
        self.assert_rejected(zipped([('empresas.json', b'{}'), ('EMPRESAS.JSON', b'{}')]), 'zip', 'import_zip_duplicate_entry')
        for mode in (stat.S_IFLNK | 0o777, stat.S_IFIFO | 0o600, stat.S_IFCHR | 0o600):
            info = zipfile.ZipInfo('empresas.json');info.create_system=3;info.external_attr=mode << 16
            self.assert_rejected(zipped([(info, b'{}')]), 'zip', 'import_zip_special_file')
        # Change both headers' encryption flags without invoking any decoder.
        data = bytearray(zipped([('empresas.json', b'{}')]))
        offset = data.find(b'PK\x01\x02');data[6] |= 1;data[offset + 8] |= 1
        self.assert_rejected(bytes(data), 'zip', 'import_zip_encrypted_or_unsupported')

    def test_zip_bounds_bomb_corrupt_and_preflight_before_read(self):
        self.assert_rejected(zipped([('empresas.json', b'x' * 500_000)]), 'zip', 'import_zip_expansion_ratio')
        self.assert_rejected(b'PKnotzip', 'zip', 'import_invalid_zip')
        with patch.object(files, 'MAX_ENTRIES', 1):
            self.assert_rejected(zipped([('empresas.json', b'{}'), ('lotes/x.json', b'[]')]), 'zip', 'import_zip_entry_limit')
        data = zipped([('empresas.json', b'{}'), ('evil.py', b'code')])
        with patch.object(zipfile.ZipFile, 'open', side_effect=AssertionError('no decompression before preflight')):
            self.assert_rejected(data, 'zip', 'import_zip_unauthorized_entry')
        data = zipped([('empresas.json', b'{}'), ('lotes/x.json', b'[]')], zipfile.ZIP_STORED)
        with patch.object(files, 'MAX_FILE_BYTES', len(data) - 1):
            self.assert_rejected(data, 'zip', 'import_file_too_large', 413)

    def test_zip_lot_join_and_orphans(self):
        record = company();record.pop('vagas')
        data = zipped([('novas-lote6.json', encoded([record])), ('lotes/empresa-teste.json', json.dumps([job()]))])
        self.assertEqual(files.parse_input(data, 'zip')['companies'][0]['vagas'], [job()])
        self.assert_rejected(zipped([('empresas.json', encoded()), ('lotes/empresa-teste.json', b'[]')]), 'zip', 'import_orphan_or_duplicate_lot')
        self.assert_rejected(zipped([('empresas.json', encoded()), ('lotes/other.json', b'[]')]), 'zip', 'import_orphan_or_duplicate_lot')

    def test_real_image_decode_suffix_dimensions_and_corruption(self):
        png = io.BytesIO();Image.new('RGB', (20, 20)).save(png, format='PNG')
        files.verify_logo(png.getvalue(), '.png')
        for data, suffix in ((b'not-image', '.png'), (png.getvalue(), '.jpeg'), (png.getvalue()[:40], '.png')):
            with self.assertRaises(files.ImportInputError):
                files.verify_logo(data, suffix)
        with patch.object(files, 'MAX_IMAGE_PIXELS', 20):
            with self.assertRaises(files.ImportInputError) as error:
                files.verify_logo(png.getvalue(), '.png')
            self.assertEqual(error.exception.code, 'import_image_limit')
        with patch.object(files, 'MAX_IMAGE_BYTES', 1):
            with self.assertRaises(files.ImportInputError):
                files.verify_logo(png.getvalue(), '.png')
        data = zipped([('empresas.json', encoded()), ('logos-small/empresa-teste.png', png.getvalue())])
        self.assertEqual(build_preview(data, 'zip')['totals']['logos'], 1)

    def test_csv_headers_encoding_duplicate_and_rows(self):
        rows = files.parse_input(csv_bytes([catalog_row()]), 'csv')['catalog']
        self.assertEqual(len(rows), 1)
        for data in (b'foo,bar\nx,y\n', b'fonte,fonte\nx,y\n', b'\xff', b'fonte\x00\n'):
            self.assert_rejected(data, 'csv')
        with patch.object(files, 'MAX_ROWS', 1):
            self.assert_rejected(csv_bytes([catalog_row(), catalog_row(id_fonte='two')]), 'csv', 'import_row_limit')
        dto = build_preview(csv_bytes([catalog_row()]), 'csv')
        self.assertIn('missing_description', [m['code'] for item in dto['items'] for m in item['messages']])

    def test_sqlite_read_only_hash_and_temporary_cleanup(self):
        data = sqlite_bytes([catalog_row()]);before = hashlib.sha256(data).hexdigest()
        original_connect = sqlite3.connect
        observed = []
        def connect(*args, **kwargs):
            self.assertIn('?mode=ro&immutable=1', args[0]);self.assertTrue(kwargs['uri'])
            observed.append(args[0].split('?')[0].removeprefix('file://'))
            return original_connect(*args, **kwargs)
        with patch.object(files.sqlite3, 'connect', side_effect=connect):
            result = files.sqlite_catalog(data)
        self.assertEqual(result[0]['descricao'], 'Descrição sintética')
        self.assertEqual(before, hashlib.sha256(data).hexdigest())
        self.assertTrue(observed)
        self.assertFalse(Path(observed[0]).exists())

    def test_sqlite_views_virtual_triggers_and_generated_sql_rejected(self):
        for data in (
            sqlite_bytes(schema='CREATE VIEW vagas AS SELECT load_extension(\'/tmp/evil\')'),
            sqlite_bytes(schema='CREATE VIRTUAL TABLE vagas USING fts5(titulo)'),
            sqlite_bytes(extra='CREATE VIEW attacker AS SELECT 1'),
            sqlite_bytes(extra='CREATE TRIGGER evil AFTER INSERT ON vagas BEGIN DELETE FROM vagas; END'),
            sqlite_bytes(extra='CREATE INDEX evil ON vagas(lower(titulo))'),
            b'bad-sqlite',
        ):
            with self.assertRaises(files.ImportInputError):
                files.sqlite_catalog(data)
        schema = 'CREATE TABLE vagas (' + ','.join(k + ' TEXT' for k in files.CATALOG_COLUMNS + ('descricao',)) + ',extra TEXT GENERATED ALWAYS AS (titulo),PRIMARY KEY(fonte,id_fonte))'
        with self.assertRaises(files.ImportInputError):
            files.sqlite_catalog(sqlite_bytes(schema=schema))

    def test_sqlite_time_instruction_and_row_bounds(self):
        data = sqlite_bytes([catalog_row(), catalog_row(id_fonte='two')])
        with patch.object(files, 'MAX_ROWS', 1):
            with self.assertRaises(files.ImportInputError) as error:
                files.sqlite_catalog(data)
            self.assertEqual(error.exception.code, 'import_row_limit')
        with patch.object(files, 'SQLITE_SECONDS', -1):
            with self.assertRaises(files.ImportInputError):
                files.sqlite_catalog(data)
        data = sqlite_bytes([catalog_row(id_fonte=str(i)) for i in range(1000)])
        with patch.object(files, 'SQLITE_INSTRUCTIONS', 0):
            with self.assertRaises(files.ImportInputError) as error:
                files.sqlite_catalog(data)
            self.assertEqual(error.exception.code, 'import_sqlite_rejected')

    def test_csv_sqlite_full_key_and_column_consistency(self):
        row = catalog_row()
        data = zipped([('catalogo/vagas.csv', csv_bytes([row])), ('catalogo/vagas.db', sqlite_bytes([row]))])
        self.assertEqual(files.parse_input(data, 'zip')['catalog'][0]['descricao'], row['descricao'])
        for rows in ([catalog_row(titulo='Different')], [catalog_row(id_fonte='other')], [], [row, catalog_row(id_fonte='two')]):
            self.assert_rejected(zipped([('catalogo/vagas.csv', csv_bytes([row])), ('catalogo/vagas.db', sqlite_bytes(rows))]), 'zip', 'import_catalog_inconsistent')
        self.assert_rejected(zipped([('catalogo/vagas.csv', csv_bytes([row, row])), ('catalogo/vagas.db', sqlite_bytes([row]))]), 'zip', 'import_catalog_inconsistent')

    def test_company_cnpj_slug_name_collision_and_immutable(self):
        snapshot = {'companies': [(1, '11.222.333/0001-81', 'Empresa Teste', None, 'empresa-teste'),
                                  (2, '11444777000161', 'Outra Empresa', None, 'outra')],
                    'reservations': {'empresa-teste': 1, 'outra': 2, 'old-reservation': None}, 'jobs': []}
        dto = build_preview(encoded(), 'json', snapshot)
        self.assertEqual(dto['items'][0]['action'], 'update')
        for slug in ('outra', 'old-reservation', 'new-identity'):
            dto = build_preview(encoded([company(slug=slug)]), 'json', snapshot)
            self.assertEqual(dto['items'][0]['action'], 'error')
        dto = build_preview(encoded([company(cnpj='11444777000161')]), 'json', snapshot)
        self.assertEqual(dto['items'][0]['action'], 'error')
        dto = build_preview(encoded([company(cnpj=None, slug=None)]), 'json', snapshot)
        self.assertEqual(dto['items'][0]['action'], 'review')

    def test_confidential_ambiguous_and_batch_company_collisions(self):
        for name in ('Confidencial', 'Empresa Confidencial'):
            dto = build_preview(encoded([company(nome_fantasia=name)]), 'json')
            self.assertEqual(dto['items'][0]['action'], 'review')
        for changes in ({'cnpj': '11222333000181', 'slug': 'another'}, {'cnpj': '11444777000161', 'slug': 'empresa-teste'}, {'cnpj': '11444777000161', 'slug': 'another', 'nome_fantasia': 'Empresa Teste'}):
            dto = build_preview(encoded([company(), company(**changes)]), 'json')
            self.assertEqual(dto['totals']['companies'], 2)
            self.assertEqual(dto['items'][0]['action'], 'error')
            self.assertNotEqual(dto['items'][1]['action'], 'create')

    def test_source_duplicate_collision_and_missing_recognized_keys(self):
        dto = build_preview(encoded([company(vagas=[job(), job()])]), 'json')
        self.assertEqual(dto['totals']['ignore'], 1)
        dto = build_preview(encoded([company(vagas=[job(), job(titulo='Other')])]), 'json')
        self.assertEqual(dto['totals']['error'], 2)
        dto = build_preview(encoded([company(), company(nome_fantasia='Other', cnpj='11444777000161', slug='other')]), 'json')
        self.assertEqual([x['action'] for x in dto['items'] if x['entity'] == 'job'], ['error', 'error'])
        dto = build_preview(encoded([company(vagas=[job(fonte=None, id_fonte=None, descricao='Fonte https://careers.gupy.io/jobs/123'), job(fonte=None, id_fonte=None, descricao='Fonte https://careers.gupy.io/jobs/123')])]), 'json')
        self.assertEqual(dto['totals']['ignore'], 1)
        for url in ('https://gupy.io.attacker.invalid/jobs/123', 'http://careers.gupy.io/jobs/123', 'https://careers.gupy.io/notjobs/123'):
            dto = build_preview(encoded([company(vagas=[job(fonte=None, id_fonte=None, descricao=url)])]), 'json')
            self.assertIn('missing_source_key', [m['code'] for m in dto['items'][1]['messages']])

    def test_live_duplicate_auxiliary_and_not_external_uniqueness(self):
        snapshot = {'companies': [(1, '11222333000181', 'Empresa Teste', None, 'empresa-teste')],
                    'reservations': {'empresa-teste': 1}, 'jobs': [(1, 'Analista', 'Curitiba')]}
        dto = build_preview(encoded(), 'json', snapshot)
        self.assertEqual(dto['items'][1]['action'], 'review')
        self.assertIn('possible_live_duplicate', [m['code'] for m in dto['items'][1]['messages']])
        self.assertIn('schema atual', ' '.join(dto['limitations']))

    def test_missing_long_html_taxonomy_url_and_admin_controls(self):
        record = company(is_member=True, max_active_jobs=99, vagas=[job(titulo='x' * 101, descricao='<script>PRIVATE</script>', cidade='', contrato='', modalidade='Híbrido', area='Other')])
        dto = build_preview(encoded([record]), 'json')
        codes = {m['code'] for item in dto['items'] for m in item['messages']}
        self.assertTrue({'field_too_long', 'html_review', 'missing_city', 'missing_contract', 'unknown_taxonomy', 'admin_control_ignored'} <= codes)
        self.assertNotIn('PRIVATE', json.dumps(dto))
        for url in ('http://example.invalid', 'https://user:secret@example.invalid', 'https://127.0.0.1', 'https://example.local', 'https://example.invalid\\@evil.invalid', 'https://localhost'):
            dto = build_preview(encoded([company(website=url)]), 'json')
            self.assertIn('invalid_url', [m['code'] for m in dto['items'][0]['messages']])

    def test_safe_labels_messages_and_aliases(self):
        for label in ('contact@example.invalid', '11.222.333/0001-81', '<script>private</script>', 'PRIVATE\nSECOND', 'jip_' + 'x' * 32, 'https://private.invalid'):
            dto = build_preview(encoded([company(nome_fantasia=label)]), 'json')
            self.assertNotIn(label, json.dumps(dto, ensure_ascii=False))
            self.assertEqual(dto['items'][0]['label'], 'Empresa')
        dto = build_preview(encoded([company(vagas=[job(title='Different')])]), 'json')
        self.assertIn('alias_collision', [m['code'] for m in dto['items'][1]['messages']])

    def test_scalar_types_salary_and_lengths_are_line_errors(self):
        for value in ([], {}, True, '100', -1, float('inf')):
            data = encoded([company(vagas=[job(min_salary=value)])])
            if value == float('inf'):
                self.assert_rejected(data, 'json', 'import_invalid_json')
            else:
                dto = build_preview(data, 'json')
                self.assertIn('invalid_salary', [m['code'] for m in dto['items'][1]['messages']])
        dto = build_preview(encoded([company(vagas=[job(min_salary=100, max_salary=50)])]), 'json')
        self.assertEqual(dto['items'][1]['action'], 'error')
        for field in ('modalidade', 'url', 'cidade', 'descricao', 'senioridade'):
            dto = build_preview(encoded([company(vagas=[job(**{field: {'private': 'value'}})])]), 'json')
            self.assertEqual(dto['items'][1]['action'], 'error')
        dto = build_preview(encoded([company(vagas=[job(uf='x'*51, salary_currency='x'*11)])]), 'json')
        self.assertEqual(dto['items'][1]['action'], 'error')

    def test_job_company_divergence_and_description_urls(self):
        dto = build_preview(encoded([company(vagas=[job(empresa='Outra Empresa')])]), 'json')
        self.assertIn('company_collision', [m['code'] for m in dto['items'][1]['messages']])
        dto = build_preview(encoded([company(vagas=[job(descricao='Veja https://127.0.0.1/private')])]), 'json')
        self.assertIn('invalid_url', [m['code'] for m in dto['items'][1]['messages']])
        self.assertNotIn('127.0.0.1', json.dumps(dto))
        dto = build_preview(encoded([company(vagas=[job(descricao='Veja https://source.example/jobs/1')])]), 'json')
        self.assertIn('external_url', [m['code'] for m in dto['items'][1]['messages']])

    def test_sqlite_malicious_writable_schema_and_field_limit(self):
        data = sqlite_bytes([catalog_row(descricao='x'*(files.MAX_FIELD_CHARS+1))])
        with self.assertRaises(files.ImportInputError):
            files.sqlite_catalog(data)
        data = sqlite_bytes([catalog_row()])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'malicious.db';path.write_bytes(data)
            connection = sqlite3.connect(path)
            connection.execute('PRAGMA writable_schema=ON')
            connection.execute("UPDATE sqlite_master SET sql='CREATE TABLE vagas (evil TEXT)' WHERE type='table' AND name='vagas'")
            connection.commit();connection.close()
            modified = path.read_bytes()
            with self.assertRaises(files.ImportInputError):
                files.sqlite_catalog(modified)
            self.assertEqual(path.read_bytes(), modified)


if __name__ == '__main__':
    unittest.main()
