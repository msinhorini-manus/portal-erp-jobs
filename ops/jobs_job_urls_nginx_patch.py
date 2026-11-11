#!/usr/bin/env python3
"""Retire Jobs-only legacy numeric job paths with 404; never reload Nginx."""
import argparse
from pathlib import Path
import re

BLOCK = '''    # JOBS_FRIENDLY_URLS_LEGACY_NUMERIC_BEGIN
    # Pre-launch URL replacement: obsolete numeric job paths are not redirected.
    location ~ ^/(?:br/)?vagas/[0-9]+/?$ {
        return 404;
        add_header X-Robots-Tag "noindex" always;
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
    print('jobs_legacy_numeric_paths_retired_404=true unrelated_bytes_preserved=true')


if __name__ == '__main__':
    main()
