-- Phase B1: extend custom_domains for self-serve onboarding.
-- Adds verification attempt tracking and dns_target for routing instructions.

alter table public.custom_domains
  add column verification_attempts        integer     not null default 0,
  add column last_verification_attempt_at timestamptz null,
  add column dns_target                   text        null;
