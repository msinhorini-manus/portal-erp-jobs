# Public company URL identity — revision 20261111_12

Consumers render `/br/empresas/megasoft`, without a public ID suffix. Existing internal numeric company/user/site/job identities and numeric API consumers are unchanged. There are no redirects or URL editing endpoints. This backend change alone is not a published frontend or a production deployment.

## Public reads

`GET /api/companies/by-slug/<slug>` is public and returns the **same flat DTO** as `GET /api/companies/<numeric_id>`, not a wrapper:

```typescript
interface PublicCompanyIdentity {
  id: number; // unchanged internal company identity; not part of the public URL
  site_id: number;
  site_code: string;
  public_profile_slug: string | null;
  jobs: PublicJob[];
  active_jobs_count: number;
  // Existing public presentation fields remain unchanged.
}
```

Slug lookup requires an exact valid lowercase ASCII/hyphen segment, at most 140 characters, containing at least one letter. Numeric-only, reserved, mixed-case, malformed and unknown slugs return 404, without normalization or redirects. The route uses only the server-resolved trusted **active current site**, an approved `CompanySite`, an active global company owner, and a matching owned country reservation. Pending/rejected/suspended memberships, inactive owners/sites, and foreign-only profiles return 404. Host/prefix trust and rejection of client-selected region authority are unchanged. An identically spelled slug in another country never supplies a result for the current site.

The approved regional membership, rather than the legacy global company status, remains authoritative. BR remains the only active seeded region; this revision does not activate any region. Public projections omit user identity, tax IDs, contact phone/address/ZIP and approval metadata. Named company pages exclude confidential jobs. All shared job/application/admin projections expose `company_profile_slug: null` for confidential jobs, including public→hidden edits.

`Company.to_public_dict()` and job identity projections return only a valid stored slug backed by a reservation owned by that company in the membership site's ISO country, with an approved membership and active owner. Legacy NULL, invalid or unreserved snapshots have a NULL profile-slug projection: **no arbitrary fallback and no persistence on GET**. The public directory and numeric public detail share slug lookup eligibility; inactive owners and absent snapshots cannot leave cards or employer links pointing to a 404 profile. Private management/CRUD endpoints and internal numeric identities are unchanged. Consumers must fail closed rather than derive links from names, IDs or job-brand slugs.

## Country ownership and transactional allocation

`company_slug_reservations` owns permanent keys under `UNIQUE(country_code, slug)`. Country is the site's canonical uppercase two-letter ISO country, **not `site_id` or site code**. Two sites in BR cannot allocate one key to different companies. Different countries may reuse a slug. The same company may use the same reservation in more than one same-country site membership. Every approval state reserves identity; suspension, rejection and membership deletion do not free keys. Hard company deletion leaves `company_id=NULL` tombstones via `ON DELETE SET NULL`; a tombstone cannot be reassigned to another company, even if an internal numeric ID is later reused.

New ORM memberships normalize nonblank regional display names, otherwise global names, using NFKD ASCII lowercase/hyphen. Invalid, numeric-only or reserved name results use `empresa`. The exact reserved-token policy is frozen in `src/company_slug_policy_v12.py`; it is independent of legacy job URL normalization.

Allocation tries the base, then meaningful sector and city qualifiers, then their combination, then alphabetic suffixes (`a`…`z`, `aa`…), never internal numeric IDs. Every candidate is at most 140 characters. PostgreSQL uses `INSERT ... ON CONFLICT DO NOTHING`; SQLite uses one serialized atomic `INSERT ... SELECT ... WHERE ... ON CONFLICT DO NOTHING` write statement. The reservation insert, owner resolution and membership creation share the registration transaction. There is no separate check-then-insert race. If registration rolls back, its reservation rolls back as well.

## Stable snapshots and raw/legacy writes

Registration and owner/Admin update whitelists continue ignoring submitted profile-slug fields. No UI/API slug editor is added. Renames, status changes, ordinary profile edits and job edits never regenerate established snapshots. DB triggers reject changes to non-NULL profile snapshots or to membership company/site identities, and refuse country changes on a site with any company membership. They enforce live snapshot/reservation owner consistency, including raw inserts, NULL→valid controlled writes, and SQLite `INSERT OR REPLACE` bypass attempts. Reservation key/ownership edits and deletes are forbidden except FK-driven NULL tombstoning after real company deletion.

PostgreSQL country changes additionally reject REPEATABLE READ/SERIALIZABLE transactions before consulting membership existence, preventing stale snapshots from missing a concurrently committed membership. The current SQLite production behavior is unchanged; PostgreSQL normal READ COMMITTED uses the existing site-row lock and live membership guard.

A revision11 older ORM writer does **not** need to know the reservation table: a unique valid explicit snapshot insert causes the DB trigger to reserve it in the same transaction. A conflicting or malformed legacy explicit snapshot fails safely and rolls back; old writers do not automatically get collision suffixes. Raw/older NULL inserts remain accepted as explicitly non-public profiles. Setting a legacy NULL snapshot to a unique valid value creates an owned reservation and then freezes it. Clearing an established snapshot is forbidden. Deployment must not silently backfill these rows during reads.

The separate `Job.public_company_slug` / `public_title_slug` snapshots and confidentiality behavior are untouched. Jobs created after a rename may use a newer job-brand slug while company profile links retain their original country identity.

## Migration, preservation and rollback

Chain: `20261110_09 → 20261111_10 → 20261111_11 → 20261111_12`. Revision12 adds only the reservation table/index/check/unique/FK and trigger functions/guards; it does not rebuild existing SQLite tables or alter old IDs, timestamps, site activation, job/application data or job URL snapshots. Canonical country preflight runs before DDL. It first reserves every valid existing distinct key by membership ID order, preserving later unique keys against qualifier theft. Then it resolves different-company same-country collisions deterministically, and repairs invalid/NULL snapshots. Source reads use ID-keyset chunks of 500; a migration-only ownership map avoids quadratic database probes.

Prefer **code-only rollback retaining schema12 and tombstones**. Unique revision11 writers remain compatible; colliding legacy writers fail safely. Explicit downgrade12→11 removes only the exact new guards/functions and reservation table; allocated company snapshots and every previous schema object/row survive. However, downgrade destroys deletion tombstones. A downgrade/re-upgrade cannot reconstruct keys for already hard-deleted owners and must not be used as a safe slug-serving rollback. Preserve/restore the complete schema12 database backup instead. Downgrading11→10 additionally removes the profile snapshot; revision10 job snapshots remain intact.

SQLite and PostgreSQL are supported. Tests use isolated backend-suite subprocesses, disposable SQLite files and (when available) disposable local Unix-socket-only PostgreSQL clusters. The historical PostgreSQL baseline→revision03 migration has preexisting SQLite-only SQL; revision12 PostgreSQL migration tests construct equivalent revision11 ORM metadata and stamp11, then verify upgrade12/check/downgrade11/re-upgrade12. This limitation is not repaired by this slug-only change. No credentials, provider calls, production access or deployment are required.
