"""Integration-only fixture server: no existing DB, network mail or production IO.
Run with backend .venv Python; SQLITE is created under /tmp and deleted on exit.
"""
import atexit
import json
import os
from pathlib import Path
import signal
import sys
import tempfile
from datetime import datetime, timedelta

backend = Path(__file__).resolve().parents[2] / 'backend' / 'portal_erp_jobs_api'
sys.path.insert(0, str(backend))
fd, database = tempfile.mkstemp(prefix='jobs-next-global1-', suffix='.db')
os.close(fd)
os.environ.update(SECRET_KEY='next-local-test-secret-at-least-32-characters', JWT_SECRET_KEY='next-local-test-jwt-at-least-32-characters', DATABASE_URL=f'sqlite:///{database}', FLASK_ENV='testing', EMAIL_PROVIDER='', ALLOW_ADMIN_SETUP='false')
from src.config import db
from src.main import app
from src.models import Site, SiteDomain, SiteLocale, User, Candidate, CandidateSite, Company, CompanySite, CompanyStatus, CompanyUser, CompanyUserRole, Job
from src.models import Admin, AdminRole, AdminSite
from src.models.job_area import JobArea

app.config.update(TESTING=True, EMAIL_PROVIDER='', REGIONAL_ALLOW_DEVELOPMENT_FALLBACK=False)
with app.app_context():
    db.create_all()
    sites = []
    for code, active in [('BR', True), ('ZZ', True), ('US', False)]:
        site = Site(code=code, name='Brasil' if code == 'BR' else f'Test {code}', country_code=code, default_locale='pt-BR', currency_code='BRL', timezone='America/Sao_Paulo', canonical_origin='https://jobs.portalerp.com', is_active=active)
        site.domains.extend([SiteDomain(hostname=host, url_prefix=f'/{code.lower()}', is_primary=host == 'jobs.portalerp.com', is_active=True) for host in ['jobs.portalerp.com', 'localhost', '127.0.0.1']])
        site.locales.append(SiteLocale(locale='pt-BR', is_default=True))
        db.session.add(site); sites.append(site)
    db.session.flush()
    br, zz, inactive = sites
    db.session.add(SiteDomain(site_id=br.id, hostname='jobs.portalerp.com.br', url_prefix='', is_primary=False, is_active=True))
    users = {}
    for name, kind in [('candidate', 'candidate'), ('owner', 'company'), ('viewer', 'company'), ('admin', 'admin')]:
        user = User(email=f'{name}@example.invalid', user_type=kind, is_active=True)
        user.set_password('LocalTest123!')
        db.session.add(user); users[name] = user
    db.session.flush()
    admin = Admin(user_id=users['admin'].id, name='Local Synthetic Admin', role=AdminRole.SUPER_ADMIN, is_platform_admin=True)
    admin.set_role(AdminRole.SUPER_ADMIN)
    db.session.add(admin); db.session.flush()
    db.session.add(AdminSite(admin_id=admin.id, site_id=br.id, is_active=True))
    candidate = Candidate(user_id=users['candidate'].id, first_name='Local', last_name='Candidate')
    company = Company(user_id=users['owner'].id, company_name='Local Runtime ERP', cnpj='NEXT-TEST-ONLY')
    db.session.add_all([candidate, company]); db.session.flush()
    db.session.add(CandidateSite(candidate_id=candidate.id, site_id=br.id, is_active=True))
    db.session.add_all([CompanySite(company_id=company.id, site_id=site.id, status=CompanyStatus.APPROVED, display_name='Local Runtime ERP', max_active_jobs=250) for site in [br, zz]])
    for name, role in [('owner', CompanyUserRole.OWNER), ('viewer', CompanyUserRole.VIEWER)]:
        db.session.add(CompanyUser(company_id=company.id, user_id=users[name].id, name=name, role=role, is_active=True, invitation_accepted=True))
    # Company ID 4 is a synthetic public MegaSoft; IDs 2/3 stay pending.
    for index, name in [(2, 'Pending Synthetic Two'), (3, 'Pending Synthetic Three'), (4, 'MegaSoft')]:
        user = User(email=f'company-{index}@example.invalid', user_type='company', is_active=True)
        db.session.add(user); db.session.flush()
        fixture_company = Company(user_id=user.id, company_name=name, cnpj=f'NEXT-TEST-{index}')
        db.session.add(fixture_company); db.session.flush()
        db.session.add(CompanySite(company_id=fixture_company.id, site_id=br.id, status=CompanyStatus.APPROVED if index == 4 else CompanyStatus.PENDING, display_name=name))
    area = JobArea(name='Desenvolvimento', description='Local test', icon='Code2', color='blue', is_active=True)
    db.session.add(area); db.session.flush()
    for i in range(1, 104):
        db.session.add(Job(company_id=company.id, site_id=br.id, title=f'Consultor ERP Local {i}', description='Conteúdo local de teste. Experiência ERP.', area_id=area.id, country='Brasil', city='São Paulo', state='SP', is_active=True, status='active', work_modality='hybrid', contract_type='clt', min_salary=5000, max_salary=9000, expires_at=datetime.utcnow() + timedelta(days=30)))
    db.session.add(Job(company_id=company.id, site_id=zz.id, title='Synthetic region only', description='Never publish', is_active=True, status='active'))
    db.session.add(Job(company_id=company.id, site_id=br.id, title='Expired local job', description='Do not index or offer', is_active=True, status='active', expires_at=datetime.utcnow() - timedelta(days=1)))
    db.session.commit()

@atexit.register
def cleanup():
    with app.app_context():
        db.session.remove(); db.engine.dispose()
    Path(database).unlink(missing_ok=True)
    Path('/tmp/jobs-next-fixture.json').unlink(missing_ok=True)

if __name__ == '__main__':
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    Path('/tmp/jobs-next-fixture.json').write_text(json.dumps({'pid': os.getpid(), 'database': database, 'scope': 'synthetic loopback only'}) + '\n')
    print('Fixture backend ready: isolated /tmp DB, BR plus synthetic ZZ only; no mail.', flush=True)
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
