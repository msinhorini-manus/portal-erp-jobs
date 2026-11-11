# Public company URL identity — revision 20261111_11

The backend adds `CompanySite.public_profile_slug: String(140) | null`, scoped to the existing unique `(company_id, site_id)` membership. Public URLs are rendered by consumers, for example `/br/empresas/megasoft/4`; the backend does not introduce redirects or new slug-based endpoints. Existing numeric company API identities remain unchanged.

## Read contract

`Company.to_public_dict(membership)`, used by `/api/companies/search`, `/api/companies/<id>` and visible company projections in job details, adds:

```typescript
interface PublicCompanyIdentity {
  id: number; // Existing global company ID
  site_id: number; // Membership site, for fail-closed regional validation
  site_code: string;
  public_profile_slug: string;
}
```

`Job.public_identity_dict()` adds `company_profile_slug: string | null`. It comes from the job's **same-site** membership snapshot or its read-only fallback. It is always `null` when `is_company_hidden` is true, including after a public-to-hidden edit and when the stored profile slug is null. The shared identity is reused by job, application and administrative projections; no confidential job links to a named company profile. Named public company pages retain their existing hidden-job exclusion.

The separate `Job.public_company_slug` and `Job.public_title_slug` snapshots and their confidentiality rules are unchanged. A new job created after a company rename may have a newer job-brand slug while its company profile link still uses the original regional profile snapshot. Consumers must not substitute the job-brand slug for the company profile slug.

## Stability and write contract

New `CompanySite` ORM inserts snapshot the regional `display_name` when nonblank, otherwise the global `Company.company_name`, normalized through `src.job_slugs.public_company_slug`. Normalization is NFKD ASCII/lowercase/hyphen, capped at 140 characters, with `empresa` fallback. Equal names do not require a unique slug: the numeric company ID remains authoritative.

Renames, approval changes, ordinary profile edits and job edits never regenerate the membership snapshot. Existing company registration and company/Admin mutation whitelists do not accept snapshot writes; submitted snapshot keys are ignored as other unsupported company fields are. The field is a public **read-only DTO** field, not a writable URL alias. No write endpoint or redirect table is added.

A null legacy snapshot resolves on reads only using the same regional/global normalization. Reads do not persist the fallback or modify timestamps. Consequently, a null legacy row can have a changing fallback until backfilled; persisted snapshots remain stable.

## Migration and rollback

The chain is `20261110_09 → 20261111_10 → 20261111_11`. Revision 11 adds one nullable column using additive `ADD COLUMN` on SQLite (no upgrade table rebuild). A frozen v1 helper inside the revision backfills only null company profile snapshots deterministically in ID-ordered keyset chunks of 500; it uses Core updates, not ORM/timestamp hooks. It does not change any existing company, membership, job, application, site, access or snapshot columns.

For normal deployment rollback, roll back **code only** and leave revision 11/its nullable column in place. Older writers can omit the column and insert null values. An explicit schema downgrade to revision 10 removes only the profile snapshot via Alembic batch mode; the existing Alembic SQLite environment handles foreign-key enforcement around reconstruction and checks all foreign keys afterwards. Downgrading deliberately loses the new snapshot values, not old rows or identities. Historical job snapshots remain intact at revision 10.

All tests run only against disposable local SQLite databases, one backend suite per isolated subprocess. Approval/access guards, same-site API filtering, confidentiality and regional host/prefix authority remain unchanged. This backend change alone does not constitute frontend publication or production deployment.
