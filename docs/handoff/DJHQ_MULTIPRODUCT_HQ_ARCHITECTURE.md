# DJHQ multi-product HQ architecture

**Status:** Approved product direction and proposed evolution, not implemented.  
**Date:** 2026-11-01. Current-state statements below are source inspection, not live-environment verification. Read with [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md); its engine and validation history remains intact.

## Decisions and route responsibilities

One DJHQ identity spans independent products; an artist profile is optional. `/admin` is the sole platform-administration area. Product access does not confer administrator or artist-editor rights. Direct authorized product URLs remain supported.

| Route | Verified current behavior | Approved future responsibility |
| --- | --- | --- |
| `/` | Public platform homepage | Public homepage |
| `/about` | Public bilingual editorial page | Same |
| `/login` | Bilingual preview; authentication controls disabled | Shared passwordless entry point |
| `/account` | Server `getUser()`; unauthenticated redirects to `/login`; authenticated identity shell with neutral product state | Identity and account settings, no artist requirement |
| `/hq` | Authenticated artist management or artist onboarding | Personal app launcher, only after safe artist-workspace transition |
| `/admin` | Email-allowlist-gated platform dashboard | Canonical restricted platform administration |
| `/set2go` | Independent page; local-only job endpoints | Stable independent authorized application URL |
| `/dashboard` | Permanent redirect to `/hq`, including subpaths | Compatibility behavior to be decided and tested during migration |

Sources: `app/hq/page.tsx`, `app/dashboard/page.tsx`, `next.config.mjs`, `app/account/page.tsx`, `app/login/page.tsx`, `app/admin/page.tsx`, `app/set2go/page.tsx`. Existing `/sign-in` and `/auth/callback` remain artist-oriented: callback defaults to `/hq`. No general login flow is active in `/login`.

## Current implementation and boundaries

- Supabase SSR clients exist in `lib/supabase/`; `/hq` checks `auth.getUser()`, queries `artists.owner_user_id`, and renders artist onboarding when no owned artist exists. Artist site editing and its related content, booking and domain workflows currently live in the dashboard client and artist APIs; preserve them as a coherent protected artist-workspace module. Ownership and sessions must survive extraction.
- `/admin` verifies the session and an email allowlist (`lib/admin/admin-auth.ts`) before fetching data. `app/admin/page.tsx` lists Auth users (first 1,000 requested), artists and other data; `app/actions/admin-invitations.ts` implements artist/admin invitation creation and revocation. The existing `/invite/[token]` acceptance is disabled. Existing invitations store tokens and URLs and do not implement secure product redemption. Product registry, product grants and general permission administration are not established by the inspected schema or admin paths; do not represent dashboard UI as proof of those capabilities.
- `proxy.ts` passes owned hosts and rewrites artist custom domains to artist routes; API paths and `/sign-in` and `/auth/` are excluded from its matcher. `/login`, `/account`, `/hq` and `/admin` are not listed as reserved custom-domain paths. Future routing changes must explicitly test custom domains, platform hosts, icon behavior and existing rewrites; no change is authorized now.
- Set2Go job endpoints call `localRequest`, which allows only development loopback; `lib/set2go/jobs.ts` uses a process-local map, temporary files and no user ownership. This is a local vertical slice, not a production multi-user authorization or durable processing system. Do not remove the gate until replacements are verified.
- EN/ES uses `lib/i18n/messages.ts`, `lib/i18n/locale.ts` and the `djhq_locale` preference cookie; reuse them. Existing homepage and About are public.

## Future identity, products and authorization

Authentication verifies a user; product authorization checks an active grant for that user and product; resource ownership checks the owner on each job and artifact; platform administration requires a separate verified admin permission; artist management checks the artist-specific permission. None implies another. Server/API and storage checks are authoritative; cards and redirects are not security boundaries.

Proposed data model, subject to later schema design: a product registry with stable key, route, lifecycle (`planned`, `available`, `retired`) and localized display metadata; user-product grants with status, source, expiry and unique user/product association; optional per-user workspace preferences separate from grants; product-owned data such as Set2Go jobs linked to their owner. The launcher queries actual available products and active grants, not identities or hardcoded founder exceptions. Planned Artist Websites is not an active application link. Notifications and recent activity appear only when supported by real data.

Registration is invitation-only at launch; Google and six-digit email OTP are planned, with no passwords. Invitation redemption must securely and atomically grant Set2Go access, using high-entropy hash-only tokens, expiry, revocation and single redemption. **Provider-level rejection of uninvited account creation is unproven for both Google and OTP**: UI restrictions, product grants or client metadata are insufficient. Existing Supabase artist sign-in must remain operational. Establish a safe verified-identity binding and test direct provider requests in an isolated environment before launch.

## Destination policy (future)

| Situation | Destination and behavior |
| --- | --- |
| Newly redeemed Set2Go invitation | `/set2go` after successful verified authentication and atomic grant; no grant on opening a link |
| Existing authorized Set2Go user | Return to `/set2go` when requested or selected |
| Protected product initiates login | Preserve a validated internal route, then recheck product grant and ownership after sign-in |
| Public header login | `/account` as proposed neutral default, unless a valid authorized internal return target exists |
| Founder / artist-management entry | Preserve existing `/hq` and `/sign-in` behavior during launch; later use the protected artist workspace and compatibility plan |
| Multi-product user | Requested authorized product directly; future `/hq` launcher offers granted available apps |
| No product grant | Access-denied or invitation state; never grant from navigation |
| Expired session | Reauthenticate and reauthorize; preserve safe internal context and resume only if still permitted |

Return destinations require server-side allowlisting of relative internal paths, rejection of external and protocol-relative URLs, and authorization after authentication. The current callback's `next` handling must not be assumed to satisfy this policy.

## HQ evolution and UI

HQ should eventually use Dark Studio Grade, the existing wordmark and typography, real product icons and wordmarks, responsive accessible cards, EN/ES messages and clear unavailable states. Only available products with valid grants become active links. Account entry is separate; administrative actions remain at `/admin`. No fictional products, statistics or notifications.

1. Capture artist-management baseline tests for authenticated owner, no-profile onboarding, content saving, domain routing, sessions, `/dashboard` redirects and links. Keep `/hq` unchanged.
2. Define a protected artist-workspace module and candidate stable route; extract existing functionality behind a feature flag or equivalent without changing ownership or API contracts. Test it in isolation with existing user accounts.
3. Plan compatibility for existing `/hq` bookmarks, `?section=` state, `/dashboard` 308 and subpaths, artist links, external deep links, callbacks and rollback. A simple unconditional redirect risks losing existing behavior; no route moves before this is resolved.
4. Build and test registry/grants and authorized direct `/set2go` access independently. Only then pilot the launcher for eligible users with a verified route to their artist workspace; preserve existing behavior for others during gradual rollout.
5. Cut over with monitoring and reversible feature controls only after owner approval and compatibility tests. Keep `/admin` separate and preserve `/set2go` unchanged as a URL.

## Phased roadmap and acceptance gates

| Phase | Acceptance criteria |
| --- | --- |
| 1. Identity proof | Isolated provider tests reject uninvited Google and email creations, including direct APIs; existing artist users still sign in; no public registration leak. |
| 2. Invitations and grants | Bound/unbound invitations, expiry, revocation, replay and concurrent redemption tested; one claim and one grant; no grant from opening a URL. |
| 3. Set2Go protection | Every job create, status, export and download verifies identity, grant and ownership; private durable storage, worker isolation, quotas and cleanup tested; engine contracts unchanged. |
| 4. Account and admin | `/account` requires no artist; `/admin` alone manages authorized invitation/grant operations with server-side permissions and audit; existing artist admin flows pass regression tests. |
| 5. Artist workspace compatibility | Baseline, deep-link, ownership, routing and session tests pass; old routes and rollback behavior explicitly validated. |
| 6. HQ launcher rollout | Only granted available apps link; direct product routes work; EN/ES, keyboard, mobile, denied-access and multi-product cases pass; staged rollout does not affect artist management. |
| 7. Release | End-to-end security, provider, expiry, recovery, abuse, storage cleanup and operational monitoring checks pass in a production-like isolated environment. |

## Open decisions and dependencies

- Prove provider-level invitation enforcement and safe Google/email identity binding; otherwise choose a suitable identity architecture without weakening invite-only registration.
- Owner approval needed for the eventual artist-workspace route, `/dashboard` and old `/hq` compatibility, and final public-header post-login default.
- Decide invitation and grant expiry, recovery, administrator roles, product availability policy, account deletion and data retention, and worker/storage hosting and quotas.
- Current admin email allowlisting and provider configuration require a security review before expanding privileged capabilities. Hosting, live Supabase settings and deployed behavior were not inspected.
