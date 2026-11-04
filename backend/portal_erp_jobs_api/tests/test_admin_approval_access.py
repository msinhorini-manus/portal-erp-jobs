import unittest
import uuid
import sqlite3
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event
from unittest.mock import patch
from werkzeug.security import generate_password_hash

from tests.test_admin_wave0 import (
    AdminWaveZeroTests as BaseFixture, app, db, Admin, Company, CompanySite,
    CompanyStatus, CandidateSite, User, AdminAuditEvent, database_path,
)
from src.models.admin import AdminPermission


class AdminApprovalAccessTests(unittest.TestCase):
    setUpClass = classmethod(BaseFixture.setUpClass.__func__)
    tearDownClass = classmethod(BaseFixture.tearDownClass.__func__)
    setUp = BaseFixture.setUp
    _token = BaseFixture._token
    _headers = staticmethod(BaseFixture._headers)

    def test_registration_ignores_forged_approval_and_blocks_operations(self):
        nonce = uuid.uuid4().hex[:12]
        response = self.client.post('/api/auth/register/company', headers={'Host': 'jobs.portalerp.com.br'}, json={
            'email': f'pending-{nonce}@example.invalid', 'password': 'StrongPassword123',
            'name': f'Approval Pending {nonce}', 'cnpj': f'APR-{nonce}',
            'accept_terms': True, 'accept_privacy': True,
            'status': 'approved', 'site_status': 'approved', 'is_member': True,
            'approved_by': self.br_admin_id, 'approved_at': datetime.utcnow().isoformat(),
        })
        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload['user']['site_status'], CompanyStatus.PENDING)
        company_id = payload['user']['company_id']
        with app.app_context():
            presence = CompanySite.query.filter_by(company_id=company_id, site_id=self.br_id).one()
            self.assertEqual(presence.status, CompanyStatus.PENDING)
            self.assertIsNone(presence.approved_at)
            self.assertIsNone(presence.approved_by)
        headers = self._headers(payload['access_token'])
        self.assertEqual(self.client.post('/api/jobs/', headers=headers, json={'title': 'Blocked vacancy'}).status_code, 403)
        self.assertEqual(self.client.get('/api/candidates/search', headers=headers).status_code, 403)
        admin_headers = self._headers(self._token(self.br_admin_user_id, self.br_id, 'BR'))
        self.assertEqual(self.client.patch(f'/api/admin/companies/{company_id}/toggle-active', headers=admin_headers, json={'is_active': True}).status_code, 409)

    def test_suspended_company_cannot_bypass_approval_permission(self):
        with app.app_context():
            company = Company.query.get(self.company_id)
            company_user_id = company.user_id
            presence = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one()
            presence.status = CompanyStatus.SUSPENDED
            admin = Admin.query.filter_by(user_id=self.moderator_user_id).one()
            admin.update_permission(AdminPermission.MANAGE_COMPANIES, True)
            admin.update_permission(AdminPermission.MANAGE_USERS, True)
            db.session.commit()
        headers = self._headers(self._token(self.moderator_user_id, self.br_id, 'BR'))
        self.assertEqual(self.client.patch(f'/api/admin/companies/{self.company_id}/toggle-active', headers=headers, json={'is_active': True}).status_code, 403)
        self.assertEqual(self.client.patch(f'/api/admin/users/{company_user_id}/toggle-active', headers=headers).status_code, 403)
        self.assertEqual(self.client.post(f'/api/admin/companies/{self.company_id}/approve', headers=headers, json={}).status_code, 403)
        with app.app_context():
            self.assertEqual(CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one().status, CompanyStatus.SUSPENDED)

    def test_explicit_approval_records_admin_without_reactivating_global_account(self):
        with app.app_context():
            company = Company.query.get(self.company_id)
            User.query.get(company.user_id).is_active = False
            db.session.commit()
        headers = self._headers(self._token(self.br_admin_user_id, self.br_id, 'BR'))
        approved = self.client.post(f'/api/admin/companies/{self.company_id}/approve', headers=headers, json={})
        self.assertEqual(approved.status_code, 200)
        with app.app_context():
            presence = CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one()
            self.assertEqual(presence.status, CompanyStatus.APPROVED)
            self.assertEqual(presence.approved_by, self.br_admin_id)
            self.assertIsNotNone(presence.approved_at)
        company = self.client.get(f'/api/admin/companies/{self.company_id}', headers=headers).get_json()['company']
        self.assertFalse(company['global_active'])
        self.assertFalse(company['is_active'])
        self.assertEqual(company['site_status'], 'approved')

    def test_candidate_desired_status_is_idempotent_and_does_not_change_global_state(self):
        with app.app_context():
            User.query.get(self.br_candidate_user_id).is_active = False
            CandidateSite.query.filter_by(candidate_id=self.br_candidate_id, site_id=self.br_id).one().is_active = False
            db.session.commit()
        headers = self._headers(self._token(self.br_admin_user_id, self.br_id, 'BR'))
        path = f'/api/admin/candidates/{self.br_candidate_id}/toggle-active'
        self.assertEqual(self.client.patch(path, headers=headers, json={'is_active': 'true'}).status_code, 400)
        for _ in range(2):
            response = self.client.patch(path, headers=headers, json={'is_active': True})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.get_json()['is_active'])
        with app.app_context():
            self.assertTrue(CandidateSite.query.filter_by(candidate_id=self.br_candidate_id, site_id=self.br_id).one().is_active)
            self.assertFalse(User.query.get(self.br_candidate_user_id).is_active)
        listing = self.client.get('/api/admin/candidates?search=br-candidate%40example.invalid', headers=headers).get_json()['candidates'][0]
        self.assertFalse(listing['global_active'])
        self.assertTrue(listing['regional_active'])
        self.assertFalse(listing['is_active'])

    def test_company_filters_include_all_approval_states_and_owner_email(self):
        headers = self._headers(self._token(self.br_admin_user_id, self.br_id, 'BR'))
        for status in CompanyStatus.ALL:
            with app.app_context():
                CompanySite.query.filter_by(company_id=self.company_id, site_id=self.br_id).one().status = status
                db.session.commit()
            listing = self.client.get(f'/api/admin/companies?status={status}&search=br-company%40example.invalid', headers=headers)
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(listing.get_json()['total'], 1)
            for company in listing.get_json()['companies']:
                self.assertEqual(company['site_status'], status)

    def test_password_reset_token_can_only_be_consumed_once_concurrently(self):
        with app.app_context():
            user = User.query.get(self.br_candidate_user_id)
            token = user.generate_reset_token()
            db.session.commit()
        barrier = Barrier(2)
        original = User.verify_reset_token

        def synchronized_verify(user, supplied):
            valid = original(user, supplied)
            barrier.wait(timeout=10)
            return valid

        def reset(password):
            with app.test_client() as client:
                response = client.post('/api/auth/reset-password', headers={'Host': 'jobs.portalerp.com.br'}, json={'token': token, 'new_password': password})
                return response.status_code

        with patch.object(User, 'verify_reset_token', synchronized_verify):
            with ThreadPoolExecutor(max_workers=2) as pool:
                statuses = list(pool.map(reset, ['FirstStrongPassword123', 'SecondStrongPassword123']))
        self.assertEqual(sorted(statuses), [200, 400])
        with app.app_context():
            user = User.query.get(self.br_candidate_user_id)
            self.assertIsNone(user.reset_token)
            self.assertIsNone(user.reset_token_expires)
            self.assertTrue(user.check_password('FirstStrongPassword123') or user.check_password('SecondStrongPassword123'))

    def test_password_reset_rejects_malformed_values_without_internal_errors(self):
        for payload in ([1], {'token': ['invalid'], 'new_password': 'ValidPassword123'}, {'token': 'invalid', 'new_password': {'bad': 'shape'}}):
            response = self.client.post('/api/auth/reset-password', headers={'Host': 'jobs.portalerp.com.br'}, json=payload)
            self.assertEqual(response.status_code, 400)

    def test_reset_rejects_token_expiring_during_password_hash(self):
        with app.app_context():
            user = User.query.get(self.br_candidate_user_id)
            token = user.generate_reset_token()
            user.reset_token_expires = datetime.utcnow() + timedelta(milliseconds=300)
            db.session.commit()

        def delayed_hash(password):
            time.sleep(0.5)
            return generate_password_hash(password)

        with patch('src.routes.auth.generate_password_hash', delayed_hash):
            response = self.client.post('/api/auth/reset-password', headers={'Host': 'jobs.portalerp.com.br'}, json={'token': token, 'new_password': 'NewStrongPassword123'})
        self.assertEqual(response.status_code, 400)

    def test_reset_rejects_token_expiring_while_waiting_for_sqlite_write_lock(self):
        with app.app_context():
            user = User.query.get(self.br_candidate_user_id)
            token = user.generate_reset_token()
            user.reset_token_expires = datetime.utcnow() + timedelta(seconds=1)
            db.session.commit()
        hashed = Event()

        def signal_hash(password):
            value = generate_password_hash(password)
            hashed.set()
            return value

        def reset():
            with app.test_client() as client:
                return client.post('/api/auth/reset-password', headers={'Host': 'jobs.portalerp.com.br'}, json={'token': token, 'new_password': 'LockWaitPassword123'}).status_code

        connection = sqlite3.connect(database_path)
        connection.execute('BEGIN IMMEDIATE')
        try:
            with patch('src.routes.auth.generate_password_hash', signal_hash):
                with ThreadPoolExecutor(max_workers=1) as pool:
                    pending = pool.submit(reset)
                    try:
                        self.assertTrue(hashed.wait(timeout=5))
                        time.sleep(1.2)
                    finally:
                        connection.rollback()
                    self.assertEqual(pending.result(timeout=10), 400)
        finally:
            connection.close()


def load_tests(loader, tests, pattern):
    return loader.loadTestsFromTestCase(AdminApprovalAccessTests)


if __name__ == '__main__':
    unittest.main()
