alter table public.artists
  add column if not exists press_kit_root_url          text,
  add column if not exists press_kit_bio_folder_url    text,
  add column if not exists press_kit_logos_folder_url  text,
  add column if not exists press_kit_media_folder_url  text,
  add column if not exists press_kit_rider_folder_url  text,
  add column if not exists press_kit_pdf_en_url        text,
  add column if not exists press_kit_pdf_es_url        text,
  add column if not exists press_kit_pdf_en_size       text,
  add column if not exists press_kit_pdf_es_size       text,
  add column if not exists press_kit_use_gallery_photos boolean not null default true;
