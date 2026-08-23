/**
 * MJ ESPORTS — Player Identity Evidence & Profile Proof Service
 * 
 * Handles secure upload of original in-game Free Fire profile screenshots to private
 * storage, records immutable evidence metadata, generates short-lived signed URLs for
 * authorized viewing, and manages administrative verification workflows.
 */

import { supabase, isSupabaseConfigured, PROFILE_PROOFS_BUCKET } from '../lib/supabase'
import { toCanonicalIgn, normalizeIgn } from '../utils/playerIdentityUtils'

/**
 * Checks if the private 'profile-proofs' storage bucket is available.
 */
export async function checkProofBucketExists(bucketName = PROFILE_PROOFS_BUCKET) {
  if (!isSupabaseConfigured) return false

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (!error && Array.isArray(buckets)) {
      return buckets.some((b) => b.name === bucketName || b.id === bucketName)
    }
  } catch (err) {
    console.warn('[Evidence Service] Bucket check notice:', err)
  }

  try {
    const { error: probeError } = await supabase.storage.from(bucketName).list('', { limit: 1 })
    if (!probeError || !probeError.message?.toLowerCase().includes('bucket not found')) {
      return true
    }
  } catch (probeErr) {
    console.warn('[Evidence Service] Probe exception:', probeErr)
  }

  return false
}

/**
 * Uploads an original Free Fire profile screenshot proof to private storage
 * and creates a pending evidence record in public.player_identity_evidence.
 * 
 * @param {File|Blob} file - The original uncropped screenshot file
 * @param {Object} metadata
 * @param {string} metadata.userId - Authenticated user UUID
 * @param {string} metadata.gameUid - Character UID (e.g. "518920412")
 * @param {string} metadata.gameIgn - Exact In-Game Name (e.g. "KA¹⁷ Mjᶠᶠ")
 * @param {string} [metadata.tournamentId] - Optional tournament context
 * @param {string} [metadata.fallbackDataUrl] - Fallback preview Data URL
 * @returns {Promise<{ success: boolean, evidence: Object, signedUrl: string }>}
 */
export async function uploadProfileProof(file, {
  userId,
  gameUid,
  gameIgn,
  tournamentId = null,
  fallbackDataUrl = '',
}) {
  if (!file && !fallbackDataUrl) {
    throw new Error('Please select a profile screenshot to upload.')
  }
  if (!userId) {
    throw new Error('User authentication required to submit profile proof.')
  }
  if (!gameUid || !String(gameUid).trim()) {
    throw new Error('Game Character UID is required for profile evidence submission.')
  }
  if (!gameIgn || !String(gameIgn).trim()) {
    throw new Error('In-Game Name (IGN) is required for profile evidence submission.')
  }

  const canonicalIgn = toCanonicalIgn(gameIgn)
  const normIgn = normalizeIgn(gameIgn)
  const bucketName = PROFILE_PROOFS_BUCKET

  // Mock / Local Fallback Mode
  if (!isSupabaseConfigured) {
    console.log('[Evidence Service] Running in local preview mode. Simulating evidence creation.')
    const mockEvidence = {
      id: `ev-${Date.now()}`,
      userId,
      game: 'Free Fire',
      gameUid: String(gameUid).trim(),
      canonicalIgn,
      normalizedIgn: normIgn,
      tournamentId,
      evidenceType: 'FREE_FIRE_PROFILE_SCREENSHOT',
      storagePath: `${userId}/mock-proof-${Date.now()}.png`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }
    return {
      success: true,
      evidence: mockEvidence,
      signedUrl: fallbackDataUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      isFallback: true,
    }
  }

  // 1. Prepare Storage Filename & Upload Path
  const fileExt = file?.name ? (file.name.split('.').pop() || 'png').toLowerCase() : 'png'
  const fileName = `proof-${Date.now()}.${fileExt}`
  const storagePath = `${userId}/${fileName}`

  // 2. Upload Original Screenshot File to Private Storage
  if (file) {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type || 'image/png',
      })

    if (uploadError) {
      console.error('[Evidence Upload Error]:', uploadError)
      throw new Error(uploadError.message || 'Failed to upload profile screenshot to storage.')
    }
  }

  // 3. Insert Evidence Record into Database Table
  const insertPayload = {
    user_id: userId,
    game: 'Free Fire',
    game_uid: String(gameUid).trim(),
    canonical_ign: canonicalIgn,
    normalized_ign: normIgn,
    tournament_id: tournamentId,
    evidence_type: 'FREE_FIRE_PROFILE_SCREENSHOT',
    storage_path: storagePath,
    original_filename: file?.name || 'profile_screenshot.png',
    mime_type: file?.type || 'image/png',
    file_size: file?.size || 0,
    status: 'PENDING',
  }

  const { data: evidenceRow, error: insertError } = await supabase
    .from('player_identity_evidence')
    .insert(insertPayload)
    .select()
    .single()

  if (insertError) {
    console.error('[Evidence DB Insert Error]:', insertError)
    // Non-fatal if table not migrated yet, fallback gracefully
    if (insertError.code === 'PGRST205' || insertError.message?.includes('does not exist')) {
      console.warn('[Evidence Service DB Notice]: Table player_identity_evidence not created yet. Proof uploaded to storage successfully.')
    } else {
      throw new Error(insertError.message || 'Failed to record evidence in database.')
    }
  }

  // 4. Generate Short-Lived Signed URL for Immediate In-App Preview (1 hour expiry)
  let signedUrl = fallbackDataUrl
  try {
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, 3600)

    if (!signError && signedData?.signedUrl) {
      signedUrl = signedData.signedUrl
    }
  } catch (signErr) {
    console.warn('[Evidence Service Signed URL Warning]:', signErr)
  }

  return {
    success: true,
    evidence: evidenceRow || { ...insertPayload, id: `ev-${Date.now()}` },
    signedUrl,
    isFallback: false,
  }
}

/**
 * Retrieves the latest submitted profile evidence for a specific player.
 * Automatically generates a fresh signed URL for secure image preview.
 * 
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
export async function getPlayerProof(userId) {
  if (!userId) return null
  if (!isSupabaseConfigured) return null

  try {
    const { data, error } = await supabase
      .from('player_identity_evidence')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    // Generate fresh signed URL
    let signedUrl = null
    if (data.storage_path) {
      const { data: signData } = await supabase.storage
        .from(PROFILE_PROOFS_BUCKET)
        .createSignedUrl(data.storage_path, 3600)
      signedUrl = signData?.signedUrl || null
    }

    return {
      ...data,
      signedUrl,
    }
  } catch (err) {
    console.error('[Get Player Proof Error]:', err)
    return null
  }
}

/**
 * Lists all pending / unverified evidence records for administrator audit.
 * 
 * @returns {Promise<Array<Object>>}
 */
export async function listPendingProofs() {
  if (!isSupabaseConfigured) return []

  try {
    const { data, error } = await supabase
      .from('player_identity_evidence')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    if (error || !Array.isArray(data)) return []

    // Concurrently generate signed URLs for all evidence rows
    const enriched = await Promise.all(
      data.map(async (row) => {
        let signedUrl = null
        if (row.storage_path) {
          try {
            const { data: signData } = await supabase.storage
              .from(PROFILE_PROOFS_BUCKET)
              .createSignedUrl(row.storage_path, 3600)
            signedUrl = signData?.signedUrl || null
          } catch {
            // Ignore individual signing errors
          }
        }
        return {
          ...row,
          signedUrl,
          username: row.profiles?.username || 'Player',
        }
      })
    )

    return enriched
  } catch (err) {
    console.error('[List Pending Proofs Error]:', err)
    return []
  }
}

/**
 * Admin action: reviews a player evidence record and updates its verification status.
 * 
 * @param {string} evidenceId - UUID of the evidence record
 * @param {'VERIFIED'|'REJECTED'|'REQUIRES_REUPLOAD'} status
 * @param {string} [rejectionReason]
 * @returns {Promise<Object>}
 */
export async function reviewPlayerProof(evidenceId, status, rejectionReason = null) {
  if (!evidenceId) throw new Error('Evidence ID is required.')
  if (!status) throw new Error('Review status is required.')
  if (!isSupabaseConfigured) {
    return { success: true, evidenceId, status, mode: 'local' }
  }

  // Authoritative Path: Call Atomic Supabase review RPC
  const { data, error } = await supabase.rpc('review_player_identity_evidence', {
    p_evidence_id: evidenceId,
    p_status: status,
    p_rejection_reason: rejectionReason,
  })

  if (error) {
    console.error('[Review Evidence RPC Error]:', error)
    throw new Error(error.message || 'Failed to submit evidence review.')
  }

  if (data && data.success === false) {
    throw new Error(data.message || 'Evidence review failed.')
  }

  return data
}
