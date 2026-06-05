// ONE-TIME endpoint — verifies whether footer columns exist and provides the SQL if not.
// DELETE this file after the migration has been applied.
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const SECRET = process.env.MIGRATION_SECRET ?? "djhq-footer-migrate-2026"

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  // Probe: try to select a footer column
  const { error: probe } = await supabase
    .from("artists")
    .select("footer_logo_url")
    .limit(1)

  if (!probe) {
    return NextResponse.json({
      ok: true,
      message: "Footer columns already exist. No migration needed.",
    })
  }

  const code = (probe as { code?: string }).code

  if (code === "42703") {
    // Column does not exist — return the SQL for manual application
    return NextResponse.json({
      ok: false,
      code: "42703",
      message: "Footer columns are missing. Apply the SQL below in the Supabase SQL Editor.",
      sql_editor_url: "https://app.supabase.com/project/sucumqowzrseehikqnev/sql/new",
      sql: [
        "alter table public.artists",
        "  add column if not exists footer_logo_url          text,",
        "  add column if not exists footer_logo_width         integer not null default 220,",
        "  add column if not exists footer_booking_email      text,",
        "  add column if not exists footer_newsletter_enabled boolean not null default true,",
        "  add column if not exists footer_socials_enabled    boolean not null default true,",
        "  add column if not exists footer_copyright          text,",
        "  add column if not exists footer_contact_email      text,",
        "  add column if not exists footer_demos_email        text;",
      ].join("\n"),
    })
  }

  return NextResponse.json({ ok: false, error: probe.message, code }, { status: 500 })
}
