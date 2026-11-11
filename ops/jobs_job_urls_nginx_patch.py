#!/usr/bin/env python3
"""Render a Jobs-only legacy numeric job redirect proxy; never reload Nginx."""
import argparse
from pathlib import Path
import re

BLOCK = '''    # JOBS_FRIENDLY_URLS_LEGACY_NUMERIC_BEGIN
    # Resolve the public job in Next to send one canonical 301, not two.
    location ~ ^/(?:br/)?vagas/(?<jobs_legacy_job_id>[0-9]+)/?$ {
        if ($request_method !~ ^(GET|HEAD)$) { return 409; }
        proxy_pass http://127.0.0.1:3001/br/vagas/$jobs_legacy_job_id$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Host jobs.portalerp.com;
        proxy_set_header Cookie "";
        proxy_set_header X-Forwarded-Host "";
        proxy_set_header X-Regional-Host "";
        proxy_set_header X-Regional-Prefix "";
        proxy_set_header X-Site-Id "";
        proxy_set_header X-Site-Key "";
        proxy_set_header X-Regional-Site "";
        proxy_set_header X-Next-Regional-Country "";
        proxy_set_header X-Next-Regional-Prefix "";
        proxy_set_header X-Next-Regional-Path "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
        add_header Cache-Control "no-store" always;
    }
    # JOBS_FRIENDLY_URLS_LEGACY_NUMERIC_END

'''


def render(text: str) -> str:
    hosts = re.findall(r'(?m)^\s*server_name\s+([^;]+);', text)
    assert hosts == ['jobs.portalerp.com', 'jobs.portalerp.com.br', 'jobs.portalerp.com jobs.portalerp.com.br'], 'Unexpected hostname scope'
    start = text.index('    server_name jobs.portalerp.com.br;')
    marker = '    # JOBS_FRIENDLY_URLS_LEGACY_NUMERIC_BEGIN'
    if marker in text:
        assert text.count(marker) == 1 and BLOCK in text[start:], 'Existing patch differs'
        return text
    anchor = '    location = /robots.txt'
    insert = text.index(anchor, start)
    assert text.index('    server_name jobs.portalerp.com jobs.portalerp.com.br;', start) > insert, 'Legacy server anchor outside expected block'
    result = text[:insert] + BLOCK + text[insert:]
    assert result.replace(BLOCK, '', 1) == text, 'Non-Jobs mutation detected'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('output')
    args = parser.parse_args()
    source, output = Path(args.source), Path(args.output)
    assert source.resolve() != output.resolve(), 'Render to separate file before operator validation'
    output.write_text(render(source.read_text()))
    print('jobs_legacy_numeric_proxy_rendered=true unrelated_bytes_preserved=true')


if __name__ == '__main__':
    main()
