"""Finite loopback-only smoke runner; owns and terminates its fixture services.
No production I/O; no existing database. Run from repository root with Python 3.
"""
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
REPORT = Path('/home/ubuntu/jobs-company-slug-only')
REPORT.mkdir(parents=True, exist_ok=True)
processes = []
handles = []


def start(command, filename, environment=None):
    handle = (REPORT / filename).open('w')
    handles.append(handle)
    process = subprocess.Popen(command, cwd=ROOT, stdout=handle, stderr=subprocess.STDOUT, env={**os.environ, **(environment or {})})
    processes.append(process)
    return process


def ready(url, process):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('Local fixture process stopped before readiness')
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Host': 'localhost', 'X-Regional-Host': 'localhost', 'X-Regional-Prefix': '/br'}), timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError('Loopback fixture readiness timeout')


try:
    print('Starting synthetic Flask fixture on loopback :5000', flush=True)
    backend = start([str(ROOT / 'backend/portal_erp_jobs_api/.venv/bin/python'), str(ROOT / 'next/tests/local_backend.py')], 'local-backend.log')
    ready('http://127.0.0.1:5000/api/context', backend)
    print('Starting built Next on loopback :3001', flush=True)
    next_server = start(['node', str(ROOT / 'next/node_modules/next/dist/bin/next'), 'start', str(ROOT / 'next'), '-p', '3001', '-H', '127.0.0.1'], 'local-next.log')
    ready('http://127.0.0.1:3001/br/api/context', next_server)
    print('Running exact company/job URL, SEO, sitemap and auth/team browser checks', flush=True)
    environment = {**os.environ, 'JOBS_NEXT_SMOKE_RESULTS': str(REPORT / 'local-smoke-results.json')}
    result = subprocess.run([sys.executable, str(ROOT / 'next/tests/local_smoke.py')], cwd=ROOT, env=environment, timeout=300)
    sys.exit(result.returncode)
finally:
    for process in reversed(processes):
        process.terminate()
    for process in reversed(processes):
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    for handle in handles:
        handle.close()
    print('Owned loopback fixture services stopped', flush=True)
