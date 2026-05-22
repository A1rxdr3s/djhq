# djhq
Digital headquarters SaaS platform for DJs and electronic music producers.

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
