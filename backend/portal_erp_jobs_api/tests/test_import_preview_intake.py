"""Optional offline real-intake gate. No records, names or contacts are printed.

Requires IMPORT_PREVIEW_INTAKE_DIR. Reconstructs archive bytes in RAM from the
provided expanded attachments; does not copy fixtures into Git or alter input.
Run in its own process, exactly like the synthetic suites.
"""
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import unittest
import zipfile

os.environ['PYTHON_DOTENV_DISABLED'] = '1'
os.environ['SECRET_KEY'] = 'intake-preview-test-secret-key-at-least-32'
os.environ['JWT_SECRET_KEY'] = 'intake-preview-test-jwt-secret-key-at-least-32'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

from src.services.import_preview import build_preview
from src.services.import_preview_files import parse_input

ROOT = Path(os.environ.get('IMPORT_PREVIEW_INTAKE_DIR', '/nonexistent-intake'))


def archive(paths):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in paths:
            z.writestr(path.relative_to(ROOT).as_posix(), path.read_bytes())
    return output.getvalue()


@unittest.skipUnless((ROOT / 'catalogo/vagas.db').is_file(), 'Provide explicit offline intake directory')
class RealIntakeTests(unittest.TestCase):
    def test_lote6_counts_logos_and_missing_lots_document(self):
        files = [ROOT / 'novas-lote6.json', *sorted((ROOT / 'lotes').glob('*.json')), *sorted((ROOT / 'logos-small').glob('*.png'))]
        original = {path: hashlib.sha256(path.read_bytes()).digest() for path in files}
        source = parse_input(archive(files), 'zip')
        self.assertEqual(len(source['companies']), 15)
        self.assertEqual(sum(len(c['vagas']) for c in source['companies']), 70)
        self.assertEqual(len(source['logos']), 15)
        dto = build_preview(archive(files), 'zip')
        self.assertEqual([dto['totals'][k] for k in ('companies', 'jobs', 'logos')], [15, 70, 15])
        missing = build_preview((ROOT / 'novas-lote6.json').read_bytes(), 'json')
        self.assertEqual(missing['totals']['jobs'], 0)
        self.assertEqual(sum(m['code'] == 'missing_lots' for item in missing['items'] for m in item['messages']), 15)
        self.assertEqual(original, {path: hashlib.sha256(path.read_bytes()).digest() for path in files})
        print('Offline Lote6: 15 companies, 70 jobs, 15 verified logos; standalone JSON warns 15 missing lots; source hashes unchanged.')

    def test_catalog_zip_full_consistency_and_offline_description_counts(self):
        files = [ROOT / 'catalogo/vagas.csv', ROOT / 'catalogo/vagas.db']
        original = {path: hashlib.sha256(path.read_bytes()).digest() for path in files}
        zipped = archive(files)
        source = parse_input(zipped, 'zip')
        self.assertEqual(len(source['catalog']), 6088)
        self.assertEqual(sum(bool((r.get('descricao') or '').strip()) for r in source['catalog']), 5806)
        self.assertEqual(sum(not bool((r.get('descricao') or '').strip()) for r in source['catalog']), 282)
        self.assertEqual(sum(len(r.get('titulo') or '') > 100 for r in source['catalog']), 37)
        dto = build_preview(zipped, 'zip', parsed=source)
        self.assertEqual(dto['totals']['jobs'], 6088)
        self.assertEqual(sum(m['code'] == 'missing_description' for item in dto['items'] for m in item['messages']), 282)
        self.assertEqual(sum(m['code'] == 'field_too_long' and m['field'] == 'titulo' for item in dto['items'] for m in item['messages']), 37)
        self.assertEqual(original, {path: hashlib.sha256(path.read_bytes()).digest() for path in files})
        print('Offline catalog: 6088 keys/rows consistent CSV+SQLite; 5806 descriptions, 282 absent; 37 overlong titles; source hashes unchanged.')

    def test_standalone_csv_never_silent_publication_success(self):
        dto = build_preview((ROOT / 'catalogo/vagas.csv').read_bytes(), 'csv')
        self.assertEqual(dto['totals']['jobs'], 6088)
        self.assertEqual(sum(m['code'] == 'missing_description' for item in dto['items'] for m in item['messages']), 6088)
        self.assertFalse(dto['execution_enabled'])
        self.assertEqual(dto['status'], 'preview_only')
        print('Offline CSV alone: 6088 missing-description blockers; no execution.')


if __name__ == '__main__':
    unittest.main()
