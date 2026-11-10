// src/services/storageService.js
// MJ ESPORTS Unified Storage Abstraction Service (Phase 4)
//
// ARCHITECTURAL DESIGN:
// Provides a decoupled, provider-agnostic storage abstraction layer.
// - Category A & B (Private Evidence & User Files): Routed to Supabase Storage
//   to enforce PostgreSQL Row Level Security (RLS) and short-lived signed URLs.
// - Category C (Public / High-Volume Media): Prepared for Cloudflare R2
//   via public CDN delivery when configured.
//
// SECURITY GUARANTEE:
// Never exposes R2 Access Keys or Cloudflare API tokens to the client.
// All private operations leverage Supabase Auth session tokens or server-signed URLs.

import { supabase, isSupabaseConfigured, AVATAR_BUCKET, PROFILE_PROOFS_BUCKET } from '../lib/supabase.js'

export const STORAGE_PROVIDERS = {
  SUPABASE: 'supabase',
  R2: 'r2',
}

export const KNOWN_BUCKETS = {
  AVATARS: AVATAR_BUCKET || 'avatars',
  PROFILE_PROOFS: PROFILE_PROOFS_BUCKET || 'profile-proofs',
}

// Maximum allowed sizes per category
export const STORAGE_LIMITS = {
  AVATAR_MAX_BYTES: 5 * 1024 * 1024, // 5 MB
  PROOF_MAX_BYTES: 5 * 1024 * 1024,  // 5 MB
  MEDIA_MAX_BYTES: 10 * 1024 * 1024, // 10 MB
}

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Validates file MIME type and file size before network transmission.
 */
export function validateStorageFile(file, { maxBytes = 5 * 1024 * 1024, allowedMimes = ALLOWED_IMAGE_MIMES } = {}) {
  if (!file) {
    throw new Error('No file provided for upload.')
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of ${maxMb} MB.`)
  }

  const mime = file.type || ''
  if (allowedMimes.length > 0 && mime && !allowedMimes.includes(mime.toLowerCase())) {
    throw new Error(`Unsupported file format '${mime}'. Allowed formats: ${allowedMimes.join(', ')}.`)
  }

  return true
}

/**
 * Uploads a file using the appropriate storage provider.
 * Default provider for avatars and identity proofs is Supabase Storage (RLS enforced).
 * 
 * @param {object} params
 * @param {string} params.bucket - Bucket name ('avatars', 'profile-proofs', etc.)
 * @param {string} params.path - Destination object path (e.g. `${userId}/proof-${Date.now()}.png`)
 * @param {File|Blob} params.file - File object
 * @param {boolean} [params.isPublic=false] - Whether the object is publicly accessible
 * @param {object} [params.options] - Custom options (e.g. upsert, contentType)
 * @returns {Promise<{ success: boolean, path: string, publicUrl?: string, provider: string }>}
 */
export async function uploadObject({
  bucket,
  path,
  file,
  isPublic = false,
  options = {},
}) {
  if (!bucket || !path) {
    throw new Error('Bucket and path parameters are required for storage upload.')
  }

  validateStorageFile(file, {
    maxBytes: bucket === KNOWN_BUCKETS.AVATARS ? STORAGE_LIMITS.AVATAR_MAX_BYTES : STORAGE_LIMITS.PROOF_MAX_BYTES,
  })

  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured in environment variables.')
  }

  // Active Production Provider: Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: options.upsert !== false,
      contentType: file.type || 'image/jpeg',
      ...options,
    })

  if (error) {
    console.error(`[StorageService Error] Upload failed on bucket '${bucket}':`, error)
    throw new Error(error.message || 'File upload failed.')
  }

  let publicUrl = null
  if (isPublic) {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    publicUrl = urlData?.publicUrl || null
  }

  return {
    success: true,
    path: data?.path || path,
    publicUrl,
    provider: STORAGE_PROVIDERS.SUPABASE,
  }
}

/**
 * Generates an authorized URL for reading an object.
 * For private objects, generates a short-lived signed URL.
 * For public objects, returns the public CDN URL.
 * 
 * @param {object} params
 * @param {string} params.bucket - Target bucket
 * @param {string} params.path - Object storage path
 * @param {boolean} [params.isPublic=false] - True for public buckets (e.g. avatars)
 * @param {number} [params.expiresIn=3600] - Expiry in seconds for private signed URLs
 * @returns {Promise<string>}
 */
export async function getObjectUrl({
  bucket,
  path,
  isPublic = false,
  expiresIn = 3600,
}) {
  if (!bucket || !path) return ''

  if (!isSupabaseConfigured) {
    return ''
  }

  if (isPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || ''
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) {
    console.warn(`[StorageService Warning] Failed to generate signed URL for '${path}':`, error.message)
    return ''
  }

  return data?.signedUrl || ''
}

/**
 * Removes one or more objects from storage.
 * 
 * @param {string} bucket - Bucket name
 * @param {string[]} paths - Array of object paths to remove
 * @returns {Promise<{ success: boolean }>}
 */
export async function removeObjects(bucket, paths) {
  if (!bucket || !paths || paths.length === 0) {
    return { success: false }
  }

  if (!isSupabaseConfigured) {
    return { success: true }
  }

  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) {
    console.error(`[StorageService Error] Failed to delete objects from '${bucket}':`, error)
    throw new Error(error.message || 'Failed to remove object from storage.')
  }

  return { success: true }
}
