"""Bounded lexical/container gates. No JSON document or ZipInfo allocation.

50 MiB transport ceiling is retained; standard non-ZIP64 single-disk archives
(including streaming data descriptors) are supported. No decompression here.
"""
import json
import re
import struct
import time

# Import limits lazily to keep one source of truth and allow isolated tests.
JSON_SECONDS = 5.0
MAX_JSON_NODES = 300_000
MAX_JSON_DEPTH = 16
MAX_NUMBER_CHARS = 1024
MAX_ZIP_METADATA_BYTES = 1024 * 1024
_SPACE = re.compile(rb'[ \t\r\n]*')
_SPECIAL = re.compile(rb'["\\\x00-\x1f]')
_NUMBER = re.compile(rb'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?')


def prescan_json(data):
    """Validate grammar and structural bounds before loads decodes a document.

    Retains only recursion frames (depth <= 17) and one bounded scalar string.
    Count values, including duplicate object members, not merely final dict keys.
    Regex scans are linear, restricted to the bounded input/scalar windows.
    """
    from src.services import import_preview_files as limits
    reject = limits.reject
    if len(data) > limits.MAX_FILE_BYTES:
        reject('import_file_too_large', 413)
    size = len(data)
    pos = 3 if data.startswith(b'\xef\xbb\xbf') else 0
    nodes = 0
    deadline = time.monotonic() + JSON_SECONDS

    def budget():
        if time.monotonic() > deadline:
            reject('import_structure_limit')

    def invalid():
        reject('import_invalid_json', 400)

    def space():
        nonlocal pos
        pos = _SPACE.match(data, pos).end()

    def string(key=False):
        nonlocal pos
        start = pos
        pos += 1
        cap = 100 if key else limits.MAX_FIELD_CHARS
        # Up to two escaped UTF-16 code units per decoded scalar. The final
        # decoded-character limit below is exact (including non-ASCII UTF-8).
        end_limit = min(size, start + cap * 12 + 2)
        escapes = 0
        while pos < end_limit:
            special = _SPECIAL.search(data, pos, end_limit)
            if special is None:
                if end_limit == size and size - start <= cap + 2:
                    invalid()
                reject('import_invalid_structure' if key else 'import_field_limit')
            pos = special.start()
            byte = data[pos]
            if byte == 34:
                pos += 1
                try:
                    text = data[start:pos].decode('utf-8')
                    decoded, end = json.decoder.scanstring(text, 1, True)
                except (UnicodeError, ValueError):
                    invalid()
                if end != len(text):
                    invalid()
                if len(decoded) > cap or '\x00' in decoded:
                    reject('import_invalid_structure' if key else 'import_field_limit')
                return
            if byte != 92 or pos + 1 >= size:
                invalid()
            escape = data[pos + 1]
            if escape == 117:
                if pos + 6 > size or any(c not in b'0123456789abcdefABCDEF' for c in data[pos + 2:pos + 6]):
                    invalid()
                pos += 6
            elif escape in b'"\\/bfnrt':
                pos += 2
            else:
                invalid()
            escapes += 1
            if escapes % 1024 == 0:
                budget()
        if end_limit == size and size - start <= cap + 2:
            invalid()
        reject('import_invalid_structure' if key else 'import_field_limit')

    def value(depth):
        nonlocal pos, nodes
        nodes += 1
        if depth > MAX_JSON_DEPTH or nodes > MAX_JSON_NODES:
            reject('import_structure_limit')
        if nodes % 1024 == 1:
            budget()
        space()
        if pos >= size:
            invalid()
        byte = data[pos]
        if byte == 34:
            string()
        elif byte in (123, 91):
            is_object = byte == 123
            closing = 125 if is_object else 93
            pos += 1
            space()
            if pos < size and data[pos] == closing:
                pos += 1
                return
            count = 0
            while True:
                count += 1
                if not is_object and count > limits.MAX_ROWS:
                    reject('import_row_limit')
                space()
                if is_object:
                    if pos >= size or data[pos] != 34:
                        invalid()
                    string(key=True)
                    space()
                    if pos >= size or data[pos] != 58:
                        invalid()
                    pos += 1
                value(depth + 1)
                space()
                if pos >= size:
                    invalid()
                byte = data[pos]
                pos += 1
                if byte == closing:
                    break
                if byte != 44:
                    invalid()
        elif byte in b'-0123456789':
            match = _NUMBER.match(data, pos, min(size, pos + MAX_NUMBER_CHARS + 1))
            if match is None:
                invalid()
            if match.end() - pos > MAX_NUMBER_CHARS:
                reject('import_field_limit')
            pos = match.end()
        else:
            for literal in (b'true', b'false', b'null'):
                if data.startswith(literal, pos):
                    pos += len(literal)
                    break
            else:
                invalid()

    value(0)
    space()
    if pos != size:
        invalid()
    budget()


def preflight_zip(data):
    """Scan actual central records before ZipFile constructs any ZipInfo.

    Reject ZIP64, multidisk, prepended executables, gaps, overlapping records,
    contradictory local metadata and unsupported flags; never trust EOCD count.
    """
    from src.services import import_preview_files as limits
    reject = limits.reject
    size = len(data)
    if size > limits.MAX_FILE_BYTES:
        reject('import_file_too_large', 413)

    def invalid():
        reject('import_invalid_zip', 400)

    # Search only the legal EOCD tail; a signature inside a comment is not EOCD.
    eocd = data.rfind(b'PK\x05\x06', max(0, size - 65557))
    while eocd >= 0:
        if eocd + 22 <= size:
            fields = struct.unpack_from('<4s4H2IH', data, eocd)
            if eocd + 22 + fields[-1] == size:
                break
        eocd = data.rfind(b'PK\x05\x06', max(0, size - 65557), eocd)
    if eocd < 0:
        invalid()
    _, disk, cd_disk, disk_count, declared_count, cd_size, cd_start, comment_len = fields
    if (disk or cd_disk or disk_count != declared_count
            or declared_count == 0xffff or cd_size == 0xffffffff or cd_start == 0xffffffff
            or data[max(0, eocd - 20):eocd - 16] == b'PK\x06\x07'):
        invalid()
    if cd_start + cd_size != eocd or cd_start > eocd:
        invalid()
    metadata = cd_size + 22 + comment_len
    if metadata > MAX_ZIP_METADATA_BYTES:
        reject('import_zip_metadata_limit')
    pos = cd_start
    count = 0
    spans = []
    total = 0

    def extras(start, length):
        end = start + length
        while start < end:
            if start + 4 > end:
                invalid()
            tag, n = struct.unpack_from('<HH', data, start)
            start += 4
            if tag == 1 or start + n > end:  # ZIP64 is explicitly out of scope.
                invalid()
            start += n

    while pos < eocd:
        count += 1
        if count > limits.MAX_ENTRIES:
            reject('import_zip_entry_limit')
        if pos + 46 > eocd or data[pos:pos + 4] != b'PK\x01\x02':
            invalid()
        central = struct.unpack_from('<4s6H3I5H2I', data, pos)
        (_, _made, needed, flags, method, _time, _date, crc, compressed, uncompressed,
         name_len, extra_len, entry_comment, start_disk, _internal, _external, local) = central
        end = pos + 46 + name_len + extra_len + entry_comment
        if end > eocd or not name_len or start_disk or needed >= 45 or 0xffffffff in (compressed, uncompressed, local):
            invalid()
        if (flags & ~0x080e or method not in (0, 8) or (method == 0 and flags & 6)):
            reject('import_zip_encrypted_or_unsupported')
        extras(pos + 46 + name_len, extra_len)
        if local + 30 > cd_start or data[local:local + 4] != b'PK\x03\x04':
            invalid()
        header = struct.unpack_from('<4s5H3I2H', data, local)
        _, local_needed, local_flags, local_method, _lt, _ld, lc, ls, lu, ln, le = header
        local_data = local + 30 + ln + le
        if local_data > cd_start:
            invalid()
        if local_flags & (1 | 64 | 8192):
            reject('import_zip_encrypted_or_unsupported')
        if (local_needed != needed or local_flags != flags or local_method != method
                or ln != name_len or data[local + 30:local + 30 + ln] != data[pos + 46:pos + 46 + name_len]):
            invalid()
        metadata += 30 + ln + le
        if metadata > MAX_ZIP_METADATA_BYTES:
            reject('import_zip_metadata_limit')
        extras(local + 30 + ln, le)
        data_end = local_data + compressed
        if data_end > cd_start:
            invalid()
        expected = (crc, compressed, uncompressed)
        if flags & 8:
            if (lc, ls, lu) not in ((0, 0, 0), expected):
                invalid()
            # Both standard descriptor layouts are valid; compare every field.
            if (data_end + 16 <= cd_start and data[data_end:data_end + 4] == b'PK\x07\x08'
                    and struct.unpack_from('<3I', data, data_end + 4) == expected):
                data_end += 16
                metadata += 16
            elif data_end + 12 <= cd_start and struct.unpack_from('<3I', data, data_end) == expected:
                data_end += 12
                metadata += 12
            else:
                invalid()
        elif (lc, ls, lu) != expected:
            invalid()
        if metadata > MAX_ZIP_METADATA_BYTES:
            reject('import_zip_metadata_limit')
        if method == 0 and compressed != uncompressed:
            invalid()
        total += uncompressed
        if total > limits.MAX_FILE_BYTES or uncompressed > limits.MAX_FILE_BYTES:
            reject('import_file_too_large', 413)
        if uncompressed > max(compressed, 1) * 200:
            reject('import_zip_expansion_ratio')
        spans.append((local, data_end))
        pos = end
    if pos != eocd or count != declared_count:
        invalid()
    cursor = 0
    for start, end in sorted(spans):
        if start != cursor:
            invalid()
        cursor = end
    if cursor != cd_start:
        invalid()
