#!/usr/bin/env python3
"""Explicit Jobs-only routing configuration cutover, not an Alembic migration.

Requires schema 20261110_09 and BR-only activation. Business rows and sessions
are never changed. Rollback reconciles ONLY these two domain configuration
records and canonical_origin; it never restores an old database snapshot.
"""
import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

OLD_HOST = 'jobs.portalerp.com.br'
NEW_HOST = 'jobs.portalerp.com'
OLD_ORIGIN = 'https://' + OLD_HOST
NEW_ORIGIN = 'https://' + NEW_HOST
PREFIX = '/br'
SCHEMA = '20261110_09'


def snapshot(c):
    br = c.execute('SELECT * FROM sites WHERE code=?', ('BR',)).fetchone()
    if br is None:
        raise RuntimeError('BR site missing; no changes made')
    if c.execute('SELECT version_num FROM alembic_version').fetchone()[0] != SCHEMA:
        raise RuntimeError('Expected schema 09; no changes made')
    if c.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or c.execute('PRAGMA foreign_key_check').fetchall():
        raise RuntimeError('Database integrity gate failed; no changes made')
    if [(r['code']) for r in c.execute('SELECT code FROM sites WHERE is_active=1 ORDER BY code')] != ['BR']:
        raise RuntimeError('This cutover requires only BR active; no changes made')
    if (br['country_code'], br['default_locale'], br['currency_code']) != ('BR', 'pt-BR', 'BRL'):
        raise RuntimeError('Unexpected BR regional contract; no changes made')
    if c.execute('SELECT COUNT(*) FROM site_locales WHERE site_id=? AND locale=? AND is_default=1 AND is_active=1', (br['id'], 'pt-BR')).fetchone()[0] != 1:
        raise RuntimeError('BR default locale invalid; no changes made')
    old = c.execute('SELECT * FROM site_domains WHERE hostname=? AND url_prefix=?', (OLD_HOST, '')).fetchone()
    new = c.execute('SELECT * FROM site_domains WHERE hostname=? AND url_prefix=?', (NEW_HOST, PREFIX)).fetchone()
    if old is None or old['site_id'] != br['id'] or not old['is_active']:
        raise RuntimeError('Expected active old BR alias; no changes made')
    if new is not None and new['site_id'] != br['id']:
        raise RuntimeError('Global pair is assigned to another site; no changes made')
    if any(r['hostname'] not in [OLD_HOST, NEW_HOST] for r in c.execute('SELECT hostname FROM site_domains WHERE site_id=? AND is_primary=1', (br['id'],))):
        raise RuntimeError('Unexpected primary domain; no changes made')
    return br, old, new


def apply(database, direction):
    database = Path(database).resolve(strict=True)
    c = sqlite3.connect(str(database), timeout=30, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    c.execute('BEGIN IMMEDIATE')
    try:
        br, old, new = snapshot(c)
        business_counts = {table: c.execute('SELECT COUNT(*) FROM ' + table).fetchone()[0]
                           for table in ['users', 'companies', 'candidates', 'jobs', 'applications', 'auth_session_families']}
        stamp = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(' ', timespec='microseconds')
        changed = False
        if direction == 'cutover':
            if br['canonical_origin'] not in [OLD_ORIGIN, NEW_ORIGIN]:
                raise RuntimeError('Unexpected old canonical; no changes made')
            if new is not None and new['is_primary'] and new['is_active'] and br['canonical_origin'] == NEW_ORIGIN and not old['is_primary']:
                pass
            else:
                if not old['is_primary'] and (new is None or not new['is_primary']):
                    raise RuntimeError('BR primary state ambiguous; no changes made')
                c.execute('UPDATE site_domains SET is_primary=0,updated_at=? WHERE id=?', (stamp, old['id']))
                if new is None:
                    c.execute('INSERT INTO site_domains(site_id,hostname,url_prefix,is_primary,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', (br['id'], NEW_HOST, PREFIX, 1, 1, stamp, stamp))
                else:
                    c.execute('UPDATE site_domains SET is_primary=1,is_active=1,updated_at=? WHERE id=?', (stamp, new['id']))
                c.execute('UPDATE sites SET canonical_origin=?,updated_at=? WHERE id=?', (NEW_ORIGIN, stamp, br['id']))
                changed = True
        else:
            if br['canonical_origin'] not in [OLD_ORIGIN, NEW_ORIGIN]:
                raise RuntimeError('Canonical changed after cutover; manual reconciliation required')
            if new is None and br['canonical_origin'] == OLD_ORIGIN and old['is_primary']:
                pass
            else:
                if new is None or not new['is_primary'] or br['canonical_origin'] != NEW_ORIGIN:
                    raise RuntimeError('Post-cutover domain state changed; manual reconciliation required')
                # Remove only the exact migration alias, never another site or business row.
                c.execute('DELETE FROM site_domains WHERE id=? AND site_id=? AND hostname=? AND url_prefix=?', (new['id'], br['id'], NEW_HOST, PREFIX))
                c.execute('UPDATE site_domains SET is_primary=1,updated_at=? WHERE id=?', (stamp, old['id']))
                c.execute('UPDATE sites SET canonical_origin=?,updated_at=? WHERE id=?', (OLD_ORIGIN, stamp, br['id']))
                changed = True
        expected_origin = NEW_ORIGIN if direction == 'cutover' else OLD_ORIGIN
        expected_host = NEW_HOST if direction == 'cutover' else OLD_HOST
        expected_prefix = PREFIX if direction == 'cutover' else ''
        primaries = c.execute('SELECT hostname,url_prefix,is_active FROM site_domains WHERE site_id=? AND is_primary=1', (br['id'],)).fetchall()
        if len(primaries) != 1 or tuple(primaries[0]) != (expected_host, expected_prefix, 1):
            raise RuntimeError('Primary-domain gate failed; transaction rolled back')
        if c.execute('SELECT canonical_origin FROM sites WHERE id=?', (br['id'],)).fetchone()[0] != expected_origin:
            raise RuntimeError('Canonical gate failed; transaction rolled back')
        if business_counts != {table: c.execute('SELECT COUNT(*) FROM ' + table).fetchone()[0] for table in business_counts}:
            raise RuntimeError('Business data changed; transaction rolled back')
        if c.execute('PRAGMA foreign_key_check').fetchall():
            raise RuntimeError('Foreign-key gate failed; transaction rolled back')
        if changed:
            c.execute('INSERT INTO admin_audit_events(site_id,actor_admin_id,action,target_type,target_id,details,created_at) VALUES (?,NULL,?,?,?,?,?)',
                      (br['id'], 'platform.jobs_domain_' + direction, 'site', str(br['id']),
                       json.dumps({'scope': 'Jobs BR only', 'old_origin': OLD_ORIGIN, 'new_origin': NEW_ORIGIN, 'prefix': PREFIX,
                                   'execution': 'authorized deployment operation; no interactive admin impersonation',
                                   'business_rows_preserved': True}, sort_keys=True), stamp))
        c.execute('COMMIT')
        return {'direction': direction, 'changed': changed, 'canonical_origin': expected_origin,
                'url_prefix': expected_prefix, 'schema': SCHEMA, 'business_counts_preserved': True, 'fk_count': 0}
    except Exception:
        c.execute('ROLLBACK')
        raise
    finally:
        c.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('direction', choices=['cutover', 'rollback'])
    parser.add_argument('--database', required=True, help='Explicit SQLite database path (schema 09 required)')
    args = parser.parse_args()
    print(json.dumps(apply(args.database, args.direction), indent=2))
