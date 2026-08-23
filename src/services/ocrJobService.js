/**
 * MJ ESPORTS — OCR Scoreboard Ingestion & Job Pipeline Service
 * 
 * Handles pre-OCR image validation, SHA-256 duplicate rejection, 64-bit perceptual hash (pHash)
 * near-duplicate detection, private scoreboard evidence storage, and OCR job orchestration.
 */

import { supabase, isSupabaseConfigured, SCOREBOARD_PROOFS_BUCKET } from '../lib/supabase.js'
import {
  calculateImageSha256,
  calculateImagePHash,
  calculateHammingDistance,
  validateScoreboardImage,
} from '../utils/imageHashUtils.js'

/**
 * Validates a scoreboard screenshot, detects exact & visual duplicates,
 * uploads original proof to private storage, and registers a QUEUED OCR job.
 * 
 * @param {File|Blob} file 
 * @param {Object} metadata
 * @param {string} metadata.tournamentId 
 * @param {string} metadata.matchId 
 * @param {'Solo'|'Duo'|'Squad'} [metadata.gameMode='Squad']
 * @param {string} [metadata.mapName='Bermuda']
 * @param {string} [metadata.uploadedBy]
 * @param {string} [metadata.fallbackDataUrl]
 * @returns {Promise<Object>}
 */
export async function createOcrJob(file, {
  tournamentId,
  matchId,
  gameMode = 'Squad',
  mapName = 'Bermuda',
  uploadedBy = null,
  fallbackDataUrl = '',
}) {
  if (!file && !fallbackDataUrl) {
    throw new Error('Please select a scoreboard screenshot to upload.')
  }
  if (!tournamentId) {
    throw new Error('Tournament association is required for scoreboard intake.')
  }
  if (!matchId) {
    throw new Error('Match round reference is required for scoreboard intake.')
  }

  // 1. Image Format & Dimension Validation
  const validation = await validateScoreboardImage(file)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid scoreboard image file.')
  }

  // 2. Compute Hashes
  const fileSha256 = await calculateImageSha256(file || fallbackDataUrl)
  const filePhash = await calculateImagePHash(file || fallbackDataUrl)

  const bucketName = SCOREBOARD_PROOFS_BUCKET
  const originalFilename = file?.name || 'scoreboard_screenshot.png'
  const mimeType = file?.type || 'image/png'
  const fileSize = file?.size || 0

  // 3. Fallback / Local Preview Mode (when Supabase is offline)
  if (!isSupabaseConfigured) {
    const mockJobId = `job-${Date.now()}`
    const mockJob = {
      id: mockJobId,
      tournament_id: tournamentId,
      match_id: matchId,
      game_mode: gameMode,
      map_name: mapName,
      status: 'QUEUED',
      original_filename: originalFilename,
      storage_path: `${tournamentId}/${matchId}/${mockJobId}/${originalFilename}`,
      mime_type: mimeType,
      file_size: fileSize,
      file_sha256: fileSha256,
      file_phash: filePhash,
      is_duplicate: false,
      is_perceptual_duplicate: false,
      uploaded_by: uploadedBy,
      created_at: new Date().toISOString(),
    }
    return {
      success: true,
      job: mockJob,
      signedUrl: fallbackDataUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      isDuplicate: false,
      isPerceptualDuplicate: false,
    }
  }

  // 4. Duplicate Check 1: Exact SHA-256 Match in Database
  try {
    const { data: exactMatch } = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('file_sha256', fileSha256)
      .limit(1)
      .maybeSingle()

    if (exactMatch) {
      console.warn('[OCR Ingestion]: Exact duplicate scoreboard image detected.', exactMatch)
      return {
        success: false,
        isDuplicate: true,
        existingJob: exactMatch,
        message: `Duplicate scoreboard image detected. Exact screenshot was already submitted in Job #${exactMatch.id.substring(0, 8)} (${exactMatch.match_id}).`,
      }
    }
  } catch (dupErr) {
    console.warn('[OCR Ingestion] Duplicate check query notice:', dupErr)
  }

  // 5. Duplicate Check 2: Perceptual Hash (Visual Near-Duplicate)
  let isPerceptualDuplicate = false
  let duplicateOfJobId = null
  try {
    const { data: recentJobs } = await supabase
      .from('ocr_jobs')
      .select('id, file_phash, match_id')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentJobs && recentJobs.length > 0) {
      for (const rj of recentJobs) {
        if (rj.file_phash) {
          const comp = calculateHammingDistance(filePhash, rj.file_phash)
          if (comp.isNearDuplicate) {
            isPerceptualDuplicate = true
            duplicateOfJobId = rj.id
            break
          }
        }
      }
    }
  } catch (pDupErr) {
    console.warn('[OCR Ingestion] pHash check notice:', pDupErr)
  }

  // 6. Generate Isolated Storage Path & Upload Original Image
  const tempJobId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}`
  const fileExt = originalFilename.split('.').pop() || 'png'
  const sanitizedFilename = `original.${fileExt}`
  const storagePath = `${tournamentId}/${matchId}/${tempJobId}/${sanitizedFilename}`

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, {
      upsert: true,
      contentType: mimeType,
    })

  if (uploadError) {
    console.error('[OCR Ingestion Upload Error]:', uploadError)
    throw new Error(uploadError.message || 'Failed to upload scoreboard screenshot to private storage.')
  }

  // 7. Insert Queued OCR Job Record
  const insertPayload = {
    id: tempJobId,
    tournament_id: tournamentId,
    match_id: matchId,
    game_mode: gameMode,
    map_name: mapName,
    status: 'QUEUED',
    original_filename: originalFilename,
    storage_path: storagePath,
    mime_type: mimeType,
    file_size: fileSize,
    file_sha256: fileSha256,
    file_phash: filePhash,
    is_duplicate: false,
    duplicate_of_job_id: duplicateOfJobId,
    is_perceptual_duplicate: isPerceptualDuplicate,
    uploaded_by: uploadedBy,
  }

  const { data: jobRow, error: insertError } = await supabase
    .from('ocr_jobs')
    .insert(insertPayload)
    .select()
    .single()

  if (insertError) {
    console.error('[OCR Job DB Insert Error]:', insertError)
    if (insertError.code === 'PGRST205' || insertError.message?.includes('does not exist')) {
      console.warn('[OCR Ingestion] Table public.ocr_jobs not migrated yet. Running in local staged mode.')
    } else {
      throw new Error(insertError.message || 'Failed to register OCR job in database.')
    }
  }

  // 8. Generate Short-Lived Signed URL for Secure Preview (1 hour)
  let signedUrl = fallbackDataUrl
  try {
    const { data: signedData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, 3600)

    if (signedData?.signedUrl) {
      signedUrl = signedData.signedUrl
    }
  } catch (signErr) {
    console.warn('[OCR Ingestion Signed URL Warning]:', signErr)
  }

  return {
    success: true,
    job: jobRow || insertPayload,
    signedUrl,
    isDuplicate: false,
    isPerceptualDuplicate,
    duplicateOfJobId,
  }
}

/**
 * Lists all ingested OCR jobs filtered by tournament or status.
 * Automatically enriches each job with a secure signed URL.
 * 
 * @param {Object} [filters]
 * @param {string} [filters.tournamentId]
 * @param {string} [filters.status]
 * @param {number} [filters.limit=50]
 * @returns {Promise<Array<Object>>}
 */
export async function listOcrJobs({ tournamentId = null, status = null, limit = 50 } = {}) {
  if (!isSupabaseConfigured) return []

  try {
    let query = supabase
      .from('ocr_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId)
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error || !Array.isArray(data)) return []

    // Concurrently enrich jobs with short-lived signed URLs
    const enriched = await Promise.all(
      data.map(async (job) => {
        let signedUrl = null
        if (job.storage_path) {
          try {
            const { data: signData } = await supabase.storage
              .from(SCOREBOARD_PROOFS_BUCKET)
              .createSignedUrl(job.storage_path, 3600)
            signedUrl = signData?.signedUrl || null
          } catch {
            // Ignore individual signing failure
          }
        }
        return {
          ...job,
          signedUrl,
        }
      })
    )

    return enriched
  } catch (err) {
    console.error('[List OCR Jobs Error]:', err)
    return []
  }
}

/**
 * Fetches a single OCR job record and signed URL.
 * 
 * @param {string} jobId 
 * @returns {Promise<Object|null>}
 */
export async function getOcrJob(jobId) {
  if (!jobId || !isSupabaseConfigured) return null

  try {
    const { data, error } = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !data) return null

    let signedUrl = null
    if (data.storage_path) {
      const { data: signData } = await supabase.storage
        .from(SCOREBOARD_PROOFS_BUCKET)
        .createSignedUrl(data.storage_path, 3600)
      signedUrl = signData?.signedUrl || null
    }

    return {
      ...data,
      signedUrl,
    }
  } catch (err) {
    console.error('[Get OCR Job Error]:', err)
    return null
  }
}
