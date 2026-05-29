alter table public.releases
  add column release_type text null,
  add column remixer      text null;

-- Seed release_type from the legacy type column
update public.releases
  set release_type = case lower(type)
    when 'ep'     then 'ep'
    when 'album'  then 'album'
    when 'single' then 'single'
    else null
  end;

-- Normalise version_type display strings (written by migration 022) to snake_case
update public.releases
  set version_type = case version_type
    when 'Original Mix'  then 'original_mix'
    when 'Extended Mix'  then 'extended_mix'
    when 'Radio Edit'    then 'radio_edit'
    when 'Remix'         then 'remix'
    when 'Club Mix'      then 'club_mix'
    when 'Dub Mix'       then 'dub_mix'
    when 'Instrumental'  then 'instrumental'
    when 'VIP Mix'       then 'vip_mix'
    when 'Edit'          then 'edit'
    when 'Mashup'        then 'mashup'
    when 'Bootleg'       then 'bootleg'
    when 'Rework'        then 'rework'
    when 'Acapella'      then 'acapella'
    when 'Tool'          then 'tool'
    else version_type
  end
where version_type is not null;
