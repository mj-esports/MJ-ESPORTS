-- =========================================================
-- MJ ESPORTS Production Supabase Avatars Storage Setup & RLS
-- =========================================================

-- 1. Create Public 'avatars' Storage Bucket if not exists
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

-- 2. Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Policies for 'avatars' Bucket

-- 3.1 Public Read Policy (Anyone can view avatar photos)
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 3.2 Authenticated User Upload Policy (Users upload to own folder or bucket)
DROP POLICY IF EXISTS "Authenticated Users Upload Avatar" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- 3.3 Authenticated User Update Policy (Users update own avatar)
DROP POLICY IF EXISTS "Authenticated Users Update Avatar" ON storage.objects;
CREATE POLICY "Authenticated Users Update Avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- 3.4 Authenticated User Delete Policy (Users delete own avatar)
DROP POLICY IF EXISTS "Authenticated Users Delete Avatar" ON storage.objects;
CREATE POLICY "Authenticated Users Delete Avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );
