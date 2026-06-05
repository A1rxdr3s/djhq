-- Add variant and source_page to brand_assets for enriched candidate metadata
alter table public.brand_assets
  add column if not exists variant      text not null default 'original',
  add column if not exists source_page  integer null;

-- Update schema comment
comment on column public.brand_assets.variant is
  'Color variant: black, white, gold, silver, original';
comment on column public.brand_assets.source_page is
  'PDF page number this asset was extracted from (1-indexed)';
