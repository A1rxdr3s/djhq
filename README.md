# DJHQ

Digital headquarters SaaS platform for DJs and electronic music producers.

> **Handoff Documentation & Current Architecture:**  
> For the authoritative repository handoff, platform decisions, and validation records, see:  
> - [`docs/handoff/PROJECT_HANDOFF.md`](./docs/handoff/PROJECT_HANDOFF.md) — Authoritative platform status, architecture, and commands.  
> - [`docs/handoff/VALIDATION_STATUS.md`](./docs/handoff/VALIDATION_STATUS.md) — Test results, skips, and verification evidence.

---

## Overview & Architecture

DJHQ operates as an umbrella platform:
- **Set2Go (`/set2go`):** The Pioneer CDJ USB export engine is the **only** service targeted for the initial public launch. Set2Go users do not require an artist profile.
- **Artist Website Service:** The general public rollout of the artist website builder is deferred. The live `ANDRES:HERRERA` website, domain routing (`proxy.ts`), and management tools (`/hq`, `/dashboard`) remain fully active and preserved.
- **Monorepo Layout:**
  - Next.js 16 App Router application at repository root.
  - Set2Go export engine at `services/set2go/` (canonical active Python source).

---

## Environment Variables

Copy `.env.local.example` to `.env.local`, then fill in the Supabase values from your Supabase project settings.

In Supabase, go to Project Settings -> API and copy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed with `NEXT_PUBLIC_` or imported into browser/client code. The current dashboard write route uses it as a temporary MVP strategy until authentication and owner-based RLS policies are implemented.

## Database Migrations

Database migrations are stored in `/supabase/migrations`.
The initial schema was applied using the Supabase SQL Editor.
Future schema changes should also be committed as SQL migration files in the same folder.
