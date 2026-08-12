import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { runRealImageOcr } from './ocr/tesseractOcrEngine'

/**
 * Compute simple string hash for duplicate content detection
 */
export function computeImageContentHash(inputStr = '') {
  let hash = 0
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `hash_${Math.abs(hash)}`
}

/**
 * Fetch all scorecards from Supabase with signed URLs for screenshots
 */
export async function fetchScorecards() {
  if (!isSupabaseConfigured) {
    return { success: true, data: [] }
  }

  try {
    const { data, error } = await supabase
      .from('match_scorecards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[Scorecards Fetch Notice]:', error.message)
      return { success: false, error: error.message, data: [] }
    }

    // Resolve private bucket signed URLs for screenshots
    const resolvedData = await Promise.all(
      (data || []).map(async (sc) => {
        let signedUrl = sc.screenshot_url
        if (sc.screenshot_path) {
          const { data: signedRes } = await supabase.storage
            .from('match-scorecards')
            .createSignedUrl(sc.screenshot_path, 3600)
          if (signedRes?.signedUrl) {
            signedUrl = signedRes.signedUrl
          }
        }
        return {
          ...sc,
          screenshotUrlResolved: signedUrl,
        }
      })
    )

    return { success: true, data: resolvedData }
  } catch (err) {
    console.error('[Fetch Scorecards Exception]:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Upload screenshot to private match-scorecards bucket and insert scorecard row
 */
export async function uploadScorecardScreenshot({
  file,
  tournamentId,
  matchId = null,
  userId,
  userEmail,
  username,
  game = 'Free Fire MAX',
  claimedIgn,
  claimedUid,
}) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured.' }
  }

  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'png'
    const submissionId = `sub_${Date.now()}`
    const filePath = `${tournamentId}/${submissionId}/scorecard.${fileExt}`

    // Duplicate detection check via hash
    const imageHash = computeImageContentHash(`${file.name}_${file.size}_${tournamentId}`)
    const { data: existingDuplicate } = await supabase
      .from('match_scorecards')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('screenshot_hash', imageHash)
      .limit(1)

    const isDuplicate = Boolean(existingDuplicate && existingDuplicate.length > 0)

    // Upload file to private storage bucket
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('match-scorecards')
      .upload(filePath, file, { upsert: true })

    if (storageErr) {
      console.warn('[Scorecard Storage Upload Notice]:', storageErr.message)
    }

    // Insert database row in public.match_scorecards
    const { data: dbData, error: dbErr } = await supabase
      .from('match_scorecards')
      .insert({
        tournament_id: tournamentId,
        match_id: matchId,
        submitted_by_user_id: userId,
        submitted_by_email: userEmail,
        submitted_by_username: username,
        game: game,
        claimed_game_ign: claimedIgn,
        claimed_game_uid: claimedUid,
        screenshot_path: storageData?.path || filePath,
        screenshot_hash: imageHash,
        ocr_status: 'PENDING_OCR',
        verification_status: isDuplicate ? 'REVIEW_REQUIRED' : 'SUBMITTED',
        is_flagged: isDuplicate,
        flag_reason: isDuplicate ? 'Duplicate screenshot upload detected in tournament database.' : null,
      })
      .select('*')
      .single()

    if (dbErr) {
      return { success: false, error: dbErr.message }
    }

    return { success: true, data: dbData }
  } catch (err) {
    console.error('[Scorecard Upload Exception]:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Execute real OCR engine and persist extracted data to database
 */
export async function runOcrOnScorecard(scorecardId, imageSource, game = 'Free Fire MAX') {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured.' }
  }

  try {
    // 1. Run real WebAssembly OCR
    const ocrRes = await runRealImageOcr(imageSource, game)
    const ocr = ocrRes.data

    // 2. Persist OCR extracted raw text and metrics to Supabase
    const { data, error } = await supabase
      .from('match_scorecards')
      .update({
        ocr_raw_text: ocr.raw_text,
        ocr_game_ign: ocr.game_ign,
        ocr_kills: ocr.kills,
        ocr_damage: ocr.damage,
        ocr_placement: ocr.placement,
        ocr_confidence: ocr.confidence,
        ocr_status: ocrRes.success ? 'OCR_COMPLETE' : 'OCR_FAILED',
        verification_status: 'REVIEW_REQUIRED',
        final_game_ign: ocr.game_ign,
        final_kills: ocr.kills,
        final_damage: ocr.damage,
        final_placement: ocr.placement,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scorecardId)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Scorecard OCR Execution Exception]:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Persist manual admin corrections to Supabase, preserving original OCR data
 */
export async function persistManualOverride(scorecardId, overrideData, reason = '', adminUserId = null) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured.' }
  }

  try {
    const { data, error } = await supabase
      .from('match_scorecards')
      .update({
        final_kills: overrideData.kills,
        final_damage: overrideData.damage,
        final_placement: overrideData.placement,
        final_game_ign: overrideData.game_ign || overrideData.ign,
        correction_reason: reason || 'Manual admin correction',
        corrected_by: adminUserId,
        corrected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', scorecardId)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Persist Override Exception]:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Approve scorecard and update verification status in database
 */
export async function approveScorecard(scorecardId, adminUserId = null) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured.' }
  }

  try {
    const { data, error } = await supabase
      .from('match_scorecards')
      .update({
        verification_status: 'VERIFIED',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', scorecardId)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Approve Scorecard Exception]:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Reject scorecard and update verification status in database
 */
export async function rejectScorecard(scorecardId, adminUserId = null, reason = 'Administrative Rejection') {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database not configured.' }
  }

  try {
    const { data, error } = await supabase
      .from('match_scorecards')
      .update({
        verification_status: 'REJECTED',
        flag_reason: reason,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', scorecardId)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Reject Scorecard Exception]:', err)
    return { success: false, error: err.message }
  }
}
