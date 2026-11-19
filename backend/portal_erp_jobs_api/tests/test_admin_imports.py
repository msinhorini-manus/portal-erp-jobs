"""Run alone: global main uses a private tempfile SQLite, never an existing env."""
import hashlib
import io
import json
import os
import sqlite3
import tempfile
import unittest
import uuid
import zipfile
from datetime import datetime, timedelta
from unittest.mock import patch

fd, database_path = tempfile.mkstemp(prefix='jobs-import-api-', suffix='.db')
os.close(fd)
os.environ['PYTHON_DOTENV_DISABLED'] = '1'
os.environ['SECRET_KEY'] = 'imports-api-tests-secret-key-only-at-least-32'
os.environ['JWT_SECRET_KEY'] = 'imports-api-tests-jwt-key-only-at-least-32'
os.environ['DATABASE_URL'] = 'sqlite:///' + database_path
os.environ['FLASK_ENV'] = 'testing'
os.environ['IMPORT_PREVIEW_AGENT_TOKEN_SHA256'] = ''
os.environ['ALLOW_ADMIN_SETUP'] = 'false'

from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy import event, select
from src.main import app
from src.config import db
from src.models import Admin, AdminSite, AdminRole, User, Site, SiteDomain, SessionFamily, Company, CompanySite, Job
from src.routes.admin_imports import import_rate_limiter
from src.services.import_preview import identity_snapshot

HOST = 'jobs-br.invalid'
AGENT = 'jip_' + 'synthetic-testing-only-not-production' * 2
BASE = '/api/admin/importacoes'
DOCUMENT = {'empresas': [{'nome_fantasia': 'Empresa Sintética', 'cnpj': '11222333000181', 'slug': 'empresa-sintetica', 'vagas': [{'titulo': 'Analista', 'descricao': 'Texto sintético', 'cidade': 'Curitiba', 'contrato': 'clt', 'fonte': 'test', 'id_fonte': 'one'}]}]}


class ImportApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove();db.drop_all();db.engine.dispose()
        os.unlink(database_path)

    def setUp(self):
        import_rate_limiter.clear()
        app.config.update(IMPORT_PREVIEW_AGENT_TOKEN_SHA256='', IMPORT_PREVIEW_REQUEST_RATE_LIMIT=100,
                          IMPORT_PREVIEW_UPLOAD_RATE_LIMIT=100)
        with app.app_context():
            db.drop_all();db.create_all()
            self.site_ids = {}
            for code, host in (('BR', HOST), ('MX', 'jobs-mx.invalid')):
                site = Site(code=code, name=code, country_code=code, default_locale='pt-BR',
                            currency_code='BRL', timezone='America/Sao_Paulo', is_active=True)
                site.domains.append(SiteDomain(hostname=host, is_active=True, is_primary=True))
                db.session.add(site);db.session.flush();self.site_ids[code] = site.id
            self.users = {}
            for name, kind, platform, role in (
                ('platform', 'admin', True, AdminRole.SUPER_ADMIN), ('regional', 'admin', False, AdminRole.SUPER_ADMIN),
                ('lowerrole', 'admin', True, AdminRole.ADMIN), ('candidate', 'candidate', False, None),
                ('company', 'company', False, None),
            ):
                user = User(email=name+'@example.invalid', user_type=kind, is_active=True, password_hash='test-no-login')
                db.session.add(user);db.session.flush();self.users[name] = user.id
                if kind == 'admin':
                    admin = Admin(user_id=user.id, name=name, role=role, is_platform_admin=platform)
                    db.session.add(admin);db.session.flush()
                    db.session.add(AdminSite(admin_id=admin.id, site_id=self.site_ids['BR'], is_active=True))
            company = Company(user_id=self.users['company'], company_name='Empresa Sintética', cnpj='11.222.333/0001-81')
            db.session.add(company);db.session.flush();self.company_id = company.id
            db.session.add(CompanySite(company_id=company.id, site_id=self.site_ids['BR'], public_profile_slug='empresa-sintetica'))
            db.session.flush()
            db.session.add(Job(company_id=company.id, site_id=self.site_ids['BR'], title='Analista', city='Curitiba', description='Existing PRIVATE description'))
            db.session.commit()
        self.headers, self.family_id = self.token('platform')

    def token(self, name, code='BR', host=HOST, claims=None, refresh=False, expired=False):
        with app.app_context():
            user = db.session.get(User, self.users[name])
            family_id = str(uuid.uuid4())
            payload = {'family_id': family_id, 'site_id': self.site_ids[code], 'site_code': code, 'user_type': user.user_type}
            payload.update(claims or {})
            family = SessionFamily(user_id=user.id, site_id=self.site_ids[code], family_id=family_id,
                                   current_refresh_jti=str(uuid.uuid4()), expires_at=datetime.utcnow()+timedelta(days=1))
            db.session.add(family);db.session.commit()
            maker = create_refresh_token if refresh else create_access_token
            token = maker(identity=str(user.id), additional_claims=payload,
                          expires_delta=timedelta(seconds=-1) if expired else timedelta(minutes=10))
        return {'Host': host, 'Authorization': 'Bearer '+token}, family_id

    def agent_headers(self):
        app.config['IMPORT_PREVIEW_AGENT_TOKEN_SHA256'] = hashlib.sha256(AGENT.encode()).hexdigest()
        return {'Host': HOST, 'Authorization': 'Bearer '+AGENT}

    def snapshot(self):
        with sqlite3.connect(database_path) as connection:
            names = connection.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
            return [(name, connection.execute('SELECT * FROM "'+name+'"').fetchall()) for name, in names]

    def assert_error(self, response, status):
        self.assertEqual(response.status_code, status, response.get_json())
        self.assertEqual(set(response.get_json()), {'error', 'code'})
        self.assertIsInstance(response.get_json()['error'], str)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        self.assertNotIn(AGENT, response.get_data(as_text=True))

    def test_capabilities_exact_admin_agent_optional_and_rotation(self):
        response = self.client.get(BASE+'/capabilities', headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {'country_code': 'BR', 'preview_enabled': True, 'execution_enabled': False,
                         'agent_preview_configured': False, 'actor': 'platform_admin', 'max_file_bytes': 52428800, 'max_rows': 10000, 'formats': ['json', 'csv', 'zip']})
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        headers = {'Host': HOST, 'Authorization': 'Bearer '+AGENT}
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 401)
        self.agent_headers()
        self.assertEqual(self.client.get(BASE+'/capabilities', headers=headers).get_json()['actor'], 'agent')
        for value in ('', 'invalid', hashlib.sha256(b'rotated-synthetic').hexdigest()):
            app.config['IMPORT_PREVIEW_AGENT_TOKEN_SHA256'] = value
            self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 401)

    def test_constant_digest_namespace_and_invalid_tokens(self):
        headers = self.agent_headers()
        from src.routes import admin_imports
        with patch.object(admin_imports.hmac, 'compare_digest', wraps=admin_imports.hmac.compare_digest) as compare:
            self.assertEqual(self.client.get(BASE+'/capabilities', headers=headers).status_code, 200)
            compare.assert_called_once()
        for token in ('jip_short', 'jip_'+'a'*32, 'arbitrary-agent-token', 'garbage', ''):
            self.assert_error(self.client.get(BASE+'/capabilities', headers={'Host': HOST, 'Authorization': 'Bearer '+token}), 401)
        short = 'jip_short'
        app.config['IMPORT_PREVIEW_AGENT_TOKEN_SHA256'] = hashlib.sha256(short.encode()).hexdigest()
        self.assert_error(self.client.get(BASE+'/capabilities', headers={'Host': HOST, 'Authorization': 'Bearer '+short}), 401)

    def test_admin_roles_non_admin_and_missing_session(self):
        self.assert_error(self.client.get(BASE+'/capabilities', headers={'Host': HOST}), 401)
        for name in ('regional', 'lowerrole', 'candidate'):
            headers, _ = self.token(name)
            for path in ('capabilities', 'preview', 'confirm'):
                request = self.client.get if path == 'capabilities' else self.client.post
                self.assert_error(request(BASE+'/'+path, headers=headers), 403)
        # Company token revoked unless team context exists; either way no access.
        headers, _ = self.token('company')
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 401)

    def test_revoked_expired_inactive_and_missing_assignment(self):
        with app.app_context():
            SessionFamily.query.filter_by(family_id=self.family_id).one().revoked_at = datetime.utcnow();db.session.commit()
        self.assert_error(self.client.get(BASE+'/capabilities', headers=self.headers), 401)
        headers, _ = self.token('platform', expired=True)
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 401)
        headers, _ = self.token('platform', refresh=True)
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 401)
        headers, _ = self.token('platform')
        with app.app_context():
            db.session.get(User, self.users['platform']).is_active=False;db.session.commit()
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 401)
        with app.app_context():
            db.session.get(User, self.users['platform']).is_active=True
            AdminSite.query.filter_by(site_id=self.site_ids['BR']).update({'is_active': False});db.session.commit()
        headers, _ = self.token('platform')
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 403)

    def test_site_disabled_cross_country_host_claim_and_client_authority(self):
        self.assert_error(self.client.get(BASE+'/capabilities', headers={**self.headers, 'Host': 'unknown.invalid'}), 404)
        for headers in ({**self.headers, 'Host': 'jobs-mx.invalid'}, {**self.agent_headers(), 'Host': 'jobs-mx.invalid'}):
            self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 404)
        wrong, _ = self.token('platform', code='MX')
        self.assert_error(self.client.get(BASE+'/capabilities', headers=wrong), 403)
        self.assert_error(self.client.post(BASE+'/preview', json={**DOCUMENT, 'site_id': 1}, headers=self.headers), 400)
        self.assert_error(self.client.get(BASE+'/capabilities', headers={**self.headers, 'X-Site-Id': '1'}), 400)
        with app.app_context():
            db.session.get(Site, self.site_ids['BR']).is_active=False;db.session.commit()
        self.assert_error(self.client.get(BASE+'/capabilities', headers=self.headers), 404)
        self.assert_error(self.client.get(BASE+'/capabilities', headers=self.agent_headers()), 404)

    def test_confirm_admin_501_agent_denied_and_zero_changes(self):
        agent = self.agent_headers();before = self.snapshot()
        self.assert_error(self.client.post(BASE+'/confirm', json={'execute': True}, headers=self.headers), 501)
        self.assertEqual(self.client.post(BASE+'/confirm', headers=self.headers).get_json()['code'], 'import_execution_not_implemented')
        self.assert_error(self.client.post(BASE+'/confirm', headers=agent), 403)
        self.assertEqual(before, self.snapshot())

    def test_json_and_multipart_shared_engine_safe_and_no_business_sql(self):
        agent = self.agent_headers();before = self.snapshot();sql = []
        def capture(_conn, _cursor, statement, _parameters, _context, _many):
            sql.append(statement)
        with app.app_context():
            event.listen(db.engine, 'before_cursor_execute', capture)
            try:
                admin = self.client.post(BASE+'/preview', json=DOCUMENT, headers=self.headers)
                external = self.client.post(BASE+'/preview', json=DOCUMENT, headers=agent)
                upload = self.client.post(BASE+'/preview', data={'file': (io.BytesIO(json.dumps(DOCUMENT).encode()), 'sample.json')}, headers=agent)
            finally:
                event.remove(db.engine, 'before_cursor_execute', capture)
        for response in (admin, external, upload):
            self.assertEqual(response.status_code, 200, response.get_json())
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            self.assertEqual(response.get_json()['status'], 'preview_only')
            self.assertEqual(response.get_json()['totals']['companies'], 1)
            self.assertNotIn('Texto sintético', response.get_data(as_text=True))
            self.assertNotIn('11222333000181', response.get_data(as_text=True))
        self.assertEqual(admin.get_json(), external.get_json())
        self.assertEqual(admin.get_json()['totals'], upload.get_json()['totals'])
        self.assertFalse(any(s.lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER')) for s in sql))
        identity_sql = [s for s in sql if 'FROM jobs' in s or 'FROM companies' in s]
        self.assertTrue(identity_sql)
        self.assertTrue(all('description' not in s and 'phone' not in s and 'user_id' not in s for s in identity_sql))
        self.assertEqual(before, self.snapshot())

    def test_no_autoflush_and_foreign_identity_excluded(self):
        with app.app_context():
            pending = User(email='pending@example.invalid', user_type='candidate', password_hash='pending')
            db.session.add(pending)
            snapshot = identity_snapshot(self.site_ids['BR'])
            self.assertIsNone(pending.id)
            self.assertEqual(len(snapshot['companies']), 1)
            self.assertEqual(identity_snapshot(self.site_ids['MX'])['companies'], [])
            db.session.rollback()

    def test_file_errors_unsupported_private_and_no_echo(self):
        before = self.snapshot()
        for data, kind, status in ((b'{', 'application/json', 400), (b'[]', 'application/json', 422), (b'foo', 'text/plain', 400), (b'{"empresas": [], "senha":"PRIVATE"}', 'application/json', 422)):
            response = self.client.post(BASE+'/preview', data=data, content_type=kind, headers=self.headers)
            self.assert_error(response, status)
            self.assertNotIn('PRIVATE', response.get_data(as_text=True))
        self.assert_error(self.client.post(BASE+'/preview', data={'file': (io.BytesIO(b'code'), 'evil.py')}, headers=self.headers), 400)
        self.assert_error(self.client.post(BASE+'/preview', data={'other': 'private'}, content_type='multipart/form-data', headers=self.headers), 400)
        self.assertEqual(before, self.snapshot())

    def test_size_bounds_before_regional_or_file_read(self):
        self.assert_error(self.client.post(BASE+'/preview', data=b'{}', content_type='application/json', headers=self.headers,
                         environ_overrides={'CONTENT_LENGTH': str(52428801)}), 413)
        from src.routes import admin_imports
        with patch.object(admin_imports, 'bounded_read', side_effect=__import__('src.services.import_preview_files', fromlist=['ImportInputError']).ImportInputError('import_file_too_large', 413)):
            response = self.client.post(BASE+'/preview', data={'file': (io.BytesIO(b'{}'), 'file.json')}, headers=self.headers)
            self.assert_error(response, 413)

    def test_request_and_preview_limits_are_separate(self):
        app.config['IMPORT_PREVIEW_UPLOAD_RATE_LIMIT'] = 1
        self.assertEqual(self.client.post(BASE+'/preview', json=DOCUMENT, headers=self.headers).status_code, 200)
        limited = self.client.post(BASE+'/preview', json=DOCUMENT, headers=self.headers)
        self.assert_error(limited, 429);self.assertIn('Retry-After', limited.headers)
        self.assertEqual(self.client.get(BASE+'/capabilities', headers=self.headers).status_code, 200)
        import_rate_limiter.clear();app.config['IMPORT_PREVIEW_REQUEST_RATE_LIMIT'] = 1
        self.assertEqual(self.client.get(BASE+'/capabilities', headers=self.headers).status_code, 200)
        self.assert_error(self.client.get(BASE+'/capabilities', headers=self.headers), 429)

    def test_unexpected_error_sanitized_without_logging(self):
        with patch('src.routes.admin_imports.identity_snapshot', side_effect=RuntimeError('/private/path SECRET')), \
             patch.object(app.logger, 'error') as error_log:
            response = self.client.post(BASE+'/preview', json=DOCUMENT, headers=self.headers)
        self.assert_error(response, 500)
        self.assertNotIn('SECRET', response.get_data(as_text=True));error_log.assert_not_called()

    def test_csv_zip_uploads_duplicate_parts_and_preflight_no_identity_reads(self):
        from src.services.import_preview_files import CATALOG_COLUMNS
        import csv
        from werkzeug.datastructures import MultiDict
        agent = self.agent_headers()
        output = io.StringIO(newline='')
        writer = csv.DictWriter(output, CATALOG_COLUMNS);writer.writeheader()
        writer.writerow({key: {'fonte': 'test', 'id_fonte': 'one', 'titulo': 'Analista', 'empresa': 'Empresa Sintética'}.get(key, '') for key in CATALOG_COLUMNS})
        zipped = io.BytesIO()
        with zipfile.ZipFile(zipped, 'w') as archive:
            archive.writestr('empresas.json', json.dumps(DOCUMENT))
        before = self.snapshot()
        for data, filename in ((output.getvalue().encode(), 'catalog.csv'), (zipped.getvalue(), 'batch.zip')):
            response = self.client.post(BASE+'/preview', data={'file': (io.BytesIO(data), filename)}, headers=agent)
            self.assertEqual(response.status_code, 200, response.get_json())
            self.assertEqual(response.get_json()['totals']['jobs'], 1)
        duplicate = MultiDict([('file', (io.BytesIO(b'{}'), 'one.json')), ('file', (io.BytesIO(b'{}'), 'two.json'))])
        self.assert_error(self.client.post(BASE+'/preview', data=duplicate, headers=agent), 400)
        with patch('src.routes.admin_imports.identity_snapshot', side_effect=AssertionError('must not read business identities')) as snapshot:
            response = self.client.post(BASE+'/preview', data={'file': (io.BytesIO(b'notzip'), 'bad.zip')}, headers=agent)
            self.assert_error(response, 400)
            snapshot.assert_not_called()
        self.assertEqual(before, self.snapshot())

    def test_deep_json_parser_and_incompatible_admin_claim(self):
        data = b'[' * 2000 + b'0' + b']' * 2000
        response = self.client.post(BASE+'/preview', data=data, content_type='application/json', headers=self.headers)
        # Parser recursion failure is 400; a valid parsed but excessive
        # structure is 422. Both are safe, non-executing contract errors.
        self.assertIn(response.status_code, (400, 422))
        self.assert_error(response, response.status_code)
        headers, _ = self.token('platform', claims={'user_type': 'candidate'})
        self.assert_error(self.client.get(BASE+'/capabilities', headers=headers), 403)


if __name__ == '__main__':
    unittest.main()
