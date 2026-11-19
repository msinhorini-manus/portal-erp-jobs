"""New acceptance gates for SR-01/02/04. Synthetic fixtures, isolated process."""
import io
import json
import struct
import unittest
from unittest.mock import patch
import zipfile

import test_import_preview_engine as fixture
from src.services import import_preview_preflight as preflight
files = fixture.files


def minimal():
    return fixture.zipped([('empresas.json', b'{"empresas":[]}')])


def change(data, offset, fmt, value):
    result = bytearray(data)
    struct.pack_into(fmt, result, offset, value)
    return bytes(result)


class SecurityEngineGates(unittest.TestCase):
    def no_metadata(self, data, code=None):
        with patch.object(zipfile.ZipInfo, '__init__', side_effect=AssertionError('ZipInfo before bounded gate')), \
             patch.object(zipfile.ZipFile, 'open', side_effect=AssertionError('decompression before bounded gate')):
            with self.assertRaises(files.ImportInputError) as error:
                files.parse_input(data, 'zip')
        if code:
            self.assertEqual(error.exception.code, code)

    def no_json(self, data, code):
        with patch.object(files.json, 'loads', side_effect=AssertionError('JSON before structural gate')):
            with self.assertRaises(files.ImportInputError) as error:
                files.parse_input(data, 'json')
        self.assertEqual(error.exception.code, code)

    def test_json_list_depth_field_key_number_and_total_nodes_before_load(self):
        self.no_json(b'[' + b'0,' * 350000 + b'0]', 'import_row_limit')
        self.no_json(b'[' * 1000 + b'0' + b']' * 1000, 'import_structure_limit')
        self.no_json(b'"' + b'x' * (files.MAX_FIELD_CHARS + 1) + b'"', 'import_field_limit')
        self.no_json(b'{"' + b'x' * 101 + b'":0}', 'import_invalid_structure')
        self.no_json(b'1' * (preflight.MAX_NUMBER_CHARS + 1), 'import_field_limit')
        # No list exceeds 10k: only total value-node count exceeds 300k.
        array = b'[' + b'0,' * 9999 + b'0]'
        self.no_json(b'[' + b','.join([array] * 31) + b']', 'import_structure_limit')
        # Duplicate members must count even though final dict would collapse.
        self.no_json(b'{' + b'"x":0,' * 300001 + b'"x":0}', 'import_structure_limit')

    def test_json_escape_unicode_limits_grammar_and_deadline(self):
        accepted = [b'{"empresas":[]}', b'\xef\xbb\xbf{"empresas":[]}',
                    json.dumps({'empresas': [], 'unicode': '\U0001f600' * 100}).encode(),
                    b'{"empresas":[],"metadata":"braces{}[]\\\"\\\\"}',
                    b'{"empresas":[],"x":[true,false,null,-0.12e+2]}']
        for data in accepted:
            self.assertEqual(files.parse_input(data, 'json')['companies'], [])
        for data in (b'{"empresas":[],}', b'{"empresas":[] "x":0}', b'[1,]', b'01',
                     b'"\\q"', b'"\\uZZZZ"', b'"a\n"', b'{"x":NaN}', b'{}{}', b'"\xff"', b'"unterminated'):
            self.no_json(data, 'import_invalid_json')
        self.no_json(b'"' + b'\\u0061' * (files.MAX_FIELD_CHARS + 1) + b'"', 'import_field_limit')
        with patch.object(preflight, 'JSON_SECONDS', -1):
            self.no_json(b'{"empresas":[]}', 'import_structure_limit')

    def test_json_transport_50mib_preserved_not_2mib(self):
        data = b' ' * (3 * 1024 * 1024) + b'{"empresas":[]}'
        self.assertEqual(files.parse_input(data, 'json')['companies'], [])
        data = b' ' * (files.MAX_FILE_BYTES - 15) + b'{"empresas":[]}'
        self.assertLessEqual(len(data), files.MAX_FILE_BYTES)
        self.assertEqual(files.parse_input(data, 'json')['companies'], [])

    def test_central_real_incremental_count_forged_eocd_before_zipinfo(self):
        data = fixture.zipped([('empresas.json', b'{"empresas":[]}')] +
                              [('lotes/job-%d.json' % n, b'[]') for n in range(2000)])
        for declared in (1, 1000, 2001):
            eocd = data.rfind(b'PK\x05\x06')
            forged = change(change(data, eocd + 8, '<H', declared), eocd + 10, '<H', declared)
            self.no_metadata(forged, 'import_zip_entry_limit')
        print('Gate: 2001 actual central entries, forged counters 1/1000/2001; 0 ZipInfo objects.')

    def test_central_and_local_metadata_bytes_before_zipinfo(self):
        info = zipfile.ZipInfo('empresas.json')
        info.comment = b'x' * 60000
        entries = [(info, b'{"empresas":[]}')]
        for n in range(20):
            item = zipfile.ZipInfo('lotes/job-%d.json' % n)
            item.comment = b'x' * 60000
            entries.append((item, b'[]'))
        self.no_metadata(fixture.zipped(entries), 'import_zip_metadata_limit')
        data = minimal()
        eocd = data.rfind(b'PK\x05\x06')
        cd_size = struct.unpack_from('<I', data, eocd + 12)[0]
        with patch.object(preflight, 'MAX_ZIP_METADATA_BYTES', cd_size + 22 + 1):
            self.no_metadata(data, 'import_zip_metadata_limit')

    def test_zip64_multidisk_bad_counts_offsets_sizes_and_extra(self):
        data = minimal()
        central = data.find(b'PK\x01\x02')
        eocd = data.rfind(b'PK\x05\x06')
        for offset, fmt, value in ((eocd + 4, '<H', 1), (eocd + 6, '<H', 1),
                                   (eocd + 8, '<H', 0), (eocd + 10, '<H', 0xffff),
                                   (eocd + 12, '<I', 0xffffffff), (eocd + 16, '<I', 1),
                                   (central + 34, '<H', 1), (central + 42, '<I', 1),
                                   (central + 20, '<I', 0xffffffff), (central + 6, '<H', 45)):
            self.no_metadata(change(data, offset, fmt, value), 'import_invalid_zip')
        info = zipfile.ZipInfo('empresas.json')
        for extra in (struct.pack('<HHQ', 1, 8, 0), struct.pack('<HH', 0xbeef, 50) + b'x', b'x'):
            info.extra = extra
            self.no_metadata(fixture.zipped([(info, b'{"empresas":[]}')]), 'import_invalid_zip')

    def test_local_only_encryption_flags_method_name_crc_sizes_contradictions(self):
        data = minimal()
        for offset, fmt, value, code in (
            (6, '<H', 1, 'import_zip_encrypted_or_unsupported'),
            (6, '<H', 64, 'import_zip_encrypted_or_unsupported'),
            (6, '<H', 8, 'import_invalid_zip'), (8, '<H', 0, 'import_invalid_zip'),
            (14, '<I', 1, 'import_invalid_zip'), (18, '<I', 1, 'import_invalid_zip'),
            (22, '<I', 1, 'import_invalid_zip'), (26, '<H', 1, 'import_invalid_zip'),
            (28, '<H', 65535, 'import_invalid_zip'), (30, '<B', ord('x'), 'import_invalid_zip')):
            self.no_metadata(change(data, offset, fmt, value), code)
        central = data.find(b'PK\x01\x02')
        for flags in (1, 16, 32, 64, 8192, 0x8000):
            self.no_metadata(change(data, central + 8, '<H', flags), 'import_zip_encrypted_or_unsupported')

    def test_overlapping_offsets_gaps_and_stored_size_contradictions(self):
        data = fixture.zipped([('empresas.json', b'{"empresas":[]}'), ('lotes/x.json', b'[]')])
        second = data.find(b'PK\x01\x02', data.find(b'PK\x01\x02') + 4)
        self.no_metadata(change(data, second + 42, '<I', 0), 'import_invalid_zip')
        data = fixture.zipped([('empresas.json', b'{"empresas":[]}')], zipfile.ZIP_STORED)
        central = data.find(b'PK\x01\x02')
        # Local and central agree, but stored compressed != uncompressed.
        self.no_metadata(change(change(data, 22, '<I', 1), central + 24, '<I', 1), 'import_invalid_zip')
        # Append/prepend bytes without adjusting authoritative offsets.
        self.no_metadata(b'junk' + minimal(), 'import_invalid_zip')
        self.no_metadata(minimal() + b'junk', 'import_invalid_zip')

    def test_streaming_descriptors_supported_signed_unsigned_and_contradictions(self):
        class Stream(io.BytesIO):
            def seekable(self):
                return False
            def seek(self, *_args):
                raise OSError('unseekable fixture')
        output = Stream()
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('empresas.json', b'{"empresas":[]}')
        data = output.getvalue()
        self.assertEqual(files.parse_input(data, 'zip')['companies'], [])
        descriptor = data.find(b'PK\x07\x08')
        self.no_metadata(change(data, descriptor + 4, '<I', 1), 'import_invalid_zip')
        self.no_metadata(change(data, 18, '<I', 1), 'import_invalid_zip')
        # Unsigned descriptor: remove signature and correct EOCD CD offset.
        unsigned = data[:descriptor] + data[descriptor + 4:]
        eocd = unsigned.rfind(b'PK\x05\x06')
        start = struct.unpack_from('<I', unsigned, eocd + 16)[0]
        unsigned = change(unsigned, eocd + 16, '<I', start - 4)
        self.assertEqual(files.parse_input(unsigned, 'zip')['companies'], [])

    def test_eocd_comment_signatures_valid_utf8_and_safe_normal_zip(self):
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as archive:
            archive.comment = b'comment PK\x05\x06 not an EOCD'
            archive.writestr('empresas.json', b'{"empresas":[]}')
        # Our preflight understands a false EOCD signature in comments; Python
        # zipfile itself does not. Preflight is not a replacement ZIP decoder.
        preflight.preflight_zip(output.getvalue())
        self.assertEqual(files.parse_input(minimal(), 'zip')['companies'], [])


if __name__ == '__main__':
    unittest.main()
