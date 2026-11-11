"""Finite sandbox regressions: distinct process/database per backend suite.

Run from backend/portal_erp_jobs_api:
    .venv/bin/python tests/run_company_url_regressions.py /home/ubuntu/jobs-company-urls
Optional remaining arguments select test filenames. No dotenv, real credentials,
external providers, application import, deployment or production database access.
Only sanitized unittest evidence is persisted, never inherited environment values.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def sanitize(text):
    text = re.sub(r"\beyJ[A-Za-z0-9_.-]+", "[redacted-token]", text)
    text = re.sub(r"(?i)Bearer\s+[^\s\"']+", "Bearer [redacted]", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[fixture-email]", text)
    text = re.sub(r"(?i)((?:password|secret|api_key|reset_token|access_token|refresh_token)\s*[=:]\s*)[^\s,}]+", r"\1[redacted]", text)
    return text


def main():
    output = Path(sys.argv[1]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    suites = sorted(sys.argv[2:] or [path.name for path in (ROOT / "tests").glob("test_*.py")])
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": "/home/ubuntu", "LANG": "C.UTF-8", "PYTHON_DOTENV_DISABLED": "1",
        "SECRET_KEY": "isolated-test-secret-at-least-thirty-two-characters",
        "JWT_SECRET_KEY": "isolated-test-jwt-at-least-thirty-two-characters",
        "FLASK_ENV": "testing", "ALLOW_ADMIN_SETUP": "false", "EMAIL_PROVIDER": "",
    }

    def run_suite(suite):
        if Path(suite).name != suite or not (ROOT / "tests" / suite).is_file():
            raise ValueError("A suite must be an existing backend test filename")
        result = subprocess.run(
            [str(ROOT / ".venv/bin/python"), "-m", "unittest", "discover", "-s", "tests", "-p", suite, "-v"],
            cwd=ROOT, env=env, capture_output=True, text=True, timeout=300,
        )
        text = sanitize(result.stdout + result.stderr)
        log = output / f"backend-{suite[:-3]}.log"
        log.write_text(text)
        count = re.search(r"Ran (\d+) tests?", text)
        return {"suite": suite, "returncode": result.returncode, "tests": int(count[1]) if count else 0,
                "log": str(log)}

    results = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(run_suite, suite) for suite in suites]
        for future in as_completed(futures):
            row = future.result()
            results.append(row)
            print(f"{row['suite']}: {'PASS' if row['returncode'] == 0 else 'FAIL'} ({row['tests']} tests)", flush=True)
    results.sort(key=lambda row: row["suite"])
    (output / "backend-tests-summary.json").write_text(json.dumps(results, indent=2) + "\n")
    (output / "backend-tests-summary.txt").write_text("\n".join(
        f"{row['suite']}: {'PASS' if row['returncode'] == 0 else 'FAIL'} ({row['tests']} tests); {row['log']}"
        for row in results) + "\n")
    print(f"TOTAL: {sum(row['tests'] for row in results)} tests across {len(results)} isolated suites", flush=True)
    return 1 if any(row["returncode"] for row in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
