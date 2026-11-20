# Targeted Source File Map for Claude Code

To minimize token usage and avoid redundant repository exploration, consult only the files listed below for Set2Go cloud staging, authentication, and routing tasks.

---

## 1. Product Hub & Routing

| File Path | Description / Responsibility |
|---|---|
| `app/hq/page.tsx` | Authenticated Product Hub entry point; evaluates user entitlements and renders product cards. |
| `app/hq/product-hub.module.css` | Styles for the Product Hub, grid layouts, and card stacking. |
| `app/hq/website/page.tsx` | Route wrapper hosting the existing Artist Website Manager with return links to `/hq`. |
| `app/dashboard/page.tsx` | Legacy dashboard handler issuing 308 redirects to `/hq/website`. |
| `app/dashboard/dashboard-client.tsx` | Existing Artist Website Editor client component (do not modify unrelated logic). |
| `app/set2go/page.tsx` | Set2Go client UI, workspace, track staging, and upload interface. |
| `proxy.ts` | Edge middleware handling custom artist domains and reserved application routes (`/hq`, `/set2go`, etc.). |
| `app/auth/callback/route.ts` | Supabase OAuth callback route with internal path sanitization. |

---

## 2. Product Access & Entitlements

| File Path | Description / Responsibility |
|---|---|
| `lib/products/` | Product entitlement evaluation, user permission checks, and server-side authorization helpers. |
| `lib/products/access.ts` (or equivalent in `lib/products/`) | Derives Website access (ownership/admin email) and Set2Go access (development UUID match). |

---

## 3. Set2Go Cloud Staging & Upload Infrastructure

| File Path | Description / Responsibility |
|---|---|
| `app/api/set2go/` | Next.js API route handlers for Set2Go: upload session initiation, part signing, completion, and job tracking. |
| `lib/set2go/` | Client- and server-side utilities for Set2Go cloud staging. |
| `lib/set2go/r2-client.ts` (or R2 wrapper) | S3/R2 client instantiation, presigned URL generation, and multipart lifecycle operations. |
| `lib/set2go/upload-session.ts` | State machine and database adapter managing upload sessions and track records. |
| `supabase/migrations/082_set2go_upload_sessions.sql` | **Reference Only (DO NOT MODIFY).** Database schema for upload sessions, track parts, RLS policies, and RPC stored procedures. |

---

## 4. Configuration & Environment

| File Path | Description / Responsibility |
|---|---|
| `.env.local` | Local development variables (`SET2GO_DEV_CLOUD_USER_ID`, R2 credentials, Supabase keys). |
| `docs/set2go/r2-development-cors.json` | Approved development CORS configuration for R2 bucket (`http://127.0.0.1:3000`). |

---

## 5. Authoritative Documentation (Read-Only)

| File Path | Purpose |
|---|---|
| `docs/handoff/CODEX_SESSION_TRANSFER.md` | Authoritative record of completed work from previous Codex development session. |
| `docs/handoff/CLAUDE_HANDOFF.md` | Primary engineering handoff and architecture baseline. |
| `docs/handoff/CLAUDE_OPERATING_RULES.md` | Strict operating boundaries and token budget constraints. |
| `docs/handoff/CLAUDE_START_PROMPT.md` | Exact next task execution prompt. |
| `docs/handoff/DJHQ_MULTIPRODUCT_HQ_ARCHITECTURE.md` | Long-term architectural vision for multi-product DJHQ hub. |
