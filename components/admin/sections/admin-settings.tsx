"use client"

import { ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { AdminSectionHeader } from "@/components/admin/admin-section-header"
import type { AdminRealData } from "@/types/admin"

interface EnvStatusProps {
  label: string
  description: string
  isSet: boolean
  tag?: string
}

function EnvStatus({ label, description, isSet, tag }: EnvStatusProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-slate-800">{label}</p>
          {tag && (
            <span className="rounded border border-slate-200 px-1 py-0 text-[9px] uppercase tracking-[0.06em] text-slate-400">
              {tag}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isSet ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-600">Set</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-[11px] text-slate-400">Not configured</span>
          </>
        )}
      </div>
    </div>
  )
}

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
          <p className="text-[12px] font-medium text-slate-800">{label}</p>
          {tag && (
            <span className="rounded border border-slate-200 px-1 py-0 text-[9px] uppercase tracking-[0.06em] text-slate-400">
              {tag}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">{description}</p>
      </div>
      <div className="shrink-0 sm:w-52">
        <input
          type="text"
          defaultValue={value ?? ""}
          placeholder={placeholder ?? "Not configured"}
          className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-600 outline-none placeholder:text-slate-300"
          disabled
          readOnly
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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="px-4">{children}</div>
      </div>
    </div>
  )
}

interface AdminSettingsProps {
  realData: AdminRealData
}

export function AdminSettings({ realData }: AdminSettingsProps) {
  // Infer env status from whether we got real data
  const supabaseConnected = !realData.dataError && (realData.artists.length > 0 || realData.authUsers.length > 0)
  const serviceRoleAvailable = !realData.dataError && realData.authUsers.length > 0

  return (
    <div>
      <AdminSectionHeader
        title="Platform Settings"
        description="Configuration for integrations and platform behavior."
      />

      <SettingsGroup title="Platform">
        <SettingsRow label="Platform Name"   description="Public name of the platform."         value="DJHQ" />
        <SettingsRow label="App URL"          description="Base URL for invite links and emails." value="https://djhq.app" />
        <SettingsRow label="Support Email"    description="Contact address for platform support." value="support@djhq.app" />
      </SettingsGroup>

      <SettingsGroup title="Database — Supabase (env status)">
        <EnvStatus
          label="NEXT_PUBLIC_SUPABASE_URL"
          description="Project API URL. Set via NEXT_PUBLIC_SUPABASE_URL."
          isSet={supabaseConnected}
          tag="env"
        />
        <EnvStatus
          label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
          description="Public API key for RLS access."
          isSet={supabaseConnected}
          tag="env"
        />
        <EnvStatus
          label="SUPABASE_SERVICE_ROLE_KEY"
          description="Admin key — used for admin data fetches. Never exposed to browser."
          isSet={serviceRoleAvailable}
          tag="env"
        />
      </SettingsGroup>

      <SettingsGroup title="Billing — Stripe">
        <EnvStatus
          label="STRIPE_PUBLISHABLE_KEY"
          description="Used for client-side billing."
          isSet={false}
          tag="TODO"
        />
        <EnvStatus
          label="STRIPE_SECRET_KEY"
          description="Server-side billing operations."
          isSet={false}
          tag="TODO"
        />
        <EnvStatus
          label="STRIPE_WEBHOOK_SECRET"
          description="Verifies webhook payloads."
          isSet={false}
          tag="TODO"
        />
        <div className="py-3.5">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-green-700"
          >
            Open Stripe Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Email — Resend / Postmark">
        <EnvStatus label="EMAIL_API_KEY"     description="API key for transactional email service." isSet={false} tag="TODO" />
        <EnvStatus label="EMAIL_FROM"        description="Sending address for outbound mail."         isSet={false} tag="TODO" />
      </SettingsGroup>

      <SettingsGroup title="Analytics">
        <EnvStatus label="NEXT_PUBLIC_POSTHOG_KEY" description="Product analytics and feature flags." isSet={false} tag="TODO" />
        <EnvStatus label="PLAUSIBLE_DOMAIN"         description="Privacy-first web analytics domain."  isSet={false} tag="TODO" />
      </SettingsGroup>

      <SettingsGroup title="Storage">
        <SettingsRow label="Storage Provider" description="Asset storage backend."               value="Supabase Storage" />
        <SettingsRow label="Bucket Name"      description="Default bucket for media uploads."    placeholder="artist-media" tag="TODO" />
      </SettingsGroup>

      <SettingsGroup title="Security">
        <EnvStatus
          label="Admin Route Protection"
          description="Auth check on /admin — currently unprotected."
          isSet={false}
          tag="TODO"
        />
        <EnvStatus
          label="Rate Limiting"
          description="API rate limiting on public routes."
          isSet={false}
          tag="TODO"
        />
      </SettingsGroup>

      <p className="mt-2 text-[11px] text-slate-400">
        Settings are display-only in this sprint. Editing will be enabled when backend configuration is wired.
      </p>
    </div>
  )
}
