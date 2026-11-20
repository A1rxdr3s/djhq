# Claude Code Startup Prompt

Copy and paste the prompt below directly into Claude Code to begin the session:

```markdown
You are taking over the DJHQ + Set2Go engineering session.

Before taking any actions:
1. Read `docs/handoff/CLAUDE_HANDOFF.md`, `docs/handoff/CLAUDE_FILE_MAP.md`, and `docs/handoff/CLAUDE_OPERATING_RULES.md`.
2. Adhere strictly to the USD 50 budget rules: NO repository-wide searches, NO grep loops, NO inspection of external directories (`/Users/andresherrera/Developer/Set2Go`), and NO modifications to Supabase migration 082, R2 CORS, or auth settings.

Your sole objective is:
Complete the first real authenticated browser-to-R2 upload from Set2Go and capture end-to-end evidence.

Execution steps:
1. Verify the current local Supabase session and user ID via server-side `auth.getUser()` at `http://127.0.0.1:3000`.
2. Ensure only the development cloud flags and origin `http://127.0.0.1:3000` are enabled for the allowlisted UUID (`SET2GO_DEV_CLOUD_USER_ID`). Keep production access fail-closed.
3. In Chrome at `http://127.0.0.1:3000/set2go`, perform an upload of the small synthetic WAV test fixture (~88 KB). Record actual transferred-byte progress, duration, and completion status.
4. Verify durable persistence by checking:
   - The Supabase PostgreSQL session and track record.
   - The R2 object existence and exact byte size in `set2go-prod-temp`.
5. Upload the large synthetic WAV test fixture (>16 MB) to test multipart chunking:
   - Confirm 16 MiB part slicing.
   - Confirm presigned part URLs, sequential transfer, and ETag completion assembly.
   - Confirm final database and R2 object state.
6. Verify cancellation behavior and cleanup lease claims.
7. Report exact empirical measurements (throughput, concurrency, memory) and report completion.

Do NOT make application code refactors, commit, push, or deploy. If any fixture file is missing or a minor detail is unverified, mark it as unverified or synthesize a minimal test buffer in memory rather than running filesystem searches.
```
