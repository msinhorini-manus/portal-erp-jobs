"""Run in its own process: .venv/bin/python -m unittest discover -s tests -p test_admin_access.py.

This module owns a temporary SQLite database; do not combine discovery with
other modules that initialize the global application against their own DB.
"""
import hashlib
import json
import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from flask_jwt_extended import create_access_token, create_refresh_token

fd, database_path = tempfile.mkstemp(prefix='portal-erp-jobs-access-', suffix='.db')
os.close(fd)
os.environ['SECRET_KEY'] = 'access-tests-secret-key-at-least-thirty-two'
os.environ['JWT_SECRET_KEY'] = 'access-tests-jwt-key-at-least-thirty-two'
os.environ['DATABASE_URL'] = f'sqlite:///{database_path}'
os.environ['CORS_ORIGINS'] = 'https://jobs.portalerp.com.br'
os.environ['ALLOW_ADMIN_SETUP'] = 'false'
os.environ['FLASK_ENV'] = 'testing'

from src.config import db  # noqa: E402
from src.main import app  # noqa: E402
from src.models import (  # noqa: E402
    Admin, AdminAuditEvent, AdminPermission, AdminRole, AdminSite,
    Candidate, CandidateSite, Company, CompanySite, CompanyStatus,
    CompanyUser, CompanyUserRole, SessionFamily, Site, SiteDomain, SiteLocale, User,
)
from src.rate_limit import auth_rate_limiter  # noqa: E402

PASSWORD = 'ValidPassword123'
BR_HOST = 'jobs.portalerp.com.br'
MX_HOST = 'jobs-mx.invalid'


class AdminAccessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()
        with app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()
        os.unlink(database_path)

    def setUp(self):
        auth_rate_limiter.clear()
        app.config.update(AUTH_LOGIN_RATE_LIMIT=100, AUTH_LOGIN_RATE_WINDOW=900)
        with app.app_context():
            db.drop_all()
            db.create_all()
            sites = []
            for code, host, locale, currency, timezone_name in (
                ('BR', BR_HOST, 'pt-BR', 'BRL', 'America/Sao_Paulo'),
                ('MX', MX_HOST, 'es-MX', 'MXN', 'America/Mexico_City'),
            ):
                site = Site(
                    code=code, name=code, country_code=code, default_locale=locale,
                    currency_code=currency, timezone=timezone_name,
                    canonical_origin=f'https://{host}', is_active=True,
                )
                site.domains.append(SiteDomain(hostname=host, is_primary=True, is_active=True))
                site.locales.append(SiteLocale(locale=locale, is_default=True, is_active=True))
                sites.append(site)
            db.session.add_all(sites)
            db.session.flush()
            self.br_id, self.mx_id = [site.id for site in sites]
            self.users = {}
            kinds = {
                'platform': 'admin', 'regional': 'admin', 'moderator': 'admin',
                'foreign_admin': 'admin', 'candidate': 'candidate',
                'foreign_candidate': 'candidate', 'owner': 'company',
                'member': 'company', 'inactive_member': 'company',
                'foreign_owner': 'company', 'foreign_member': 'company',
                'legacy_owner': 'company',
            }
            for name, user_type in kinds.items():
                user = User(email=f'{name}@example.invalid', user_type=user_type, is_active=True)
                user.set_password(PASSWORD)
                db.session.add(user)
                db.session.flush()
                self.users[name] = user.id
            for name, role, platform, site_id in (
                ('platform', AdminRole.SUPER_ADMIN, True, self.br_id),
                ('regional', AdminRole.SUPER_ADMIN, False, self.br_id),
                ('moderator', AdminRole.MODERATOR, False, self.br_id),
                ('foreign_admin', AdminRole.SUPER_ADMIN, False, self.mx_id),
            ):
                admin = Admin(user_id=self.users[name], name=name, role=role, is_platform_admin=platform)
                admin.set_role(role)
                db.session.add(admin)
                db.session.flush()
                db.session.add(AdminSite(admin_id=admin.id, site_id=site_id, is_active=True))
            self.candidate_id = None
            for name, site_id, first_name, last_name in (
                ('candidate', self.br_id, 'Candidato', 'Brasil'),
                ('foreign_candidate', self.mx_id, 'Candidato', 'Mexico'),
            ):
                candidate = Candidate(user_id=self.users[name], first_name=first_name, last_name=last_name)
                db.session.add(candidate)
                db.session.flush()
                db.session.add(CandidateSite(candidate_id=candidate.id, site_id=site_id, is_active=True, is_discoverable=True))
                if name == 'candidate':
                    self.candidate_id = candidate.id
                    db.session.add(CandidateSite(candidate_id=candidate.id, site_id=self.mx_id, is_active=False, is_discoverable=False))
            company = Company(user_id=self.users['owner'], company_name='Empresa Global Azul')
            foreign = Company(user_id=self.users['foreign_owner'], company_name='Empresa Exterior Secreta')
            legacy = Company(user_id=self.users['legacy_owner'], company_name='Empresa Legada')
            db.session.add_all([company, foreign, legacy])
            db.session.flush()
            self.company_id, self.foreign_company_id, self.legacy_company_id = company.id, foreign.id, legacy.id
            db.session.add_all([
                CompanySite(company_id=company.id, site_id=self.br_id, status=CompanyStatus.PENDING, display_name='Empresa Regional Verde'),
                CompanySite(company_id=company.id, site_id=self.mx_id, status=CompanyStatus.APPROVED),
                CompanySite(company_id=foreign.id, site_id=self.mx_id, status=CompanyStatus.APPROVED),
                CompanySite(company_id=legacy.id, site_id=self.br_id, status=CompanyStatus.PENDING),
            ])
            self.members = {}
            for name, company_id, role, active, accepted in (
                ('owner', company.id, CompanyUserRole.OWNER, True, True),
                ('member', company.id, CompanyUserRole.HR, True, True),
                ('inactive_member', company.id, CompanyUserRole.VIEWER, False, False),
                ('foreign_owner', foreign.id, CompanyUserRole.OWNER, True, True),
                ('foreign_member', foreign.id, CompanyUserRole.HR, True, True),
            ):
                member = CompanyUser(company_id=company_id, user_id=self.users[name], name=f'Pessoa {name}', role=role, is_active=active, invitation_accepted=accepted)
                db.session.add(member)
                db.session.flush()
                self.members[name] = member.id
            db.session.commit()
        self.headers = self._session('platform')[0]

    def _session(self, name, *, site_id=None, code='BR', host=BR_HOST):
        with app.app_context():
            user = db.session.get(User, self.users[name])
            claims = {'site_id': site_id or self.br_id, 'site_code': code, 'user_type': user.user_type, 'family_id': str(uuid.uuid4())}
            if user.user_type == 'company':
                claims['company_id'] = self.foreign_company_id if name.startswith('foreign') else self.company_id
            if user.user_type == 'admin':
                claims['admin_id'] = Admin.query.filter_by(user_id=user.id).one().id
            refresh_jti = str(uuid.uuid4())
            family = SessionFamily(user_id=user.id, site_id=claims['site_id'], family_id=claims['family_id'], current_refresh_jti=refresh_jti, expires_at=datetime.utcnow() + timedelta(days=1))
            db.session.add(family)
            access = create_access_token(identity=str(user.id), additional_claims=claims)
            refresh = create_refresh_token(identity=str(user.id), additional_claims={**claims, 'jti': refresh_jti})
            db.session.commit()
        return {'Authorization': f'Bearer {access}', 'Host': host}, refresh

    def _action(self, name, action, data=None, headers=None):
        payload = {'admin_password': PASSWORD, 'reason': 'Solicitação administrativa validada'}
        if data is not None:
            payload.update(data)
        method = self.client.put if action == 'global-status' else self.client.post
        return method(f'/api/admin/access-users/{self.users[name]}/{action}', json=payload, headers=headers or self.headers)

    def _snapshot(self):
        with app.app_context():
            return {
                'users': [(u.id, u.is_active, u.password_hash, u.password_changed_at, u.failed_login_attempts, u.locked_until, u.reset_token, u.reset_token_expires) for u in User.query.order_by(User.id)],
                'candidate_sites': [(s.id, s.is_active, s.is_discoverable) for s in CandidateSite.query.order_by(CandidateSite.id)],
                'company_sites': [(s.id, s.status, s.approval_reason) for s in CompanySite.query.order_by(CompanySite.id)],
                'members': [(m.id, m.role, m.is_active, m.invitation_accepted) for m in CompanyUser.query.order_by(CompanyUser.id)],
                'sessions': [(s.id, s.revoked_at) for s in SessionFamily.query.order_by(SessionFamily.id)],
                'audits': AdminAuditEvent.query.count(),
            }

    def _listing(self, query=''):
        response = self.client.get('/api/admin/access-users?per_page=100' + query, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        return response.get_json()

    @staticmethod
    def _raw_token(response):
        parsed = urlparse(response.get_json()['reset_url'])
        if 'token' in parse_qs(parsed.query):
            raise AssertionError('Token must not be emitted in the HTTP query string')
        return parse_qs(parsed.fragment)['token'][0]

    def test_reactivation_revokes_preexisting_families_of_an_already_inactive_account(self):
        old_access, old_refresh = self._session('candidate')
        with app.app_context():
            db.session.get(User, self.users['candidate']).is_active = False
            db.session.commit()
        self.assertEqual(self.client.get('/api/auth/me', headers=old_access).status_code, 401)
        response = self._action('candidate', 'global-status', {'is_active': True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me', headers=old_access).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/refresh', headers={'Host': BR_HOST, 'Authorization': f'Bearer {old_refresh}'}).status_code, 401)

    def _consume(self, token, password='ReplacementPassword456'):
        return self.client.post('/api/auth/reset-password', json={'token': token, 'new_password': password}, headers={'Host': BR_HOST})

    def test_capabilities_for_platform_regional_and_moderator(self):
        for name, platform, approve in (('platform', True, True), ('regional', False, True), ('moderator', False, False)):
            headers = self.headers if name == 'platform' else self._session(name)[0]
            response = self.client.get('/api/admin/access-capabilities', headers=headers)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {'is_platform_admin': platform, 'can_approve_companies': approve})
            self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_company_approval_capability_uses_permission(self):
        with app.app_context():
            admin = Admin.query.filter_by(user_id=self.users['regional']).one()
            admin.set_role(AdminRole.ADMIN)
            admin.update_permission(AdminPermission.APPROVE_COMPANIES, False)
            db.session.commit()
        response = self.client.get('/api/admin/access-capabilities', headers=self._session('regional')[0])
        self.assertFalse(response.get_json()['can_approve_companies'])

    def test_all_access_user_routes_require_platform_guard(self):
        for name in ('regional', 'moderator', 'candidate', 'owner'):
            headers = self._session(name)[0]
            before = self._snapshot()
            response = self.client.get('/api/admin/access-users', headers=headers)
            self.assertEqual(response.status_code, 403)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            for action in ('unlock', 'password-reset', 'global-status'):
                response = self._action('candidate', action, {'is_active': False}, headers)
                self.assertEqual(response.status_code, 403)
            self.assertEqual(before, self._snapshot())

    def test_unauthenticated_and_inactive_assignment(self):
        response = self.client.get('/api/admin/access-users', headers={'Host': BR_HOST})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        with app.app_context():
            admin = Admin.query.filter_by(user_id=self.users['platform']).one()
            AdminSite.query.filter_by(admin_id=admin.id, site_id=self.br_id).one().is_active = False
            db.session.commit()
        self.assertEqual(self.client.get('/api/admin/access-users', headers=self.headers).status_code, 403)

    def test_platform_flag_alone_does_not_bypass_super_admin_guard(self):
        with app.app_context():
            admin = Admin.query.filter_by(user_id=self.users['platform']).one()
            admin.set_role(AdminRole.ADMIN)
            db.session.commit()
        self.assertEqual(self.client.get('/api/admin/access-users', headers=self.headers).status_code, 403)

    def test_listing_is_local_excludes_admins_and_includes_inactive_members(self):
        data = self._listing()
        expected = {self.users[name] for name in ('candidate', 'owner', 'member', 'inactive_member', 'legacy_owner')}
        self.assertEqual({u['id'] for u in data['users']}, expected)
        self.assertEqual(data['total'], len(expected))
        member = next(u for u in data['users'] if u['id'] == self.users['inactive_member'])
        self.assertEqual(member['company_id'], self.company_id)
        self.assertFalse(member['company_member_active'])
        self.assertFalse(member['regional_active'])
        self.assertEqual(member['company_status'], 'pending')
        self.assertEqual(member['company_role'], 'viewer')
        self.assertIsNone(member['candidate_id'])
        candidate = next(u for u in data['users'] if u['id'] == self.users['candidate'])
        self.assertEqual(candidate['candidate_id'], self.candidate_id)
        self.assertTrue(candidate['regional_active'])
        for key in ('company_id', 'company_name', 'company_role', 'company_member_active', 'company_status'):
            self.assertIsNone(candidate[key])
        self.assertEqual(set(candidate), {'id', 'email', 'name', 'user_type', 'global_active', 'login_locked', 'failed_login_attempts', 'candidate_id', 'regional_active', 'company_id', 'company_name', 'company_role', 'company_member_active', 'company_status'})

    def test_search_by_company_finds_every_associated_account(self):
        expected = {self.users[n] for n in ('owner', 'member', 'inactive_member')}
        for search in ('Empresa%20Global%20Azul', 'Empresa%20Regional%20Verde'):
            self.assertEqual({u['id'] for u in self._listing('&search=' + search)['users']}, expected)
        self.assertEqual(self._listing('&search=Empresa%20Exterior%20Secreta')['total'], 0)

    def test_search_member_candidate_and_email_is_literal(self):
        for search, expected in (('Pessoa%20inactive_member', 'inactive_member'), ('Candidato%20Brasil', 'candidate'), ('member%40example.invalid', 'member')):
            ids = {u['id'] for u in self._listing('&search=' + search)['users']}
            self.assertIn(self.users[expected], ids)
        self.assertEqual(self._listing('&search=%25')['total'], 0)
        self.assertEqual(self._listing('&search=%27%20OR%201%3D1')['total'], 0)

    def test_pagination_and_type_validation(self):
        response = self.client.get('/api/admin/access-users?page=2&per_page=2', headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['current_page'], 2)
        self.assertEqual(response.get_json()['pages'], 3)
        self.assertEqual(len(response.get_json()['users']), 2)
        self.assertEqual(self._listing('&type=candidate')['total'], 1)
        self.assertEqual(self._listing('&type=company')['total'], 4)
        for query in ('page=0', 'per_page=-1', 'page=nan', 'type=admin', 'type=foo', 'search=' + 'a' * 256):
            response = self.client.get('/api/admin/access-users?' + query, headers=self.headers)
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_cross_site_admin_targets_and_missing_targets_are_404(self):
        before = self._snapshot()
        for name in ('foreign_candidate', 'foreign_owner', 'foreign_member', 'platform', 'regional', 'foreign_admin'):
            for action in ('global-status', 'unlock', 'password-reset'):
                response = self._action(name, action, {'is_active': False})
                self.assertEqual(response.status_code, 404, (name, action, response.get_json()))
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
        response = self.client.post('/api/admin/access-users/999999/unlock', json={'admin_password': PASSWORD, 'reason': 'Motivo'}, headers=self.headers)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(before, self._snapshot())

    def test_site_claim_and_explicit_assignment_are_required_even_platform(self):
        wrong_host = {**self.headers, 'Host': MX_HOST}
        self.assertEqual(self.client.get('/api/admin/access-users', headers=wrong_host).status_code, 403)
        headers = self._session('platform', site_id=self.mx_id, code='MX', host=MX_HOST)[0]
        self.assertEqual(self.client.get('/api/admin/access-users', headers=headers).status_code, 403)
        with app.app_context():
            admin = Admin.query.filter_by(user_id=self.users['platform']).one()
            db.session.add(AdminSite(admin_id=admin.id, site_id=self.mx_id, is_active=True))
            db.session.commit()
        response = self.client.get('/api/admin/access-users?per_page=100', headers=headers)
        self.assertEqual(response.status_code, 200)
        ids = {u['id'] for u in response.get_json()['users']}
        self.assertNotIn(self.users['legacy_owner'], ids)
        self.assertIn(self.users['foreign_member'], ids)

    def test_wrong_reauth_has_no_mutations_and_no_echo(self):
        for password in ('IncorrectSECRET', None, 123, [], {}, 'x' * 1025):
            for action in ('global-status', 'unlock', 'password-reset'):
                before = self._snapshot()
                response = self._action('candidate', action, {'admin_password': password, 'is_active': False})
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
                self.assertNotIn('IncorrectSECRET', response.get_data(as_text=True))
                self.assertEqual(before, self._snapshot())

    def test_locked_admin_cannot_reauthenticate(self):
        with app.app_context():
            user = db.session.get(User, self.users['platform'])
            user.failed_login_attempts = 5
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
        before = self._snapshot()
        self.assertEqual(self._action('candidate', 'unlock').status_code, 403)
        self.assertEqual(before, self._snapshot())

    def test_invalid_reasons_and_non_boolean_status_have_no_effect(self):
        for reason in (None, False, 123, [], {}, '', '   ', 'a' * 501, 'Motivo\ncom controle', '\x7f'):
            for action in ('global-status', 'unlock', 'password-reset'):
                before = self._snapshot()
                response = self._action('candidate', action, {'reason': reason, 'is_active': False})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(before, self._snapshot())
        for value in (None, 'true', 'false', 0, 1, [], {}):
            before = self._snapshot()
            self.assertEqual(self._action('candidate', 'global-status', {'is_active': value}).status_code, 400)
            self.assertEqual(before, self._snapshot())
        response = self.client.post(f'/api/admin/access-users/{self.users["candidate"]}/unlock', json=['bad'], headers=self.headers)
        self.assertEqual(response.status_code, 400)

    def test_global_disable_revokes_all_target_sessions_no_collateral(self):
        target_br, refresh_br = self._session('candidate')
        target_mx, refresh_mx = self._session('candidate', site_id=self.mx_id, code='MX', host=MX_HOST)
        other, other_refresh = self._session('member')
        before = self._snapshot()
        response = self._action('candidate', 'global-status', {'is_active': False, 'reason': 'a' * 500})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['scope'], 'global')
        self.assertFalse(response.get_json()['user']['global_active'])
        self.assertTrue(response.get_json()['user']['regional_active'])
        after = self._snapshot()
        for key in ('candidate_sites', 'company_sites', 'members'):
            self.assertEqual(before[key], after[key])
        with app.app_context():
            families = SessionFamily.query.filter_by(user_id=self.users['candidate']).all()
            self.assertEqual(len(families), 2)
            self.assertTrue(all(f.revoked_at for f in families))
            self.assertTrue(all(not f.revoked_at for f in SessionFamily.query.filter(SessionFamily.user_id != self.users['candidate'])))
        for headers, refresh in ((target_br, refresh_br), (target_mx, refresh_mx)):
            self.assertEqual(self.client.get('/api/auth/me', headers=headers).status_code, 401)
            self.assertEqual(self.client.post('/api/auth/refresh', headers={**headers, 'Authorization': 'Bearer ' + refresh}).status_code, 401)
        self.assertEqual(self.client.get('/api/auth/me', headers=other).status_code, 200)
        self.assertEqual(self.client.get('/api/admin/access-capabilities', headers=self.headers).status_code, 200)

    def test_reactivation_does_not_restore_old_sessions_or_regional_flags(self):
        target, refresh = self._session('candidate')
        self.assertEqual(self._action('candidate', 'global-status', {'is_active': False}).status_code, 200)
        with app.app_context():
            CandidateSite.query.filter_by(candidate_id=self.candidate_id, site_id=self.br_id).one().is_active = False
            db.session.commit()
        response = self._action('candidate', 'global-status', {'is_active': True})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()['user']['global_active'])
        self.assertFalse(response.get_json()['user']['regional_active'])
        self.assertEqual(self.client.get('/api/auth/me', headers=target).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/refresh', headers={**target, 'Authorization': 'Bearer ' + refresh}).status_code, 401)

    def test_company_individual_global_status_does_not_disable_owner_or_team(self):
        member_headers, _ = self._session('member')
        owner_headers, _ = self._session('owner')
        before = self._snapshot()
        self.assertEqual(self._action('member', 'global-status', {'is_active': False}).status_code, 200)
        with app.app_context():
            self.assertTrue(db.session.get(User, self.users['owner']).is_active)
            self.assertFalse(db.session.get(User, self.users['member']).is_active)
            self.assertTrue(db.session.get(CompanyUser, self.members['member']).is_active)
            self.assertTrue(db.session.get(CompanyUser, self.members['member']).invitation_accepted)
        self.assertEqual(self.client.get('/api/auth/me', headers=member_headers).status_code, 401)
        self.assertEqual(self.client.get('/api/auth/me', headers=owner_headers).status_code, 200)
        after = self._snapshot()
        self.assertEqual(before['members'], after['members'])
        self.assertEqual(before['company_sites'], after['company_sites'])

    def test_global_reactivated_company_stays_pending_and_protected_apis_blocked(self):
        for name in ('owner', 'member'):
            self.assertEqual(self._action(name, 'global-status', {'is_active': False}).status_code, 200)
            self.assertEqual(self._action(name, 'global-status', {'is_active': True}).status_code, 200)
            login = self.client.post('/api/auth/login/company', json={'email': f'{name}@example.invalid', 'password': PASSWORD}, headers={'Host': BR_HOST})
            self.assertEqual(login.status_code, 200)
            self.assertEqual(login.get_json()['user']['site_status'], 'pending')
            headers = {'Authorization': 'Bearer ' + login.get_json()['access_token'], 'Host': BR_HOST}
            response = self.client.post('/api/company-team/invitations', json={'email': 'invite@example.invalid', 'name': 'Invite', 'role': 'viewer'}, headers=headers)
            self.assertEqual(response.status_code, 403, response.get_json())
        with app.app_context():
            self.assertEqual(CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one().status, CompanyStatus.PENDING)

    def test_inactive_member_operations_never_activate_or_accept_invitation(self):
        with app.app_context():
            user = db.session.get(User, self.users['inactive_member'])
            user.is_active = False
            user.failed_login_attempts = 5
            user.locked_until = datetime.utcnow() + timedelta(minutes=10)
            db.session.commit()
        before = self._snapshot()
        for action, data in (('global-status', {'is_active': True}), ('unlock', {}), ('password-reset', {})):
            response = self._action('inactive_member', action, data)
            self.assertEqual(response.status_code, 200)
        self.assertEqual(before['members'], self._snapshot()['members'])
        self.assertEqual(before['company_sites'], self._snapshot()['company_sites'])
        login = self.client.post('/api/auth/login/company', json={'email': 'inactive_member@example.invalid', 'password': PASSWORD}, headers={'Host': BR_HOST})
        self.assertEqual(login.status_code, 403)

    def test_unlock_only_clears_target_lock_and_not_activity_password_or_sessions(self):
        self._session('candidate')
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            target.is_active = False
            target.failed_login_attempts = 9
            target.locked_until = datetime.utcnow() + timedelta(minutes=15)
            other = db.session.get(User, self.users['member'])
            other.failed_login_attempts = 7
            other.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
        before = self._snapshot()
        response = self._action('candidate', 'unlock')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()['user']['login_locked'])
        self.assertFalse(response.get_json()['user']['global_active'])
        after = self._snapshot()
        for key in ('sessions', 'candidate_sites', 'company_sites', 'members'):
            self.assertEqual(before[key], after[key])
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            self.assertEqual(target.failed_login_attempts, 0)
            self.assertIsNone(target.locked_until)
            self.assertTrue(target.check_password(PASSWORD))
            self.assertEqual(db.session.get(User, self.users['member']).failed_login_attempts, 7)

    def test_listing_displays_current_lock_not_expired_lock(self):
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            target.failed_login_attempts = 5
            target.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
        dto = self._listing('&type=candidate')['users'][0]
        self.assertTrue(dto['login_locked'])
        self.assertEqual(dto['failed_login_attempts'], 5)
        with app.app_context():
            db.session.get(User, self.users['candidate']).locked_until = datetime.utcnow() - timedelta(seconds=1)
            db.session.commit()
        self.assertFalse(self._listing('&type=candidate')['users'][0]['login_locked'])

    def test_reset_issuance_hash_only_one_hour_manual_and_no_other_changes(self):
        target_headers, _ = self._session('candidate')
        before = self._snapshot()
        started = datetime.now(timezone.utc)
        response = self._action('candidate', 'password-reset')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        data = response.get_json()
        self.assertEqual(set(data), {'message', 'reset_url', 'expires_at', 'delivery'})
        self.assertEqual(data['delivery'], 'manual')
        parsed = urlparse(data['reset_url'])
        self.assertEqual((parsed.scheme, parsed.netloc, parsed.path), ('https', BR_HOST, '/redefinir-senha'))
        self.assertEqual(parse_qs(parsed.query)['type'], ['candidate'])
        self.assertEqual(set(parse_qs(parsed.query)), {'type'})
        self.assertEqual(set(parse_qs(parsed.fragment)), {'token'})
        token = self._raw_token(response)
        expiry = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
        self.assertTrue(3598 <= (expiry - started).total_seconds() <= 3601)
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            self.assertEqual(target.reset_token, hashlib.sha256(token.encode()).hexdigest())
            self.assertNotEqual(target.reset_token, token)
            self.assertTrue(target.check_password(PASSWORD))
            self.assertTrue(target.verify_reset_token(token))
            audits = json.dumps([event.details for event in AdminAuditEvent.query])
            self.assertNotIn(token, audits)
            self.assertNotIn(data['reset_url'], audits)
        after = self._snapshot()
        for key in ('sessions', 'candidate_sites', 'company_sites', 'members'):
            self.assertEqual(before[key], after[key])
        self.assertEqual(before['users'][self.users['candidate'] - 1][:6], after['users'][self.users['candidate'] - 1][:6])
        self.assertEqual(self.client.get('/api/auth/me', headers=target_headers).status_code, 200)

    def test_company_reset_url_type_for_owner_member_inactive_and_legacy(self):
        for name in ('owner', 'member', 'inactive_member', 'legacy_owner'):
            response = self._action(name, 'password-reset')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(parse_qs(urlparse(response.get_json()['reset_url']).query)['type'], ['company'])

    def test_new_reset_invalidates_old_and_consumption_is_one_use(self):
        first = self._raw_token(self._action('candidate', 'password-reset'))
        second = self._raw_token(self._action('candidate', 'password-reset'))
        self.assertNotEqual(first, second)
        self.assertEqual(self._consume(first).status_code, 400)
        self.assertEqual(self._consume(second).status_code, 200)
        self.assertEqual(self._consume(second, 'AnotherPassword789').status_code, 400)
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            self.assertTrue(target.check_password('ReplacementPassword456'))
            self.assertIsNone(target.reset_token)
            self.assertIsNone(target.reset_token_expires)

    def test_expired_reset_cannot_change_password_or_sessions(self):
        token = self._raw_token(self._action('candidate', 'password-reset'))
        self._session('candidate')
        with app.app_context():
            db.session.get(User, self.users['candidate']).reset_token_expires = datetime.utcnow() - timedelta(seconds=1)
            db.session.commit()
        before = self._snapshot()
        self.assertEqual(self._consume(token).status_code, 400)
        self.assertEqual(before, self._snapshot())

    def test_reset_consume_clears_lock_revokes_every_session_only_target(self):
        target_headers, target_refresh = self._session('candidate')
        mx_headers, mx_refresh = self._session('candidate', site_id=self.mx_id, code='MX', host=MX_HOST)
        other_headers, _ = self._session('member')
        token = self._raw_token(self._action('candidate', 'password-reset'))
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            target.failed_login_attempts = 5
            target.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
        before = self._snapshot()
        self.assertEqual(self._consume(token, 'weak').status_code, 400)
        self.assertEqual(before, self._snapshot())
        self.assertEqual(self._consume(token).status_code, 200)
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            self.assertEqual(target.failed_login_attempts, 0)
            self.assertIsNone(target.locked_until)
            self.assertTrue(target.check_password('ReplacementPassword456'))
            self.assertTrue(all(s.revoked_at for s in SessionFamily.query.filter_by(user_id=target.id)))
            self.assertTrue(all(not s.revoked_at for s in SessionFamily.query.filter(SessionFamily.user_id != target.id)))
        for headers, refresh in ((target_headers, target_refresh), (mx_headers, mx_refresh)):
            self.assertEqual(self.client.get('/api/auth/me', headers=headers).status_code, 401)
            self.assertEqual(self.client.post('/api/auth/refresh', headers={**headers, 'Authorization': 'Bearer ' + refresh}).status_code, 401)
        self.assertEqual(self.client.get('/api/auth/me', headers=other_headers).status_code, 200)
        self.assertEqual(before['candidate_sites'], self._snapshot()['candidate_sites'])

    def test_reset_consumption_never_reactivates_global_or_pending_company(self):
        self.assertEqual(self._action('inactive_member', 'global-status', {'is_active': False}).status_code, 200)
        token = self._raw_token(self._action('inactive_member', 'password-reset'))
        self.assertEqual(self._consume(token).status_code, 200)
        with app.app_context():
            self.assertFalse(db.session.get(User, self.users['inactive_member']).is_active)
            member = db.session.get(CompanyUser, self.members['inactive_member'])
            self.assertFalse(member.is_active)
            self.assertFalse(member.invitation_accepted)
            self.assertEqual(CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one().status, CompanyStatus.PENDING)

    def test_reset_origin_is_canonical_and_ignores_forwarded_host(self):
        response = self._action('candidate', 'password-reset', headers={**self.headers, 'X-Forwarded-Host': 'attacker.invalid', 'Forwarded': 'host=attacker.invalid'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(urlparse(response.get_json()['reset_url']).netloc, BR_HOST)
        with app.app_context():
            site = db.session.get(Site, self.br_id)
            site.domains.append(SiteDomain(hostname='trusted-alias.invalid', url_prefix='', is_primary=False, is_active=True))
            db.session.commit()
        response = self._action('candidate', 'password-reset', headers={**self.headers, 'Host': 'trusted-alias.invalid'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(urlparse(response.get_json()['reset_url']).netloc, BR_HOST)

    def test_invalid_untrusted_or_missing_origin_leaves_previous_token_unchanged(self):
        old_token = self._raw_token(self._action('candidate', 'password-reset'))
        for origin in (None, 'http://' + BR_HOST, 'https://attacker.invalid', f'https://{BR_HOST}/path', f'https://{BR_HOST}?secret=1', f'https://user:pass@{BR_HOST}', f'https://{BR_HOST}\\@attacker.invalid', f'https://{BR_HOST}\n', 'https://[::1]', f'https://{BR_HOST}:bad'):
            with app.app_context():
                # Bypass model validation to emulate legacy/corrupt database data.
                Site.query.filter_by(id=self.br_id).update({'canonical_origin': origin})
                db.session.commit()
            before = self._snapshot()
            response = self._action('candidate', 'password-reset')
            self.assertEqual(response.status_code, 503, origin)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            self.assertEqual(before, self._snapshot())
            with app.app_context():
                self.assertTrue(db.session.get(User, self.users['candidate']).verify_reset_token(old_token))

    def test_audit_metadata_contains_no_pii_password_token_or_free_reason(self):
        secret_reason = 'candidate@example.invalid ' + PASSWORD + ' private-token-value'
        self.assertEqual(self._action('candidate', 'global-status', {'is_active': True, 'reason': secret_reason}).status_code, 200)
        self.assertEqual(self._action('candidate', 'unlock', {'reason': secret_reason}).status_code, 200)
        response = self._action('candidate', 'password-reset', {'reason': secret_reason})
        token = self._raw_token(response)
        with app.app_context():
            events = AdminAuditEvent.query.order_by(AdminAuditEvent.id).all()
            self.assertEqual({e.action for e in events}, {'user.global_status_changed', 'user.login_unlocked', 'user.password_reset_issued'})
            self.assertTrue(all(e.site_id == self.br_id and e.target_id == str(self.users['candidate']) for e in events))
            serialized = json.dumps([e.to_dict() for e in events])
            for value in ('candidate@example.invalid', PASSWORD, 'private-token-value', token, response.get_json()['reset_url'], secret_reason):
                self.assertNotIn(value, serialized)
            self.assertTrue(all(e.details['scope'] == 'global' and e.details['reason_provided'] is True for e in events))

    def test_shared_action_rate_limit_blocks_target_and_endpoint_rotation(self):
        app.config['AUTH_LOGIN_RATE_LIMIT'] = 2
        self.assertEqual(self._action('candidate', 'unlock', {'admin_password': 'wrong'}).status_code, 403)
        self.assertEqual(self._action('member', 'password-reset', {'admin_password': 'wrong'}).status_code, 403)
        before = self._snapshot()
        response = self._action('owner', 'global-status', {'is_active': False})
        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response.headers['Retry-After']), 0)
        self.assertEqual(response.headers['Cache-Control'], 'no-store')
        self.assertEqual(before, self._snapshot())

    def test_transaction_rolls_back_mutation_and_audit_on_commit_failure(self):
        for action in ('global-status', 'unlock', 'password-reset'):
            before = self._snapshot()
            with patch('src.routes.admin_access.db.session.commit', side_effect=RuntimeError('SQL contains PasswordSECRET tokenSECRET')):
                response = self._action('candidate', action, {'is_active': False})
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            self.assertNotIn('PasswordSECRET', response.get_data(as_text=True))
            self.assertNotIn('tokenSECRET', response.get_data(as_text=True))
            self.assertEqual(before, self._snapshot())

    def test_mutation_rolls_back_if_audit_creation_fails(self):
        before = self._snapshot()
        with patch('src.routes.admin_access._audit_admin', side_effect=RuntimeError('SECRET')):
            response = self._action('candidate', 'global-status', {'is_active': False})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(before, self._snapshot())

    def test_logout_remains_family_scoped_and_revokes_old_admin_authority(self):
        first_headers, first_refresh = self._session('platform')
        second_headers, _ = self._session('platform')
        response = self.client.post('/api/auth/logout', headers=first_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/admin/access-users', headers=first_headers).status_code, 401)
        self.assertEqual(self.client.get('/api/admin/access-users', headers=second_headers).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/refresh', headers={**first_headers, 'Authorization': 'Bearer ' + first_refresh}).status_code, 401)

    def test_historical_inactive_memberships_never_expose_foreign_company(self):
        with app.app_context():
            db.session.add(CompanyUser(company_id=self.foreign_company_id, user_id=self.users['inactive_member'], name='Nome Exterior Secreto', role=CompanyUserRole.HR, is_active=True, invitation_accepted=True))
            db.session.commit()
        dto = next(u for u in self._listing()['users'] if u['id'] == self.users['inactive_member'])
        self.assertEqual(dto['company_id'], self.company_id)
        self.assertEqual(dto['name'], 'Pessoa inactive_member')
        self.assertFalse(dto['company_member_active'])
        self.assertEqual(self._listing('&search=Nome%20Exterior%20Secreto')['total'], 0)
        self.assertEqual(self._listing('&search=Empresa%20Exterior%20Secreta')['total'], 0)
        self.assertEqual(self._action('inactive_member', 'unlock').status_code, 200)

    def test_global_actions_preserve_every_company_status_and_team_membership(self):
        for status in (CompanyStatus.PENDING, CompanyStatus.APPROVED, CompanyStatus.REJECTED, CompanyStatus.SUSPENDED):
            with app.app_context():
                membership = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one()
                membership.status = status
                membership.approval_reason = 'Decisão regional prévia'
                db.session.commit()
            before = self._snapshot()
            for action, data in (('global-status', {'is_active': False}), ('global-status', {'is_active': True}), ('unlock', {}), ('password-reset', {})):
                self.assertEqual(self._action('member', action, data).status_code, 200)
            after = self._snapshot()
            self.assertEqual(before['company_sites'], after['company_sites'])
            self.assertEqual(before['members'], after['members'])

    def test_reset_issuance_does_not_clear_existing_lock_or_revoke_sessions(self):
        self._session('candidate')
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            target.failed_login_attempts = 8
            target.locked_until = datetime.utcnow() + timedelta(minutes=15)
            target.is_active = False
            db.session.commit()
        before = self._snapshot()
        response = self._action('candidate', 'password-reset')
        self.assertEqual(response.status_code, 200)
        after = self._snapshot()
        self.assertEqual(before['sessions'], after['sessions'])
        with app.app_context():
            target = db.session.get(User, self.users['candidate'])
            self.assertFalse(target.is_active)
            self.assertTrue(target.is_locked())
            self.assertEqual(target.failed_login_attempts, 8)
            self.assertTrue(target.check_password(PASSWORD))

    def test_company_reset_consumption_keeps_pending_approval_enforced(self):
        token = self._raw_token(self._action('owner', 'password-reset'))
        self.assertEqual(self._consume(token).status_code, 200)
        login = self.client.post('/api/auth/login/company', json={'email': 'owner@example.invalid', 'password': 'ReplacementPassword456'}, headers={'Host': BR_HOST})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.get_json()['user']['site_status'], 'pending')
        headers = {'Authorization': 'Bearer ' + login.get_json()['access_token'], 'Host': BR_HOST}
        response = self.client.post('/api/company-team/invitations', json={'email': 'invited@example.invalid', 'name': 'Invited', 'role': 'viewer'}, headers=headers)
        self.assertEqual(response.status_code, 403)

    def test_successful_actions_also_consume_shared_rate_limit(self):
        app.config['AUTH_LOGIN_RATE_LIMIT'] = 2
        self.assertEqual(self._action('candidate', 'unlock').status_code, 200)
        self.assertEqual(self._action('member', 'password-reset').status_code, 200)
        before = self._snapshot()
        self.assertEqual(self._action('owner', 'global-status', {'is_active': False}).status_code, 429)
        self.assertEqual(before, self._snapshot())


if __name__ == '__main__':
    unittest.main()
