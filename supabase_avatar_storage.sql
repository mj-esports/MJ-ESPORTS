-- =========================================================
-- MJ ESPORTS Supabase Avatars Storage Setup & Hardened RLS
-- =========================================================

-- 1. Create or configure Public 'avatars' Storage Bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB Limit in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Note: storage.objects is owned and managed by Supabase with RLS enabled by default.
-- Attempting to modify RLS or ownership on storage.objects directly results in PostgreSQL error 42501 (must be owner of table objects).

-- 2. Storage Policies for 'avatars' Bucket

-- 2.0 Drop existing avatar policies for clean, idempotent re-execution
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Avatar Read Policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Avatar" ON storage.objects;

-- 2.1 Public Read Policy (Anyone can view avatar photos)
CREATE POLICY "Public Read Avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- 2.2 Authenticated User Upload Policy (Restricted to user's own folder matching auth.uid() or Admin)
CREATE POLICY "Authenticated Users Upload Avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = owner
      OR public.is_admin()
    )
  );

-- 2.3 Authenticated User Update Policy (Restricted to owner or Admin, with both USING and WITH CHECK)
CREATE POLICY "Authenticated Users Update Avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = owner
      OR public.is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = owner
      OR public.is_admin()
    )
  );

-- 2.4 Authenticated User Delete Policy (Restricted to owner or Admin)
CREATE POLICY "Authenticated Users Delete Avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid() = owner
      OR public.is_admin()
    )
  );
