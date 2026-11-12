#!/usr/bin/env python3
"""Retire legacy company IDs and slug/ID profiles only; never reload Nginx."""
import argparse
from pathlib import Path
import re

PREVIOUS_BLOCK = '''    # JOBS_COMPANY_URLS_LEGACY_NUMERIC_BEGIN
    # Pre-launch company profile URLs: numeric paths are not redirected.
    location ~ ^/(?:br/)?(?:empresas|companies)/[0-9]+/?$ {
        return 404;
        add_header X-Robots-Tag "noindex" always;
        add_header Cache-Control "no-store" always;
    }
    # JOBS_COMPANY_URLS_LEGACY_NUMERIC_END

'''
BLOCK = '''    # JOBS_COMPANY_URLS_LEGACY_NUMERIC_BEGIN
    # Country-unique company profiles: retired ID and slug/ID paths are not redirected.
    location ~ ^/(?:br/)?(?:empresas|companies)/(?:[0-9]+|[^/]+/[0-9]+)/?$ {
        return 404;
        add_header X-Robots-Tag "noindex" always;
        add_header Cache-Control "no-store" always;
    }
    # JOBS_COMPANY_URLS_LEGACY_NUMERIC_END

'''


def render(text: str) -> str:
    hosts = re.findall(r'(?m)^\s*server_name\s+([^;]+);', text)
    assert hosts == ['jobs.portalerp.com', 'jobs.portalerp.com.br', 'jobs.portalerp.com jobs.portalerp.com.br'], 'Unexpected Jobs hostname scope'
    start = text.index('    server_name jobs.portalerp.com.br;')
    end = text.index('    server_name jobs.portalerp.com jobs.portalerp.com.br;', start)
    marker = '    # JOBS_COMPANY_URLS_LEGACY_NUMERIC_BEGIN'
    if marker in text:
        assert text.count(marker) == 1, 'Ambiguous company block'
        if BLOCK in text[start:end]:
            return text
        assert PREVIOUS_BLOCK in text[start:end], 'Existing company patch differs'
        result = text.replace(PREVIOUS_BLOCK, BLOCK, 1)
        assert result.replace(BLOCK, PREVIOUS_BLOCK, 1) == text, 'Unrelated Nginx bytes changed'
        return result
    anchor = '    location = /robots.txt'
    insert = text.index(anchor, start)
    assert insert < end, 'Legacy anchor outside expected server'
    result = text[:insert] + BLOCK + text[insert:]
    assert result.replace(BLOCK, '', 1) == text, 'Unrelated Nginx bytes changed'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('output')
    args = parser.parse_args()
    source, output = Path(args.source), Path(args.output)
    assert source.resolve() != output.resolve(), 'Render separately before operator validation'
    output.write_text(render(source.read_text()))
    print('legacy_company_ids_retired_without_redirect=true unrelated_bytes_preserved=true')


if __name__ == '__main__':
    main()
