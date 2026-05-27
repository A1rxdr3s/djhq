-- Allow domain reuse after soft-deletion.
--
-- The original global unique constraint (custom_domains_domain_unique) blocks any
-- INSERT for a domain that was previously removed, because the soft-deleted row
-- stays in the table as an audit record.
--
-- Fix: drop the global constraint and replace it with a partial unique index that
-- only enforces uniqueness when removed_at IS NULL (i.e., the domain is currently
-- live/active/pending — not yet retired).
--
-- Why removed_at IS NULL rather than status <> 'removed':
--   removed_at is the durable, timestamped lifecycle marker for soft deletion.
--   status is a text column that can drift (e.g., a future migration renames a value
--   or a bug leaves a row in an unexpected state). The null/non-null condition on
--   removed_at is structurally safer and semantically clear: if removed_at has a
--   value the domain is retired; if it is null the domain is actively owned.
--
-- The existing partial unique index on (domain) WHERE status = 'active' is kept
-- because middleware uses it for fast single-row lookups. It does not govern insert
-- uniqueness — that role is now taken by the new live-domain index below.

-- 1. Drop the global unique constraint that blocks domain reuse.
alter table public.custom_domains
  drop constraint custom_domains_domain_unique;

-- 2. Create a partial unique index covering all live (non-removed) rows.
--    This prevents two active/pending/error owners for the same domain while
--    allowing a new row to be inserted after a prior row has been removed.
create unique index custom_domains_domain_live_unique
  on public.custom_domains (domain)
  where removed_at is null;
