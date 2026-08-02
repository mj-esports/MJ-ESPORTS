import { supabase, isSupabaseConfigured, AVATAR_BUCKET } from '../lib/supabase'

/**
 * MJ ESPORTS Reusable Avatar Upload & Management Service
 */

/**
 * Detects whether the required Supabase Storage bucket ('avatars') exists.
 */
export async function checkAvatarBucketExists(bucketName = AVATAR_BUCKET) {
  if (!isSupabaseConfigured) return false

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (!error && Array.isArray(buckets)) {
      return buckets.some((b) => b.name === bucketName || b.id === bucketName)
    }
  } catch (err) {
    console.warn('[Avatar Service] Storage bucket list check warning:', err)
  }

  // Fallback probe test if listBuckets permissions are restricted
  try {
    const { error: probeError } = await supabase.storage.from(bucketName).list('', { limit: 1 })
    if (!probeError || !probeError.message?.toLowerCase().includes('bucket not found')) {
      return true
    }
  } catch (probeErr) {
    console.warn('[Avatar Service] Bucket probe exception:', probeErr)
  }

  return false
}

/**
 * Uploads a cropped avatar file to Supabase Storage.
 * Verifies bucket existence before attempting upload and provides clear setup guidance.
 */
export async function uploadAvatarFile(croppedFile, userId, fallbackDataUrl = '') {
  if (!croppedFile) {
    throw new Error('No image file selected for upload.')
  }
  if (!userId) {
    throw new Error('User authentication session required for avatar upload.')
  }
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured in environment variables.')
  }

  const bucketName = AVATAR_BUCKET
  const fileExt = (croppedFile.name.split('.').pop() || 'jpg').toLowerCase()
  const fileName = `avatar-${Date.now()}.${fileExt}`
  const uploadPath = `${userId}/${fileName}`

  // 1. Verify Bucket Existence Before Uploading
  const bucketExists = await checkAvatarBucketExists(bucketName)

  if (!bucketExists) {
    console.warn(`[Avatar Service Alert]: Storage bucket '${bucketName}' not detected in Supabase project.`)
    
    // If fallback preview payload is available, save profile photo seamlessly and warn
    if (fallbackDataUrl) {
      console.log('[Avatar Service] Using fallback Data URL for profile avatar rendering.')
      await saveProfileAvatarUrl(userId, fallbackDataUrl)
      return {
        publicUrl: fallbackDataUrl,
        bucketName,
        uploadPath,
        isFallback: true,
        warning: `Storage bucket '${bucketName}' does not exist. Created manually in Supabase Dashboard → Storage → New Bucket.`,
      }
    }

    throw new Error(`Storage bucket '${bucketName}' does not exist. Create it manually in Supabase Dashboard → Storage → New Bucket.`)
  }

  // 2. Upload File to Storage
  const uploadResult = await supabase.storage
    .from(bucketName)
    .upload(uploadPath, croppedFile, {
      upsert: true,
      contentType: croppedFile.type || 'image/jpeg',
    })

  const { error: uploadError } = uploadResult

  if (uploadError) {
    console.error('UPLOAD ERROR', uploadError)
    console.error('BUCKET', bucketName)
    console.error('PATH', uploadPath)
    console.error('USER', userId)

    let humanMsg = uploadError.message || 'Avatar upload failed'
    const errMsgLower = humanMsg.toLowerCase()
    const statusCode = String(uploadError.statusCode || uploadError.error || '')

    if (errMsgLower.includes('bucket not found') || statusCode === '404') {
      humanMsg = `Storage bucket '${bucketName}' does not exist. Create it manually in Supabase Dashboard → Storage → New Bucket.`
    } else if (errMsgLower.includes('row-level security') || errMsgLower.includes('policy') || statusCode === '42501') {
      humanMsg = `Storage policy blocked upload: RLS permissions missing for '${bucketName}' bucket.`
    } else if (errMsgLower.includes('size') || errMsgLower.includes('large')) {
      humanMsg = 'File size exceeds allowed limit (5 MB).'
    }

    throw new Error(humanMsg)
  }

  // 3. Obtain Public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(uploadPath)

  if (!publicUrlData?.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded avatar.')
  }

  const rawPublicUrl = publicUrlData.publicUrl
  const avatarUrlWithCacheBust = `${rawPublicUrl}?t=${Date.now()}`

  // 4. Save Avatar URL to DB and Auth Metadata
  await saveProfileAvatarUrl(userId, avatarUrlWithCacheBust)

  return {
    publicUrl: avatarUrlWithCacheBust,
    bucketName,
    uploadPath,
    isFallback: false,
  }
}

/**
 * Saves the avatar URL to both the `profiles` database table and Auth metadata.
 */
async function saveProfileAvatarUrl(userId, avatarUrl) {
  // 1. Always Update Auth User Metadata first so profile photo renders immediately
  const authResult = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  })

  if (authResult.error) {
    console.warn('[Avatar Service Auth Metadata Warning]:', authResult.error)
  }

  // 2. Safely attempt to upsert Database `profiles` table
  try {
    const dbResult = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (dbResult.error) {
      const errMsg = dbResult.error.message || ''
      const errCode = dbResult.error.code || ''
      if (errCode === 'PGRST205' || errMsg.includes('public.profiles')) {
        console.warn('[Avatar Service DB Notice]: Table public.profiles does not exist in schema cache. Avatar saved to Auth user metadata successfully.')
      } else {
        console.warn('[Avatar Service DB Warning]: Profile DB upsert notice:', dbResult.error)
      }
    }
  } catch (dbErr) {
    console.warn('[Avatar Service DB Exception]:', dbErr)
  }
}
