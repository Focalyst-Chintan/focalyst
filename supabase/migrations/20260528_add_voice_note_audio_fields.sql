ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice_notes_bucket', 'voice_notes_bucket', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own voice notes'
  ) THEN
    CREATE POLICY "Users can upload own voice notes"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'voice_notes_bucket'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own voice notes'
  ) THEN
    CREATE POLICY "Users can read own voice notes"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'voice_notes_bucket'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own voice notes'
  ) THEN
    CREATE POLICY "Users can delete own voice notes"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'voice_notes_bucket'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
