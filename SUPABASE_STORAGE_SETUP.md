# MJ ESPORTS — Supabase Storage Setup Guide

Follow these steps to manually create the **`avatars`** storage bucket in your Supabase Dashboard.

---

## Manual Bucket Creation Steps

1. Log into your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your active project.
3. In the left navigation sidebar, click on **Storage** (`Storage` → `Buckets`).
4. Click the **New Bucket** button.
5. Configure the bucket properties:
   - **Bucket Name**: `avatars`
   - **Public Bucket**: Toggle **ON** (Public)
   - **File Size Limit**: `5 MB` (or `5242880` bytes)
   - **Allowed MIME Types**: `image/jpeg, image/jpg, image/png, image/webp`
6. Click **Save** to create the bucket.

---

## Storage RLS Policies (Optional / Recommended)

If Row Level Security (RLS) is enabled on your `storage.objects` table, add the following RLS policies under **Storage** → **Policies**:

```sql
-- Public Read Access
CREATE POLICY "Public Read Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated Upload Access
CREATE POLICY "Authenticated Users Upload Avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```
