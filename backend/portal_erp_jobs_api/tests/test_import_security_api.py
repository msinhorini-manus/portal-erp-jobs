"""Security acceptance gates; run alone, inherits only synthetic setup helpers."""
import io
import json
import unittest
from datetime import datetime
from unittest.mock import patch

import test_admin_imports as fixture
from src.services import import_preview_files as files


class SecurityApiGates(fixture.ImportApiTests):
    def assert_no_body(self, headers, status, query=''):
        data = b'{"empresas":[],"metadata":[' + b'0,' * 350000 + b'0]}'
        from flask.wrappers import Request
        with patch.object(Request, 'get_data', side_effect=AssertionError('unauthorized BODY read')), \
             patch.object(Request, 'get_json', side_effect=AssertionError('unauthorized JSON')), \
             patch('src.routes.admin_imports.parse_json', side_effect=AssertionError('unauthorized document loads')), \
             patch('src.routes.admin_imports.identity_snapshot') as snapshot:
            response = self.client.post(fixture.BASE + '/preview' + query, data=data,
                                        content_type='application/json', headers=headers)
            self.assertEqual(response.status_code, status)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            snapshot.assert_not_called()

    def test_no_body_missing_invalid_agent_invalid_signature_scheme(self):
        self.assert_no_body({'Host': fixture.HOST}, 401)
        self.assert_no_body({'Host': fixture.HOST, 'Authorization': 'Bearer jip_' + 'x' * 40}, 401)
        headers = self.agent_headers()
        self.assert_no_body({**headers, 'Authorization': 'Basic ' + fixture.AGENT}, 401)
        with patch.dict(fixture.app.config, {'JWT_TOKEN_LOCATION': ['json']}):
            self.assert_no_body(self.headers, 401)
        token = self.headers['Authorization'].split()[1]
        parts = token.split('.')
        parts[2] = ('A' if parts[2][0] != 'A' else 'B') + parts[2][1:]
        self.assert_no_body({**self.headers, 'Authorization': 'Bearer ' + '.'.join(parts)}, 401)

    def test_no_body_candidate_company_regional_lowerrole_claim_mismatch(self):
        for actor in ('candidate', 'regional', 'lowerrole'):
            headers, _ = self.token(actor)
            self.assert_no_body(headers, 403)
        headers, _ = self.token('company')
        self.assert_no_body(headers, 401)
        headers, _ = self.token('platform', claims={'user_type': 'candidate'})
        self.assert_no_body(headers, 403)

    def test_no_body_expired_refresh_revoked_inactive_missing_assignment(self):
        for options in ({'expired': True}, {'refresh': True}):
            headers, _ = self.token('platform', **options)
            self.assert_no_body(headers, 401)
        with fixture.app.app_context():
            fixture.SessionFamily.query.filter_by(family_id=self.family_id).one().revoked_at = datetime.utcnow()
            fixture.db.session.commit()
        self.assert_no_body(self.headers, 401)
        headers, _ = self.token('platform')
        with fixture.app.app_context():
            fixture.db.session.get(fixture.User, self.users['platform']).is_active = False
            fixture.db.session.commit()
        self.assert_no_body(headers, 401)
        with fixture.app.app_context():
            fixture.db.session.get(fixture.User, self.users['platform']).is_active = True
            fixture.AdminSite.query.filter_by(site_id=self.site_ids['BR']).update({'is_active': False})
            fixture.db.session.commit()
        self.assert_no_body(headers, 403)

    def test_no_body_untrusted_host_prefix_header_query_cross_region(self):
        agent = self.agent_headers()
        for changes, status in (({'Host': 'unknown.invalid'}, 404), ({'Host': 'jobs-mx.invalid'}, 404),
                                ({'X-Regional-Host': fixture.HOST}, 400), ({'X-Regional-Prefix': '/br'}, 400),
                                ({'X-Site-Id': '1'}, 400)):
            self.assert_no_body({**agent, **changes}, status)
        self.assert_no_body(agent, 400, '?site_code=BR')
        headers, _ = self.token('platform', code='MX')
        self.assert_no_body(headers, 403)

    def test_authorized_big_structures_rejected_before_any_document_load(self):
        documents = (
            (b'{"empresas":[],"metadata":[' + b'0,' * 350000 + b'0]}', 'import_row_limit'),
            (b'[' * 2000 + b'0' + b']' * 2000, 'import_structure_limit'),
            (b'{"empresas":[],"metadata":"' + b'x' * (files.MAX_FIELD_CHARS + 1) + b'"}', 'import_field_limit'),
        )
        original = files.json.loads
        def credential_only(value, **kwargs):
            # PyJWT legitimately parses its small decoded header/claims using
            # this shared stdlib module; only uploaded documents are forbidden.
            if len(value) > 2000 or 'empresas' in str(value):
                raise AssertionError('document materialized')
            return original(value, **kwargs)
        for headers in (self.headers, self.agent_headers()):
            for data, code in documents:
                with patch.object(files.json, 'loads', side_effect=credential_only), \
                     patch.object(fixture.app.json, 'loads', side_effect=credential_only), \
                     patch('src.routes.admin_imports.identity_snapshot') as snapshot:
                    response = self.client.post(fixture.BASE + '/preview', data=data,
                                                content_type='application/json', headers=headers)
                    self.assertEqual(response.status_code, 422)
                    self.assertIn(code.encode(), response.data)
                    snapshot.assert_not_called()

    def test_one_document_load_shared_with_global_regional_and_engine(self):
        original = files.json.loads
        observed = []
        def loads(*args, **kwargs):
            result = original(*args, **kwargs)
            if isinstance(result, dict) and 'empresas' in result:
                observed.append(result)
            return result
        data = json.dumps(fixture.DOCUMENT).encode()
        with patch.object(files.json, 'loads', side_effect=loads), \
             patch.object(fixture.app.json, 'loads', side_effect=AssertionError('redundant Flask document load')):
            response = self.client.post(fixture.BASE + '/preview', data=data,
                                        content_type='application/json', headers=self.headers)
            self.assertEqual(response.status_code, 200)
        self.assertEqual(len(observed), 1)

    def test_trusted_loopback_prefix_and_body_authority_global_boundary_preserved(self):
        with fixture.app.app_context():
            fixture.db.session.add(fixture.SiteDomain(hostname='regional.invalid', url_prefix='/br',
                                                    site_id=self.site_ids['BR'], is_active=True))
            fixture.db.session.commit()
        headers = {**self.headers, 'Host': 'localhost', 'X-Regional-Host': 'regional.invalid', 'X-Regional-Prefix': '/br'}
        response = self.client.post(fixture.BASE + '/preview', json=fixture.DOCUMENT, headers=headers,
                                    environ_overrides={'REMOTE_ADDR': '127.0.0.1'})
        self.assertEqual(response.status_code, 200)
        for key in ('site_id', 'siteId', 'site_code', 'siteCode'):
            response = self.client.post(fixture.BASE + '/preview', json={**fixture.DOCUMENT, key: 1},
                                        headers=self.headers)
            self.assert_error(response, 400)
            self.assertEqual(response.get_json()['code'], 'import_invalid_request')

    def test_multipart_json_prescan_and_confirm_agent_prebody(self):
        data = b'{"empresas":[],"metadata":[' + b'0,' * 11000 + b'0]}'
        original = files.json.loads
        def credential_only(value, **kwargs):
            if len(value) > 2000 or 'empresas' in str(value):
                raise AssertionError('multipart document materialized')
            return original(value, **kwargs)
        with patch.object(files.json, 'loads', side_effect=credential_only):
            response = self.client.post(fixture.BASE + '/preview', data={'file': (io.BytesIO(data), 'file.json')},
                                        headers=self.headers)
            self.assertEqual(response.status_code, 422)
        from flask.wrappers import Request
        with patch.object(Request, 'get_data', side_effect=AssertionError('agent confirm BODY')):
            response = self.client.post(fixture.BASE + '/confirm', data=b'{}', content_type='application/json',
                                        headers=self.agent_headers())
            self.assertEqual(response.status_code, 403)
        with patch.object(Request, 'get_data', side_effect=AssertionError('OPTIONS BODY read')), \
             patch.object(Request, 'get_json', side_effect=AssertionError('OPTIONS JSON parse')):
            response = self.client.options(fixture.BASE + '/preview', data=b'{"empresas":[]}',
                                           content_type='application/json', headers={'Host': fixture.HOST})
            self.assertEqual(response.status_code, 400)


# unittest discovery sees only the eight new methods, not inherited baseline.
for _name in fixture.ImportApiTests.__dict__:
    if _name.startswith('test_'):
        setattr(SecurityApiGates, _name, None)

if __name__ == '__main__':
    unittest.main()
