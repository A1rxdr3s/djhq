alter table public.dj_sets
  add column performance_type        text not null default 'dj_set',
  add column performance_artists     text[] not null default '{}',
  add column custom_performance_type text,
  add column title_override          text;

alter table public.dj_sets
  add constraint dj_sets_performance_type_valid
  check (performance_type in ('dj_set', 'live_set', 'vinyl_set', 'b2b', 'b3b', 'other'));

-- Backward compat: preserve existing manual titles as title_override
-- so artists keep their old titles unless they explicitly adopt the generated format.
update public.dj_sets set title_override = title;
