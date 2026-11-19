"""Public counts regressions. Run alone with DATABASE_URL unset; private SQLite only.

Uses the wave4 schema/fixtures, not live data, network, migrations or email.
"""
from contextlib import contextmanager
from datetime import datetime, timedelta
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import sqlalchemy as sa
from sqlalchemy.exc import SQLAlchemyError
import test_jobs_wave4 as fixtures
from src.config import db
from src.main import app
from src.models import Candidate, CandidateSite, Company, CompanySite, CompanyStatus, Job, Site, SiteDomain, SiteLocale, User
from src.models.job import JobSkill, Skill
from src.models.job_area import JobArea
from src.models.technology import Technology
from src.services.public_job_counts import company_job_counts, public_jobs_query, public_companies_query
from src.services.jobs import text_contains


class PublicCategoryStatsTests(unittest.TestCase):
    HOST = fixtures.JobsWave4Tests.HOST
    setUp = fixtures.JobsWave4Tests.setUp
    _token = fixtures.JobsWave4Tests._token
    _headers = fixtures.JobsWave4Tests._headers

    @classmethod
    def setUpClass(cls):
        # Fail closed before schema reset if someone forgets the documented command.
        uri = app.config['SQLALCHEMY_DATABASE_URI']
        if uri != f'sqlite:///{fixtures.database_path}' or not fixtures.database_path.startswith('/tmp/portal-erp-jobs-wave4-'):
            raise RuntimeError('This suite requires the private wave4 SQLite database')
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        fixtures.JobsWave4Tests.tearDownClass.__func__(cls)

    def get(self, path, *, args=None, headers=None):
        result = self.client.get(path, query_string=args, headers=headers or self.HOST)
        self.assertEqual(result.status_code, 200, result.get_json())
        return result.get_json()

    def dashboard(self, **kwargs):
        return self.get('/api/stats/dashboard', **kwargs)

    def job(self, **values):
        defaults = dict(company_id=self.company_id, site_id=self.site_id,
                        title='Public vacancy', description='Description',
                        is_active=True, status='active')
        defaults.update(values)
        row = Job(**defaults)
        db.session.add(row)
        db.session.flush()
        return row

    def make_company(self, name, *, site_id=None, status='approved', owner_active=True, slug=True):
        row = Company(company_name=name, user=User(email=f'{name}@example.invalid',
                       user_type='company', is_active=owner_active))
        db.session.add(row)
        db.session.flush()
        if slug:
            membership = CompanySite(company_id=row.id, site_id=site_id or self.site_id,
                                     status=status, display_name=name)
            db.session.add(membership)
            db.session.flush()
        else:
            # Supported rollback-only legacy insertion, preserving NULL slug.
            db.session.execute(sa.insert(CompanySite.__table__).values(
                company_id=row.id, site_id=site_id or self.site_id,
                status=status, public_profile_slug=None))
        return row

    def make_candidate(self, name, *, site_id=None, active=True, user_active=True, discoverable=False):
        row = Candidate(user=User(email=f'{name}@example.invalid', user_type='candidate',
                                 is_active=user_active), first_name=name, last_name='Fixture')
        db.session.add(row)
        db.session.flush()
        db.session.add(CandidateSite(candidate_id=row.id, site_id=site_id or self.site_id,
                       is_active=active, is_discoverable=discoverable))
        return row

    def mexico(self, *, prefix=False):
        site = Site(code='MX', name='Mexico', country_code='MX', default_locale='es-MX',
                    currency_code='MXN', timezone='America/Mexico_City',
                    canonical_origin='https://jobs.portalerp.com', is_active=True)
        site.domains.append(SiteDomain(hostname='jobs.portalerp.com' if prefix else 'mx.example.invalid',
                            url_prefix='/mx' if prefix else '', is_active=True, is_primary=True))
        site.locales.append(SiteLocale(locale='es-MX', is_default=True, is_active=True))
        db.session.add(site)
        db.session.flush()
        return site

    def assert_catalog_matches_urls(self, endpoint, key):
        plain = self.get(f'/api/config/{endpoint}')
        self.assertTrue(all('job_count' not in row for row in plain))
        enriched = self.get(f'/api/config/{endpoint}', args={'include_counts': 'true'})
        self.assertEqual(plain, [{k: v for k, v in row.items() if k != 'job_count'} for row in enriched])
        for row in enriched:
            with self.subTest(endpoint=endpoint, name=row['name']):
                total = self.get('/api/jobs/', args={key: row['name'], 'per_page': 1})['total']
                self.assertEqual(row['job_count'], total)
                self.assertIs(type(row['job_count']), int)
        return enriched

    @contextmanager
    def sql_capture(self):
        statements = []
        def listener(_conn, _cursor, statement, _params, _context, _executemany):
            if statement.lstrip().upper().startswith('SELECT'):
                statements.append(statement)
        with app.app_context():
            engine = db.engine
            sa.event.listen(engine, 'before_cursor_execute', listener)
        try:
            yield statements
        finally:
            sa.event.remove(engine, 'before_cursor_execute', listener)

    def test_dashboard_contract_zeros_and_enrolled_optout(self):
        payload = self.dashboard()
        self.assertEqual(payload, {'active_jobs': 0, 'total_companies': 2, 'total_candidates': 1})
        self.assertTrue(all(type(value) is int for value in payload.values()))
        self.assertEqual(set(payload), {'active_jobs', 'total_companies', 'total_candidates'})
        self.assertNotIn('email', str(payload))

    def test_dashboard_exact_public_lifecycle_and_confidential_jobs(self):
        with app.app_context():
            self.job()
            self.job(status='approved', expires_at=datetime.utcnow() + timedelta(days=2))
            self.job(is_company_hidden=True)
            self.job(expires_at=datetime.utcnow() - timedelta(days=2))
            self.job(is_active=False)
            for status in ('pending', 'rejected', 'closed', 'inactive', 'archived'):
                self.job(status=status)
            pending = self.make_company('pending-company', status='pending')
            self.job(company_id=pending.id)
            db.session.commit()
        self.assertEqual(self.dashboard()['active_jobs'], 3)
        self.assertEqual(self.dashboard()['active_jobs'], self.get('/api/jobs/')['total'])

    def test_general_jobs_do_not_gain_owner_or_slug_checks(self):
        with app.app_context():
            owner_off = self.make_company('disabled-owner', owner_active=False)
            legacy = self.make_company('legacy-null', slug=False)
            for company in (owner_off, legacy):
                row = self.job(company_id=company.id, title='Python', area='Legacy area')
                row.skills.extend([JobSkill(skill_id=self.python_id), JobSkill(skill_id=self.python_id)])
            db.session.add(JobArea(name='Legacy area'))
            db.session.commit()
        self.assertEqual(self.dashboard()['active_jobs'], 2)
        self.assertEqual(self.dashboard()['total_companies'], 2)
        self.assertEqual(self.get('/api/jobs/')['total'], 2)
        self.assert_catalog_matches_urls('areas', 'area')
        self.assert_catalog_matches_urls('skills', 'tech')

    def test_company_dashboard_equals_directory_with_zero_job_companies(self):
        with app.app_context():
            self.make_company('no-vacancies')
            self.make_company('pending', status='pending')
            self.make_company('suspended', status='suspended')
            self.make_company('rejected', status='rejected')
            self.make_company('inactive-owner', owner_active=False)
            self.make_company('absent-slug', slug=False)
            db.session.commit()
        directory = self.get('/api/companies/search')
        self.assertEqual(directory['total'], 3)
        self.assertEqual(self.dashboard()['total_companies'], directory['total'])
        self.assertTrue(all(row['active_jobs_count'] == 0 for row in directory['companies']))

    def test_candidate_count_active_enrollment_and_global_user_not_optin(self):
        with app.app_context():
            self.make_candidate('optout', discoverable=False)
            self.make_candidate('discoverable', discoverable=True)
            self.make_candidate('inactive-enrollment', active=False, discoverable=True)
            self.make_candidate('inactive-account', user_active=False, discoverable=True)
            no_membership = Candidate(user=User(email='unenrolled@example.invalid', user_type='candidate'))
            db.session.add(no_membership)
            mx = self.mexico()
            self.make_candidate('foreign-candidate', site_id=mx.id)
            db.session.add(CandidateSite(candidate_id=self.candidate_id, site_id=mx.id, is_active=True))
            db.session.commit()
        self.assertEqual(self.dashboard()['total_candidates'], 3)

    def test_areas_legacy_text_canonical_name_substring_and_zero(self):
        with app.app_context():
            area = JobArea(name='Dados & Analytics')
            broad = JobArea(name='Dados')
            zero = JobArea(name='No jobs')
            inactive = JobArea(name='Inactive catalog', is_active=False)
            db.session.add_all([area, broad, zero, inactive])
            db.session.flush()
            self.job(area='Consultoria Dados & Analytics legado')
            self.job(area_id=area.id, area='Unrelated legacy')
            self.job(area_id=area.id, area=area.name, is_company_hidden=True)
            self.job(area=area.name, expires_at=datetime.utcnow() - timedelta(days=1))
            self.job(area=area.name, status='pending')
            db.session.commit()
        counts = self.assert_catalog_matches_urls('areas', 'area')
        self.assertEqual({row['name']: row['job_count'] for row in counts},
                         {'Dados': 3, 'Dados & Analytics': 3, 'No jobs': 0})

    def test_technology_skill_text_or_dedup_and_zero(self):
        with app.app_context():
            m2m = self.job(title='Different title')
            m2m.skills.extend([JobSkill(skill_id=self.python_id), JobSkill(skill_id=self.python_id)])
            both = self.job(title='Python role', description='python', requirements='PYTHON')
            both.skills.append(JobSkill(skill_id=self.python_id))
            self.job(title='Python title')
            self.job(description='Python description')
            self.job(requirements='Python requirements', is_company_hidden=True)
            self.job(title='Python expired', expires_at=datetime.utcnow() - timedelta(days=1))
            self.job(title='Python pending', status='pending')
            db.session.add(Skill(name='No vacancies'))
            db.session.commit()
        counts = self.assert_catalog_matches_urls('skills', 'tech')
        self.assertEqual(next(row['job_count'] for row in counts if row['name'] == 'Python'), 5)
        self.assertEqual(next(row['job_count'] for row in counts if row['name'] == 'No vacancies'), 0)

    def test_names_accents_wildcards_quotes_backslash_unicode(self):
        with app.app_context():
            names = ['Gestão & ERP', 'C++', 'C#', "O'Reilly", r'100%_C:\ERP', 'ação', 'Ｍｅｇａ']
            for name in names:
                area = JobArea(name=name)
                skill = Skill(name=name)
                db.session.add_all([area, skill])
                db.session.flush()
                self.job(title=name, area=name)
            self.job(title='100xxC:ERP', area='100xxC:ERP')
            self.job(title='GESTAO & ERP', area='GESTAO & ERP')
            db.session.commit()
        self.assert_catalog_matches_urls('areas', 'area')
        self.assert_catalog_matches_urls('skills', 'tech')

    def test_numeric_and_whitespace_area_names_preserve_current_filter(self):
        with app.app_context():
            named_numeric = JobArea(name='999')
            numeric_whitespace = JobArea(name=' 001 ')
            whitespace = JobArea(name='   ')
            db.session.add_all([named_numeric, numeric_whitespace, whitespace])
            db.session.flush()
            self.job(area='999', area_id=named_numeric.id)
            self.job(area='001', area_id=1)
            db.session.commit()
        self.assert_catalog_matches_urls('areas', 'area')

    def test_legacy_technology_names_do_not_map_ids_to_skills(self):
        with app.app_context():
            db.session.add_all([Technology(id=999, name='Python'),
                                Technology(id=self.python_id, name='Unrelated'),
                                Technology(name='Inactive', is_active=False)])
            row = self.job()
            row.skills.append(JobSkill(skill_id=self.python_id))
            self.job(description='Python text')
            db.session.commit()
        rows = self.assert_catalog_matches_urls('technologies', 'tech')
        self.assertEqual({row['name']: row['job_count'] for row in rows}, {'Python': 2, 'Unrelated': 0})

    def test_without_counts_response_and_no_aggregate_query(self):
        with app.app_context():
            db.session.add(JobArea(name='Area'))
            db.session.add(Technology(name='Technology'))
            db.session.commit()
        for endpoint in ('areas', 'skills', 'technologies'):
            for flag in (None, 'false'):
                with self.subTest(endpoint=endpoint, flag=flag), self.sql_capture() as sql:
                    rows = self.get(f'/api/config/{endpoint}', args={} if flag is None else {'include_counts': flag})
                self.assertTrue(all('job_count' not in row for row in rows))
                self.assertFalse(any('count(' in statement.lower() for statement in sql))

    def test_company_counts_directory_slug_numeric_and_visible_jobs_only(self):
        with app.app_context():
            visible = self.job()
            visible_id = visible.id
            self.job(status='approved')
            self.job(is_company_hidden=True, title='CONFIDENTIAL FIXTURE')
            self.job(status='pending')
            self.job(is_active=False)
            self.job(expires_at=datetime.utcnow() - timedelta(days=1))
            # Confidential DTO fields must not leak by introducing aggregates.
            company = db.session.get(Company, self.company_id)
            company.phone = 'PRIVATE-PHONE'
            db.session.commit()
        directory = self.get('/api/companies/search')
        row = next(item for item in directory['companies'] if item['id'] == self.company_id)
        numeric = self.get(f'/api/companies/{self.company_id}')
        slug = self.get('/api/companies/by-slug/wave-4-company-br')
        self.assertEqual(numeric, slug)
        self.assertEqual(row['active_jobs_count'], 2)
        self.assertEqual(numeric['active_jobs_count'], 2)
        self.assertEqual(len(numeric['jobs']), 2)
        self.assertIn(visible_id, [job['id'] for job in numeric['jobs']])
        self.assertEqual(self.dashboard()['active_jobs'], 3)
        self.assertNotIn('PRIVATE-PHONE', str(numeric))
        self.assertNotIn('CONFIDENTIAL FIXTURE', str(numeric))
        for field in ('user_id', 'phone', 'cnpj', 'street_address', 'zip_code', 'approved_by'):
            self.assertNotIn(field, row)
            self.assertNotIn(field, numeric)

    def test_batch_company_helper_rejects_nonpublic_companies(self):
        with app.app_context():
            pending = self.make_company('private-company', status='pending')
            inactive = self.make_company('disabled', owner_active=False)
            legacy = self.make_company('missing', slug=False)
            for row in (pending, inactive, legacy):
                self.job(company_id=row.id)
            public = self.job()
            db.session.commit()
            ids = [self.company_id, pending.id, inactive.id, legacy.id, self.other_company_id]
            counts = company_job_counts(db.session.get(Site, self.site_id), ids)
            self.assertEqual(counts, dict(zip(ids, [1, 0, 0, 0, 0])))
            self.assertEqual(company_job_counts(db.session.get(Site, self.site_id), []), {})

    def test_regional_host_and_country_input_cannot_spoof_counts(self):
        with app.app_context():
            mx = self.mexico()
            company = self.make_company('mexican', site_id=mx.id)
            self.job(company_id=company.id, site_id=mx.id, title='Python')
            self.make_candidate('mexican-person', site_id=mx.id)
            db.session.commit()
        self.assertEqual(self.dashboard(args={'country': 'MX'}), self.dashboard())
        mexican = self.dashboard(headers={'Host': 'mx.example.invalid'}, args={'country': 'BR'})
        self.assertEqual(mexican, {'active_jobs': 1, 'total_companies': 1, 'total_candidates': 1})
        br = self.get('/api/config/skills', args={'include_counts': 'true', 'country': 'MX'})
        mx = self.get('/api/config/skills', headers={'Host': 'mx.example.invalid'}, args={'include_counts': 'true'})
        self.assertEqual(next(row['job_count'] for row in br if row['name'] == 'Python'), 0)
        self.assertEqual(next(row['job_count'] for row in mx if row['name'] == 'Python'), 1)
        self.assertEqual(self.get('/api/companies/search', args={'country': 'MX'})['total'], 2)
        spoof = self.client.get('/api/stats/dashboard', headers={**self.HOST, 'X-Regional-Host': 'mx.example.invalid'})
        self.assertEqual(spoof.status_code, 400)
        forbidden = self.client.get('/api/stats/dashboard?site_id=2', headers=self.HOST)
        self.assertEqual(forbidden.status_code, 400)
        unknown = self.client.get('/api/stats/dashboard', headers={'Host': 'unknown.example.invalid'})
        self.assertEqual(unknown.status_code, 404)

    def test_trusted_prefix_context_and_locale_are_server_owned(self):
        with app.app_context():
            mx = self.mexico(prefix=True)
            company = self.make_company('prefixed-mexican', site_id=mx.id)
            self.job(company_id=company.id, site_id=mx.id)
            db.session.commit()
        internal = {'Host': 'localhost', 'X-Regional-Host': 'jobs.portalerp.com', 'X-Regional-Prefix': '/mx'}
        payload = self.get('/api/stats/dashboard', headers=internal, args={'country': 'BR'})
        self.assertEqual(payload, {'active_jobs': 1, 'total_companies': 1, 'total_candidates': 0})
        self.assertEqual(self.get('/api', headers=internal)['language'], 'es-MX')
        response = self.client.get('/api/stats/dashboard', headers=internal,
                                   environ_overrides={'REMOTE_ADDR': '203.0.113.5'})
        self.assertEqual(response.status_code, 400)

    def test_same_company_multi_site_join_is_not_duplicated_or_cross_approved(self):
        with app.app_context():
            mx = self.mexico()
            db.session.add(CompanySite(company_id=self.company_id, site_id=mx.id,
                                      status='approved'))
            db.session.flush()
            self.job(title='Python BR')
            self.job(company_id=self.company_id, site_id=mx.id, title='Python MX')
            db.session.commit()
        self.assertEqual(self.dashboard()['active_jobs'], 1)
        self.assertEqual(self.get('/api/jobs/')['total'], 1)
        self.assert_catalog_matches_urls('skills', 'tech')
        with app.app_context():
            CompanySite.query.filter_by(company_id=self.company_id, site_id=self.site_id).one().status = 'pending'
            db.session.commit()
        self.assertEqual(self.dashboard()['active_jobs'], 0)
        self.assertEqual(self.get('/api/jobs/')['total'], 0)
        mexican = self.dashboard(headers={'Host': 'mx.example.invalid'})
        self.assertEqual(mexican['active_jobs'], 1)
        self.assertEqual(mexican['total_companies'], 1)

    def test_country_reservation_and_active_site_are_required_for_directory_only(self):
        with app.app_context():
            self.job()
            db.session.commit()
            foreign_country = SimpleNamespace(id=self.site_id, country_code='MX', is_active=True)
            inactive = SimpleNamespace(id=self.site_id, country_code='BR', is_active=False)
            self.assertEqual(public_companies_query(foreign_country).count(), 0)
            self.assertEqual(public_companies_query(inactive).count(), 0)
            # Neither identity check may shrink the general publication set.
            self.assertEqual(public_jobs_query(foreign_country).count(), 1)
            self.assertEqual(public_jobs_query(inactive).count(), 1)

    def test_successful_empty_catalog_is_an_array(self):
        for endpoint in ('areas', 'technologies'):
            self.assertEqual(self.get(f'/api/config/{endpoint}?include_counts=true'), [])

    def test_name_filters_match_original_sql_predicates_not_only_refactored_route(self):
        with app.app_context():
            area = JobArea(name=r'Gestão_100%\ERP')
            db.session.add(area)
            db.session.flush()
            row = self.job(area_id=area.id, title='Python', description='Gestão ERP')
            row.skills.append(JobSkill(skill_id=self.python_id))
            self.job(area=area.name, requirements='Python')
            self.job(area='GestãoX100zzERP', title='Other')
            db.session.commit()
            site = db.session.get(Site, self.site_id)
            for name in (area.name, 'Gestao', str(area.id), ' 001 ', '   '):
                try:
                    predicate = Job.area_id == int(name)
                except ValueError:
                    predicate = sa.or_(text_contains(Job.area, name),
                                       Job.job_area.has(text_contains(JobArea.name, name)))
                old_total = public_jobs_query(site).filter(predicate).count()
                new_total = self.get('/api/jobs/', args={'area': name})['total']
                self.assertEqual(old_total, new_total)
            for name in ('Python', 'Gestao', r'Gestão_100%\ERP', '   '):
                old_predicate = sa.or_(
                    Job.skills.any(JobSkill.skill.has(text_contains(Skill.name, name))),
                    text_contains(Job.title, name), text_contains(Job.description, name),
                    text_contains(Job.requirements, name))
                old_total = public_jobs_query(site).filter(old_predicate).count()
                new_total = self.get('/api/jobs/', args={'tech': name})['total']
                self.assertEqual(old_total, new_total)

    def test_real_sql_aggregate_failure_does_not_return_zero(self):
        def fail_count(_conn, _cursor, statement, _params, _context, _executemany):
            if 'count(' in statement.lower():
                raise SQLAlchemyError('PRIVATE DATABASE COUNT failure')
        with app.app_context():
            db.session.add(JobArea(name='Area'))
            db.session.commit()
            engine = db.engine
        sa.event.listen(engine, 'before_cursor_execute', fail_count)
        try:
            for path in ('/api/stats/dashboard', '/api/config/areas?include_counts=true',
                         '/api/config/skills?include_counts=true', '/api/companies/search',
                         f'/api/companies/{self.company_id}'):
                response = self.client.get(path, headers=self.HOST)
                self.assertEqual(response.status_code, 500, (path, response.get_json()))
                self.assertEqual(set(response.get_json()), {'error'})
                self.assertNotIn('PRIVATE DATABASE', str(response.get_json()))
        finally:
            sa.event.remove(engine, 'before_cursor_execute', fail_count)

    def test_grouped_queries_cardinality_constant_catalog_and_directory(self):
        with app.app_context():
            db.session.add(JobArea(name='First area'))
            db.session.add(Technology(name='First technology'))
            self.job(title='Python')
            db.session.commit()
        def capture_all():
            observed = {}
            for path in ('/api/config/areas?include_counts=true', '/api/config/skills?include_counts=true',
                         '/api/config/technologies?include_counts=true', '/api/companies/search?per_page=100',
                         '/api/stats/dashboard'):
                with self.sql_capture() as sql:
                    self.get(path)
                observed[path] = len(sql)
                count_sql = [statement for statement in sql if 'count(' in statement.lower()]
                expected = 3 if path == '/api/stats/dashboard' else 2 if '/companies/' in path else 1
                self.assertEqual(len(count_sql), expected, sql)
                if 'config' in path:
                    self.assertIn('GROUP BY', count_sql[0])
                if 'companies' in path:
                    self.assertTrue(any('GROUP BY' in statement for statement in count_sql))
            return observed
        before = capture_all()
        with app.app_context():
            for index in range(24):
                db.session.add_all([JobArea(name=f'Area {index}'), Skill(name=f'Skill {index}'),
                                    Technology(name=f'Technology {index}')])
                self.make_company(f'company-{index}')
            db.session.commit()
        self.assertEqual(before, capture_all())

    def test_counts_queries_do_not_load_job_rows_or_call_job_dto(self):
        with app.app_context():
            self.job(description='Sensitive SQL-only text')
            db.session.add(JobArea(name='Sensitive'))
            db.session.commit()
        with patch.object(Job, 'to_dict', side_effect=AssertionError('must not materialize jobs')):
            self.dashboard()
            self.get('/api/config/areas?include_counts=true')
            self.get('/api/config/skills?include_counts=true')
            self.get('/api/companies/search')

    def test_aggregate_errors_are_generic_not_zero_or_sql_details(self):
        message = SQLAlchemyError('SECRET SQL password@example.invalid SELECT private_data')
        for path, target in (
            ('/api/stats/dashboard', 'src.routes.stats.public_jobs_query'),
            ('/api/stats/dashboard', 'src.routes.stats.public_companies_query'),
            ('/api/jobs/', 'src.routes.jobs.public_jobs_query'),
            ('/api/jobs/1', 'src.routes.jobs.public_jobs_query'),
            ('/api/config/areas?include_counts=true', 'src.routes.config.catalog_job_counts'),
            ('/api/config/skills?include_counts=true', 'src.routes.config.catalog_job_counts'),
            ('/api/config/technologies?include_counts=true', 'src.routes.config.catalog_job_counts'),
            ('/api/companies/search', 'src.routes.companies.company_job_counts'),
            (f'/api/companies/{self.company_id}', 'src.routes.companies.company_job_counts'),
            ('/api/companies/by-slug/wave-4-company-br', 'src.routes.companies.company_job_counts'),
        ):
            with self.subTest(path=path), patch(target, side_effect=message):
                response = self.client.get(path, headers=self.HOST)
                self.assertEqual(response.status_code, 500, response.get_json())
                payload = response.get_json()
                self.assertEqual(set(payload), {'error'})
                self.assertNotIn('SECRET', str(payload))
                self.assertNotIn('SELECT', str(payload))
                self.assertNotIn('job_count', payload)


if __name__ == '__main__':
    unittest.main()
