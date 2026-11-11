#!/usr/bin/env python3
"""Pure text tests: never access or reload production Nginx."""
from pathlib import Path
import re
import unittest

from jobs_company_urls_nginx_patch import BLOCK, PREVIOUS_BLOCK, render


class CompanyNginxPatchTests(unittest.TestCase):
    def setUp(self):
        self.current = Path(__file__).with_name('nginx.jobs-global.conf').read_text()
        self.previous = self.current.replace(BLOCK, PREVIOUS_BLOCK, 1)
        self.assertIn(PREVIOUS_BLOCK, self.previous)

    def test_only_exact_previous_company_block_changes(self):
        self.assertEqual(render(self.previous), self.current)
        self.assertEqual(render(self.previous).replace(BLOCK, PREVIOUS_BLOCK, 1), self.previous)

    def test_idempotent_current_configuration(self):
        self.assertEqual(render(self.current), self.current)

    def test_insert_into_unpatched_legacy_block_only(self):
        before = self.current.replace(BLOCK, '', 1)
        after = render(before)
        self.assertEqual(after.replace(BLOCK, '', 1), before)
        self.assertEqual(after, self.current)

    def test_unexpected_hosts_fail_closed(self):
        with self.assertRaises(AssertionError):
            render(self.previous.replace('server_name jobs.portalerp.com.br;', 'server_name portalerp.com.br;'))

    def test_unknown_or_ambiguous_existing_block_fails(self):
        with self.assertRaises(AssertionError):
            render(self.previous.replace('numeric paths are not redirected.', 'unknown body'))
        with self.assertRaises(AssertionError):
            render(self.previous + PREVIOUS_BLOCK)

    def test_retired_patterns_and_unrelated_paths(self):
        expression = re.search(r'location ~ (.+) \{', BLOCK).group(1)
        for path in ['/empresas/4', '/br/empresas/4/', '/empresas/megasoft/4',
                     '/br/empresas/MEGASOFT/04/', '/companies/senior-sistemas/1']:
            self.assertRegex(path, expression)
        for path in ['/br/empresas/megasoft', '/empresas/megasoft', '/api/companies/4',
                     '/br/vagas/megasoft/consultor/1', '/admin/empresas/4']:
            self.assertNotRegex(path, expression)


if __name__ == '__main__':
    unittest.main(verbosity=2)
