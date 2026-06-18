"use client"

import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import { ExternalLink } from "lucide-react"

interface SettingsRowProps {
  label: string
  description: string
  value?: string
  placeholder?: string
  tag?: string
}

function SettingsRow({ label, description, value, placeholder, tag }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-foreground/80">{label}</p>
          {tag && (
            <span className="rounded border border-white/[0.08] px-1 py-0 text-[9px] uppercase tracking-[0.06em] text-white/25">
              {tag}
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/35">{description}</p>
      </div>
      <div className="shrink-0 sm:w-48">
        <input
          type="text"
          defaultValue={value ?? ""}
          placeholder={placeholder ?? "Not configured"}
          className="h-8 w-full rounded border border-white/[0.07] bg-white/[0.03] px-2.5 text-[12px] text-foreground/70 outline-none placeholder:text-white/18 focus:border-accent/30"
          disabled
        />
      </div>
    </div>
  )
}

interface SettingsGroupProps {
  title: string
  children: React.ReactNode
}

function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">{title}</p>
      <div className="divide-y divide-white/[0.04] overflow-hidden rounded-lg border border-white/[0.06]">
        <div className="px-4">{children}</div>
      </div>
    </div>
  )
}

export function AdminSettings() {
  return (
    <div>
      <AdminSectionHeader
        title="Platform Settings"
        description="Configuration for integrations and platform behavior."
      />

      <SettingsGroup title="Platform">
        <SettingsRow label="Platform Name" description="Public name of the platform." value="DJHQ" />
        <SettingsRow label="App URL" description="Base URL for invite links and emails." value="https://djhq.app" />
        <SettingsRow label="Support Email" description="Contact address for platform support." value="support@djhq.com" />
      </SettingsGroup>

      <SettingsGroup title="Billing — Stripe">
        <SettingsRow label="Stripe Publishable Key" description="Used for client-side billing." placeholder="pk_live_..." tag="TODO" />
        <SettingsRow label="Stripe Secret Key" description="Server-side billing operations." placeholder="sk_live_..." tag="TODO" />
        <SettingsRow label="Stripe Webhook Secret" description="Verifies webhook payloads." placeholder="whsec_..." tag="TODO" />
        <div className="py-3.5">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-accent/60"
          >
            Open Stripe Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Database — Supabase">
        <SettingsRow label="Supabase URL" description="Project API URL." placeholder="https://*.supabase.co" tag="env" />
        <SettingsRow label="Supabase Anon Key" description="Public API key for RLS access." placeholder="eyJ..." tag="env" />
        <SettingsRow label="Supabase Service Role" description="Admin key — never expose to browser." placeholder="eyJ..." tag="env" />
      </SettingsGroup>

      <SettingsGroup title="Email — Resend / Postmark">
        <SettingsRow label="Email Provider" description="Transactional email service." placeholder="resend" tag="TODO" />
        <SettingsRow label="API Key" description="API key for sending emails." placeholder="re_..." tag="TODO" />
        <SettingsRow label="From Address" description="Sending address for transactional mail." placeholder="noreply@djhq.app" tag="TODO" />
      </SettingsGroup>

      <SettingsGroup title="Analytics">
        <SettingsRow label="PostHog Key" description="Product analytics and feature flags." placeholder="phc_..." tag="TODO" />
        <SettingsRow label="Plausible Domain" description="Privacy-first web analytics." placeholder="djhq.app" tag="TODO" />
      </SettingsGroup>

      <SettingsGroup title="Storage">
        <SettingsRow label="Storage Provider" description="Asset storage backend." value="Supabase Storage" />
        <SettingsRow label="Bucket Name" description="Default bucket for media uploads." placeholder="artist-media" tag="TODO" />
      </SettingsGroup>

      <SettingsGroup title="Security">
        <SettingsRow label="Admin Access" description="Admin route protection status." value="TODO: enforce role check" tag="TODO" />
        <SettingsRow label="Rate Limiting" description="API rate limiting configuration." placeholder="Not configured" tag="TODO" />
      </SettingsGroup>

      <p className="mt-2 text-[11px] text-white/22">
        {/* TODO: make settings editable and persist via Supabase */}
        Settings are display-only in this sprint. Editing will be enabled when backend configuration is wired.
      </p>
    </div>
  )
}
