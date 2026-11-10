"""Finite local validation. Each suite sets a distinct temporary test database.

Run from backend/portal_erp_jobs_api:
    .venv/bin/python tests/run_global1_regressions.py /home/ubuntu/jobs-global1
No app import, production access or database path mutation occurs in the runner.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SUITES = (
    "test_global1_regional.py", "test_global1_migration.py", "test_admin_access.py",
    "test_admin_approval_access.py", "test_admin_wave0.py", "test_company_team_wave8.py",
    "test_jobs_wave4.py", "test_resume_wave4.py", "test_security_wave0.py",
)


def main():
    output = Path(sys.argv[1]).resolve()
    output.mkdir(parents=True, exist_ok=True)

    def run_suite(suite):
        log = output / f"backend-{suite[:-3]}.log"
        with log.open("w") as stream:
            result = subprocess.run(
                [str(ROOT / ".venv/bin/python"), "-m", "unittest", "discover", "-s", "tests", "-p", suite, "-v"],
                cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, timeout=300,
            )
        text = log.read_text()
        count = re.search(r"Ran (\d+) tests?", text)
        return suite, result.returncode, int(count[1]) if count else 0, str(log)

    results = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(run_suite, suite) for suite in SUITES]
        for future in as_completed(futures):
            row = future.result()
            results.append(row)
            print(f"{row[0]}: {'PASS' if row[1] == 0 else 'FAIL'} ({row[2]} tests)", flush=True)
    summary = "\n".join(f"{suite}: {'PASS' if code == 0 else 'FAIL'} ({count} tests); {log}" for suite, code, count, log in sorted(results))
    (output / "backend-tests-summary.txt").write_text(summary + "\n")
    return 1 if any(code for _, code, _, _ in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
