# Operating Rules & Cost Controls for Claude Code

These rules are designed to protect a strict **USD 50 token budget** and avoid unnecessary exploration or breaking existing infrastructure.

---

## 1. Zero-Exploration Policy

- **Do Not Run Broad Searches:** Never execute repository-wide `grep`, `ripgrep`, or open-ended `find` commands. Use only the targeted files listed in `docs/handoff/CLAUDE_FILE_MAP.md`.
- **Do Not Search for Test Fixtures:** Synthetic WAV fixtures (~88 KB and ~18 MB) are documented. If physical files are not in expected mock directories, mark them as unverified or create minimal synthetic fixtures in place rather than searching external drives or deep subtrees.
- **Do Not Inspect External Directories:** Never explore, inspect, or modify external directories such as `/Users/andresherrera/Developer/Set2Go` or `/Users/andresherrera/Developer/RekordSOS`.
- **Mark Unverified Rather than Searching:** If a minor historical detail or parameter cannot be immediately located, document it explicitly as `Unverified` instead of spending tool calls and context investigating it.

---

## 2. Infrastructure & Database Safeguards

- **No Schema Modifications:** Supabase Migration `082_set2go_upload_sessions.sql` is already applied and validated in hosted Supabase (checksum: `9a07300016f3ea5fc17d0bb68c48af4e788f402e24c246a555059e4ea83cb071`). Do not re-run, alter, or edit migration files.
- **No Supabase Auth Changes:** Do not alter Supabase Auth settings, redirect URLs, or Site URL settings. Google OAuth local callback is already verified.
- **No R2 Configuration Changes:** Do not alter the R2 bucket (`set2go-prod-temp`), do not make it public, and do not modify its CORS configuration. Use the verified `http://127.0.0.1:3000` origin.
- **Fail-Closed Security:** Keep production cloud flags off. Only enable development flags for `SET2GO_DEV_CLOUD_USER_ID` at `http://127.0.0.1:3000`.

---

## 3. Scope & Code Integrity

- **Preserve Unrelated Routes:** Do not touch or refactor `/admin`, `/dashboard`, or existing Artist Website logic in `/hq/website`. The pre-existing ESLint warnings in the website editor must remain untouched.
- **No Engine Rewrites:** The local Python engine (`services/set2go`) is working under documented constraints; its Python 3.15 `aubio` issue is known and must not be debugged during cloud upload validation.
- **No Deployments or Remote Git Actions:** Do not run `git commit`, `git push`, or Vercel deployments. All work is strictly local validation.
- **No Autonomous Subagent Swarms:** Do not spawn background subagents or broad automated audit scripts.

---

## 4. Verification Protocol

- **Empirical Evidence Required:** Differentiate between unit test passes and live end-to-end browser execution. Code that passes tests is considered *unverified in production* until demonstrated in Chrome with matching PostgreSQL and R2 records.
- **Single Targeted Checks:** Use single, direct commands (e.g. `ls -la <path>` or targeted test runners) rather than chaining discovery loops.
