"""Requires tests/local_backend.py on :5000 and built Next on :3001.
Only loopback hosts; no production requests. All fixtures are synthetic.
Reusable against the same local DB: each invitation gets a fresh invalid-domain email.
"""
import atexit
import json
import os
from pathlib import Path
import re
import sys
import urllib.request
import urllib.error
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:3001'
results = []
report = {'success': False, 'scope': 'loopback only, synthetic SQLite; no real accounts', 'checks': results}
step = 'public HTTP SEO and sitemap'


@atexit.register
def save_report():
    destination = Path(os.environ.get('JOBS_NEXT_SMOKE_RESULTS', '/home/ubuntu/jobs-global1/next-smoke-results.json'))
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


def record_exception(exception_type, exception, traceback):
    # Exception text can contain invitation/reset URLs. Persist only class/step.
    report.setdefault('failure', {'step': step, 'exception_type': exception_type.__name__})
    sys.__excepthook__(exception_type, exception, traceback)


sys.excepthook = record_exception


def safe_path(url):
    path = urlsplit(url).path
    return re.sub(r'(/(?:convite|invitations)/)[A-Za-z0-9_-]{32,128}(?=/|$)', r'\1[redacted]', path)


def check(condition, label):
    if not condition:
        report['failure'] = {'step': step, 'label': label}
        raise AssertionError(label)
    results.append(label)
    print('PASS', label, flush=True)


def http(path, headers=None, method='GET', body=None):
    request = urllib.request.Request(BASE + path, headers=headers or {}, method=method, data=json.dumps(body).encode() if body is not None else None)
    if body is not None:
        request.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, dict(response.headers), response.read().decode()
    except urllib.error.HTTPError as response:
        return response.code, dict(response.headers), response.read().decode()


def api(page, method, path, expected, label, body=None, csrf=None, cookie=None):
    """Only explicit statuses per request are accepted; never blanket-ignore 401/403."""
    headers = {}
    if csrf is not None:
        headers['X-CSRF-Token'] = csrf
    if cookie is not None:
        headers['Cookie'] = cookie
    if body is not None:
        headers['Content-Type'] = 'application/json'
    response = page.request.fetch(BASE + path, method=method, headers=headers,
                                  data=json.dumps(body) if body is not None else None)
    check(response.status < 500, label + ': no 5xx')
    check(response.status == expected, label + f': exact {expected}')
    return response


def regional_cookies(context, prefix):
    cookies = [cookie for cookie in context.cookies() if cookie['name'].startswith(prefix)]
    check(len(cookies) == 3 and all(cookie['path'] == '/br' and cookie['sameSite'] == 'Strict'
                                   and cookie['secure'] and cookie['domain'] == 'localhost' for cookie in cookies),
          prefix + ': host-only localhost, Secure, Strict, Path /br')
    check(all(cookie['httpOnly'] == (not cookie['name'].endswith('_csrf')) for cookie in cookies),
          prefix + ': HttpOnly tokens and readable CSRF bridge')
    return cookies


for path in ['/br', '/br/vagas', '/br/vagas/1', '/br/empresas', '/br/empresas/1', '/br/areas', '/br/tecnologias', '/br/salarios', '/br/conteudo', '/br/sobre', '/br/contato', '/br/termos', '/br/privacidade']:
    status, headers, html = http(path, {'User-Agent': 'Googlebot'})
    check(status == 200, f'public {path}: 200')
    check('<html lang="pt-BR"' in html, f'{path}: regional HTML locale')
    check(f'<link rel="canonical" href="https://jobs.portalerp.com{path}"' in html, f'{path}: exact absolute canonical')
    check(f'property="og:url" content="https://jobs.portalerp.com{path}"' in html, f'{path}: exact og:url')
    check('property="og:locale" content="pt_BR"' in html, f'{path}: pt_BR')
    check('hrefLang=' not in html and 'hreflang=' not in html, f'{path}: no fabricated hreflang')
    internal = re.findall(r'<a[^>]+href="(/[^"#]*)"', html)
    check(all(url.startswith('/br') or url.startswith(('/_next', '/uploads', '/brand', '/assets')) for url in internal), f'{path}: all internal links regional')

status, _, html = http('/br/vagas?page=2&utm_source=local', {'User-Agent': 'Googlebot'})
check(status == 200 and 'rel="canonical" href="https://jobs.portalerp.com/br/vagas?page=2"' in html, 'pagination self canonical without campaign')
for path in ['/br/candidato/login', '/br/candidato/cadastro', '/br/empresa/login', '/br/empresa/cadastro', '/br/recuperar-senha', '/br/redefinir-senha', '/br/empresa/recuperar-senha', '/br/empresa/convite/' + 'a' * 40]:
    status, _, html = http(path, {'User-Agent': 'Googlebot'})
    check(status == 200 and '<meta name="robots" content="noindex, nofollow"' in html, f'{path}: private noindex is crawlable')
for path in ['/mx/vagas', '/us/vagas', '/BR/vagas', '/junk', '/vagas']:
    check(http(path)[0] == 404, f'{path}: real 404, no Brazil fallback')
check(http('/br/vagas/105')[0] == 404, 'expired job does not render JobPosting or apply button')
check(http('/zz/vagas/1')[0] == 404, 'synthetic region cannot read BR entity')
status, _, raw = http('/br/api/context', {'X-Regional-Prefix': '/zz', 'X-Regional-Host': 'unknown.invalid', 'X-Next-Regional-Country': 'zz'})
check(status == 200 and json.loads(raw)['site']['code'] == 'BR', 'API rewrite strips caller context spoof and preserves path BR')
check(http('/br/bff/candidate/applications?site_id=2')[0] == 400, 'BFF rejects browser authority')
status, _, index = http('/sitemap.xml')
check(status == 200 and 'https://jobs.portalerp.com/br/sitemap.xml' in index and '/us/' not in index, 'global sitemap index active only')
status, _, sitemap = http('/br/sitemap.xml')
check(status == 200, 'regional sitemap runtime 200')
urls = [node.text for node in ET.fromstring(sitemap).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
check(len(urls) == 115 and 'https://jobs.portalerp.com/br/vagas/103' in urls and 'https://jobs.portalerp.com/br/vagas/105' not in urls, 'regional sitemap complete across >100 jobs, no expired job')
for url in urls:
    check(http(url.replace('https://jobs.portalerp.com', ''))[0] == 200, f'sitemap URL {url}: 200')
status, _, robots = http('/robots.txt')
check(status == 200 and 'Sitemap: https://jobs.portalerp.com/sitemap.xml' in robots and 'Disallow: /*/bff/' in robots and 'Disallow: /br/candidato' not in robots, 'root robots does not mask private noindex')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = context.new_page()
    errors, bad_browser_responses, external_requests = [], [], []
    report.update(browser_responses=bad_browser_responses, browser_errors=errors, external_hosts=external_requests)

    def watch(ctx):
        ctx.on('page', lambda tab: tab.on('pageerror', lambda error: errors.append(str(error))))
        # API probes above are checked independently. Browser UI requests must all succeed.
        ctx.on('response', lambda response: bad_browser_responses.append({'status': response.status, 'path': safe_path(response.url), 'step': step, 'method': response.request.method}) if response.status >= 400 else None)
        # Abort anything outside loopback before the browser can issue it.
        def route(request_route):
            if urlsplit(request_route.request.url).hostname not in ('localhost', '127.0.0.1'):
                external_requests.append(urlsplit(request_route.request.url).hostname)
                request_route.abort()
            else:
                request_route.continue_()
        ctx.route('**/*', route)

    watch(context)
    page.on('pageerror', lambda error: errors.append(str(error)))
    step = 'hero navigation'
    page.goto(BASE + '/br', wait_until='networkidle')
    page.locator('input[placeholder]').first.fill('Consultor')
    page.locator('form').first.locator('button[type="submit"]').click()
    page.wait_for_url('**/br/vagas?**')
    check('/br/vagas?' in page.url, 'browser hero router navigation preserves /br')
    step = 'candidate login'
    page.goto(BASE + '/br/candidato/login?redirect=%2Fbr%2Fvagas%2F1', wait_until='networkidle')
    page.locator('input[name="email"]').fill('candidate@example.invalid')
    page.locator('input[name="password"]').fill('LocalTest123!')
    with page.expect_response(lambda response: urlsplit(response.url).path == '/br/bff/auth/login') as login_info:
        page.locator('form button').click()
    check(login_info.value.status == 200 and 'domain=' not in login_info.value.header_value('set-cookie').lower(), 'candidate login Set-Cookie has no Domain')
    page.wait_for_url('**/br/vagas/1')
    check('/br/vagas/1' in page.url, 'candidate login regional return path')
    cookies = regional_cookies(context, 'pej_')
    check(not any(cookie['name'].startswith('pej_') for cookie in context.cookies(BASE + '/zz')), 'BR cookies not sent to synthetic ZZ')
    csrf = next(cookie['value'] for cookie in cookies if cookie['name'] == 'pej_csrf')
    old_candidate_cookie = '; '.join(f'{cookie["name"]}={cookie["value"]}' for cookie in cookies)
    step = 'candidate dashboard/resume/CSRF'
    page.goto(BASE + '/br/candidato/dashboard', wait_until='networkidle')
    expect(page.get_by_role('heading', name='Local Candidate', exact=True)).to_be_visible()
    page.get_by_role('button', name='Currículo', exact=True).click()
    expect(page.get_by_role('heading', name='Meu currículo', exact=True)).to_be_visible()
    check(True, 'candidate dashboard loaded and resume tab selected')
    check(page.get_by_role('link', name='Editar currículo completo').get_attribute('href') == '/br/candidato/curriculo', 'resume SPA bridge URL stays /br/candidato/curriculo')
    check('pej_csrf=' in page.evaluate('document.cookie') and 'pej_access=' not in page.evaluate('document.cookie'), 'unchanged pej_csrf readable by SPA, access hidden')
    api(page, 'PATCH', '/br/bff/candidate/privacy', 403, 'candidate missing CSRF denied', {'is_discoverable': True})
    api(page, 'PATCH', '/br/bff/candidate/privacy', 403, 'candidate mismatched CSRF denied', {'is_discoverable': True}, 'wrong')
    api(page, 'PATCH', '/br/bff/candidate/privacy', 200, 'candidate valid CSRF mutation', {'is_discoverable': True}, csrf)
    profile = api(page, 'GET', '/br/bff/candidate/profile', 200, 'candidate privacy persisted').json()
    check(profile['site_membership']['is_discoverable'] is True, 'candidate discoverable BR persisted')
    api(page, 'POST', '/br/bff/auth/logout', 403, 'candidate logout without CSRF denied')
    check(len([c for c in context.cookies() if c['name'].startswith('pej_')]) == 3, 'denied logout retains session')
    step = 'candidate logout/replay'
    api(page, 'POST', '/br/bff/auth/logout', 200, 'candidate valid logout', csrf=csrf)
    check(not any(cookie['name'].startswith('pej_') for cookie in context.cookies()), 'candidate logout clears region cookies')
    api(page, 'GET', '/br/bff/auth/me', 401, 'candidate after logout unauthorized')
    api(page, 'GET', '/br/bff/auth/me', 401, 'candidate old session replay revoked', cookie=old_candidate_cookie)

    step = 'owner login/invitation'
    page.goto(BASE + '/br/empresa/login', wait_until='networkidle')
    page.locator('input[name="email"]').fill('owner@example.invalid')
    page.locator('input[name="password"]').fill('LocalTest123!')
    with page.expect_response(lambda response: urlsplit(response.url).path == '/br/bff/company/auth/login') as login_info:
        page.locator('form button').click()
    check(login_info.value.status == 200 and 'domain=' not in login_info.value.header_value('set-cookie').lower(), 'company login Set-Cookie has no Domain')
    page.wait_for_url('**/br/empresa/dashboard')
    expect(page.get_by_role('heading', name='Local Runtime ERP', exact=True).first).to_be_visible()
    page.wait_for_load_state('networkidle')
    check(True, 'company owner dashboard authenticated runtime')
    cookies = regional_cookies(context, 'pej_company')
    csrf = next(cookie['value'] for cookie in cookies if cookie['name'] == 'pej_company_csrf')
    email = f'invited-{uuid.uuid4().hex}@example.invalid'
    invitation_payload = {'email': email, 'name': 'Invited Local Viewer', 'role': 'viewer'}
    api(page, 'POST', '/br/bff/company/team/invitations', 403, 'owner invitation missing CSRF denied', invitation_payload)
    invited = api(page, 'POST', '/br/bff/company/team/invitations', 201, 'owner creates synthetic viewer invitation', invitation_payload, csrf).json()
    invitation_url = urlsplit(invited['invitation_url'])
    check(invited['delivery'] == 'manual' and invitation_url.scheme == 'https' and invitation_url.netloc == 'jobs.portalerp.com' and invitation_url.path.startswith('/br/empresa/convite/'), 'invitation safe canonical BR URL and no mail')
    token = invitation_url.path.rsplit('/', 1)[1]
    invite_path = '/br/bff/company/invitations/' + token
    preview = api(page, 'GET', invite_path, 200, 'public invitation preview').json()
    check(preview['invitation']['role'] == 'viewer' and preview['existing_user'] is False and preview['invitation']['email'] != email, 'public invitation masks email and has correct viewer role')
    api(page, 'GET', '/zz/bff/company/invitations/' + token, 404, 'BR invitation unusable in synthetic ZZ')

    step = 'public viewer invitation acceptance'
    viewer_context = browser.new_context()
    watch(viewer_context)
    viewer_page = viewer_context.new_page()
    viewer_page.goto(BASE + invitation_url.path, wait_until='networkidle')
    expect(viewer_page.locator('input[name="password"]')).to_be_visible()
    viewer_page.locator('input[name="password"]').fill('LocalTest123!')
    viewer_page.locator('input[name="accept_terms"]').check()
    viewer_page.locator('input[name="accept_privacy"]').check()
    with viewer_page.expect_response(lambda response: urlsplit(response.url).path == invite_path and response.request.method == 'POST') as accept_info:
        viewer_page.get_by_role('button', name='Aceitar convite', exact=True).click()
    check(accept_info.value.status == 200, 'viewer accepts invite via browser and regional BFF')
    expect(viewer_page.get_by_text('Convite aceito. Faça login para acessar a empresa.', exact=True)).to_be_visible()
    api(page, 'GET', invite_path, 404, 'consumed invitation token cannot replay')
    step = 'invited viewer login/permissions'
    viewer_page.get_by_role('link', name='Entrar na área empresarial').click()
    viewer_page.wait_for_url('**/br/empresa/login')
    viewer_page.locator('input[name="email"]').fill(email)
    viewer_page.locator('input[name="password"]').fill('LocalTest123!')
    viewer_page.locator('form button').click()
    viewer_page.wait_for_url('**/br/empresa/dashboard')
    expect(viewer_page.get_by_role('heading', name='Local Runtime ERP', exact=True).first).to_be_visible()
    viewer_page.wait_for_load_state('networkidle')
    viewer_cookies = regional_cookies(viewer_context, 'pej_company')
    viewer_csrf = next(c['value'] for c in viewer_cookies if c['name'] == 'pej_company_csrf')
    viewer_cookie = '; '.join(f'{c["name"]}={c["value"]}' for c in viewer_cookies)
    me = api(viewer_page, 'GET', '/br/bff/company/auth/me', 200, 'invited viewer authorized').json()
    check(me['permissions']['view_jobs'] and not me['permissions']['manage_users'] and not me['permissions']['manage_jobs'], 'viewer read-only permissions')
    api(viewer_page, 'GET', '/br/bff/company/jobs?page=1&per_page=5', 200, 'viewer reads private jobs')
    api(viewer_page, 'GET', '/br/bff/company/team/members', 403, 'viewer forbidden team management')
    api(viewer_page, 'GET', '/br/bff/company/candidates', 403, 'viewer forbidden candidate directory')
    api(viewer_page, 'PATCH', '/br/bff/company/jobs/1/toggle-status', 403, 'viewer forbidden job mutation despite valid CSRF', {}, viewer_csrf)
    check(len([c for c in viewer_context.cookies() if c['name'].startswith('pej_company')]) == 3, 'ordinary permission 403 preserves viewer session')
    members = api(page, 'GET', '/br/bff/company/team/members', 200, 'owner lists accepted member').json()
    viewer = next(member for member in members['members'] if member['email'] == email)
    check(viewer['role'] == 'viewer' and viewer['is_active'] and viewer['invitation_accepted'], 'accepted invitation persisted as active viewer')
    step = 'owner remove/revoked viewer/replay'
    api(page, 'DELETE', f'/br/bff/company/team/members/{viewer["id"]}', 200, 'owner removes invited viewer', {}, csrf)
    api(viewer_page, 'GET', '/br/bff/company/auth/me', 401, 'revoked viewer session and refresh rejected')
    check(not any(c['name'].startswith('pej_company') for c in viewer_context.cookies()), 'revoked viewer regional cookies cleared')
    api(viewer_page, 'GET', '/br/bff/company/jobs', 401, 'revoked viewer old cookie replay rejected', cookie=viewer_cookie)
    audit = api(page, 'GET', '/br/bff/company/team/audit', 200, 'owner reads regional audit').json()
    check({'invitation.created', 'invitation.accepted', 'member.deactivated'}.issubset({event['event_type'] for event in audit['events']}), 'invitation accept removal recorded in audit')
    step = 'owner UI logout'
    with page.expect_response(lambda response: urlsplit(response.url).path == '/br/bff/company/auth/logout') as logout_info:
        page.get_by_role('button', name='Sair', exact=True).first.click()
    check(logout_info.value.status == 200, 'owner browser logout sends correct regional CSRF')
    page.wait_for_url('**/br/empresa/login')
    check(not any(c['name'].startswith('pej_company') for c in context.cookies()), 'owner logout clears regional company cookies')
    api(page, 'GET', '/br/bff/company/auth/me', 401, 'owner after logout unauthorized')
    if bad_browser_responses:
        print('Unexpected browser responses:', json.dumps(bad_browser_responses), flush=True)
    check(not bad_browser_responses, 'browser UI no unexpected 4xx/5xx (API negative probes asserted individually)')
    check(not external_requests, 'browser made no non-loopback requests')
    check(not errors, 'browser no page/hydration errors')
    viewer_context.close()
    context.close()
    browser.close()
report['success'] = True
report['passed'] = len(results)
print(json.dumps({'passed': len(results), 'scope': 'loopback only, isolated SQLite, real Next and Flask'}, ensure_ascii=False), flush=True)
