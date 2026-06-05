-- Create the brand-sources storage bucket.
-- allowed_mime_types = NULL accepts every MIME type — no 415 errors for AI, EPS, PDF, ZIP, RAR.
-- file_size_limit = 52428800 = 50 MB.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('brand-sources', 'brand-sources', TRUE, NULL, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for brand-sources.
-- Upload: authenticated owner of the artist can write to artists/{artistId}/...
-- Read:   public (brand assets will be displayed on the public profile).
-- Delete: owner only.

DROP POLICY IF EXISTS "brand_sources_insert" ON storage.objects;
CREATE POLICY "brand_sources_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-sources'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'artists'
    AND (
      EXISTS (
        SELECT 1 FROM public.artists a
        WHERE a.id = ((storage.foldername(name))[2])::uuid
          AND a.owner_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "brand_sources_select" ON storage.objects;
CREATE POLICY "brand_sources_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-sources');

DROP POLICY IF EXISTS "brand_sources_delete" ON storage.objects;
CREATE POLICY "brand_sources_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-sources'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'artists'
    AND (
      EXISTS (
        SELECT 1 FROM public.artists a
        WHERE a.id = ((storage.foldername(name))[2])::uuid
          AND a.owner_user_id = auth.uid()
      )
    )
  );
