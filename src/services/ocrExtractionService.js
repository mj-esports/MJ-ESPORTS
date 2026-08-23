/**
 * MJ ESPORTS — OCR Scoreboard Extraction Pipeline Service
 * 
 * Orchestrates multi-variant image preprocessing, layout region detection,
 * multi-pass OCR extraction, structured scoreboard candidate row parsing,
 * confidence scoring, and staging database persistence.
 */

import { supabase, isSupabaseConfigured, SCOREBOARD_PROOFS_BUCKET } from '../lib/supabase.js'
import { createPreprocessingVariants, PREPROCESSING_VARIANTS } from '../utils/imagePreprocessingUtils.js'
import { detectScoreboardRegions } from '../utils/scoreboardRegionDetector.js'
import { ocrRegistry } from './ocr/ocrRegistry.js'
import { parseScoreboardRows } from '../utils/scoreboardRowParser.js'
import { getOcrJob } from './ocrJobService.js'

/**
 * Executes full OCR extraction pipeline on a QUEUED scoreboard job.
 * 
 * @param {string} jobId 
 * @param {Object} [options]
 * @param {string} [options.adapterId]
 * @param {string} [options.fallbackImageUrl]
 * @returns {Promise<{
 *   success: boolean,
 *   jobId: string,
 *   status: string,
 *   extractedRows: Array<Object>,
 *   rawObservations: Array<Object>,
 *   failureReason?: string
 * }>}
 */
export async function processOcrJob(jobId, {
  adapterId = null,
  fallbackImageUrl = null,
} = {}) {
  if (!jobId) {
    throw new Error('OCR Job ID is required to execute extraction.')
  }

  // 1. Fetch Job Metadata & Signed Image URL
  const job = await getOcrJob(jobId)
  const targetImage = job?.signedUrl || fallbackImageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'

  // 2. Transition Job to PROCESSING status
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'PROCESSING',
          processing_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    } catch (err) {
      console.warn('[OCR Extraction Service] Processing status update notice:', err)
    }
  }

  try {
    // 3. Step A: Generate Multi-Variant Preprocessed Images
    const variants = await createPreprocessingVariants(targetImage)

    // 4. Step B: Select OCR Engine Adapter
    if (adapterId) {
      ocrRegistry.setActiveAdapter(adapterId)
    }
    const ocrAdapter = ocrRegistry.getActiveAdapter()

    // 5. Step C: Multi-Pass OCR Extraction
    const rawObservations = []
    for (let p = 0; p < variants.length; p++) {
      const v = variants[p]
      const ocrResult = await ocrAdapter.extractText(v.dataUrl, { variant: v.variant })
      rawObservations.push({
        passNumber: p + 1,
        variant: v.variant,
        engine: ocrResult.engine,
        rawText: ocrResult.rawText,
        tokens: ocrResult.tokens,
        confidence: ocrResult.confidence,
      })
    }

    // 6. Step D: Detect Scoreboard Regions
    const regions = detectScoreboardRegions(1920, 1080, {
      format: job?.game_mode || 'Squad',
      rowCount: 12,
    })

    // 7. Step E: Parse Structured Scoreboard Candidate Rows
    const extractedRows = parseScoreboardRows(rawObservations, regions)

    // 8. Step F: Failure / Unreadable Evaluation
    const isCompletelyUnreadable = extractedRows.length === 0 || extractedRows.every((r) => r.extractionStatus === 'UNREADABLE')
    const finalStatus = isCompletelyUnreadable ? 'REQUIRES_MANUAL_ENTRY' : 'AWAITING_REVIEW'
    const failureReason = isCompletelyUnreadable ? 'Scoreboard text unreadable or layout unrecognized' : null

    // 9. Step G: Persist Staging Extractions to Supabase
    if (isSupabaseConfigured) {
      try {
        // Save raw observations
        const obsPayloads = rawObservations.map((obs) => ({
          ocr_job_id: jobId,
          pass_number: obs.passNumber,
          preprocessing_variant: obs.variant,
          engine_name: obs.engine,
          raw_text: obs.rawText,
          raw_tokens: obs.tokens,
        }))

        await supabase.from('ocr_raw_observations').insert(obsPayloads)

        // Save structured candidate rows
        const rowPayloads = extractedRows.map((r) => ({
          ocr_job_id: jobId,
          row_index: r.rowIndex,
          rank: r.rank,
          raw_ign: r.rawName,
          raw_kills: r.rawKills,
          raw_damage: r.rawDamage,
          normalized_comparison_key: r.normalizedComparisonKey,
          rank_confidence: r.rankConfidence,
          name_confidence: r.nameConfidence,
          kill_confidence: r.killConfidence,
          overall_confidence: r.overallConfidence,
          bounding_box: r.boundingBox,
          multi_pass_observations: r.multiPassObservations,
          extraction_status: r.extractionStatus,
        }))

        await supabase.from('ocr_job_extractions').insert(rowPayloads)

        // Update Job Status
        await supabase
          .from('ocr_jobs')
          .update({
            status: finalStatus,
            processing_completed_at: new Date().toISOString(),
            failure_reason: failureReason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      } catch (dbErr) {
        console.warn('[OCR Extraction Service] DB persistence notice:', dbErr)
      }
    }

    return {
      success: true,
      jobId,
      status: finalStatus,
      extractedRows,
      rawObservations,
      failureReason,
    }
  } catch (pipelineErr) {
    console.error('[OCR Pipeline Fatal Error]:', pipelineErr)

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('ocr_jobs')
          .update({
            status: 'REQUIRES_MANUAL_ENTRY',
            failure_reason: pipelineErr.message || 'Pipeline extraction failure',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      } catch {}
    }

    return {
      success: false,
      jobId,
      status: 'REQUIRES_MANUAL_ENTRY',
      extractedRows: [],
      rawObservations: [],
      failureReason: pipelineErr.message || 'OCR processing encountered an unrecoverable error.',
    }
  }
}

/**
 * Retrieves staged extraction rows and multi-pass observations for a job.
 * 
 * @param {string} jobId 
 * @returns {Promise<{ rows: Array<Object>, observations: Array<Object> }>}
 */
export async function getJobExtractions(jobId) {
  if (!jobId || !isSupabaseConfigured) {
    return { rows: [], observations: [] }
  }

  try {
    const { data: rows } = await supabase
      .from('ocr_job_extractions')
      .select('*')
      .eq('ocr_job_id', jobId)
      .order('row_index', { ascending: true })

    const { data: observations } = await supabase
      .from('ocr_raw_observations')
      .select('*')
      .eq('ocr_job_id', jobId)
      .order('pass_number', { ascending: true })

    return {
      rows: rows || [],
      observations: observations || [],
    }
  } catch (err) {
    console.error('[Get Job Extractions Error]:', err)
    return { rows: [], observations: [] }
  }
}

/**
 * Saves manual scoreboard entries when OCR requires manual input or corrections.
 * 
 * @param {string} jobId 
 * @param {Array<Object>} manualRows 
 * @returns {Promise<Object>}
 */
export async function saveManualScoreboardRows(jobId, manualRows = []) {
  if (!jobId || !Array.isArray(manualRows)) {
    throw new Error('Valid Job ID and row payload required.')
  }

  if (isSupabaseConfigured) {
    try {
      // Delete existing extractions for this job
      await supabase.from('ocr_job_extractions').delete().eq('ocr_job_id', jobId)

      const payloads = manualRows.map((r, idx) => ({
        ocr_job_id: jobId,
        row_index: idx,
        rank: parseInt(r.rank, 10) || idx + 1,
        raw_ign: (r.rawName || r.raw_ign || '').trim(),
        raw_kills: parseInt(r.rawKills || r.raw_kills, 10) || 0,
        raw_damage: parseInt(r.rawDamage || r.raw_damage, 10) || 0,
        overall_confidence: 100, // Manual admin entry has 100% confidence
        extraction_status: 'EXTRACTED',
      }))

      await supabase.from('ocr_job_extractions').insert(payloads)

      // Update job to AWAITING_REVIEW
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'AWAITING_REVIEW',
          failure_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    } catch (err) {
      console.error('[Save Manual Scoreboard Rows Error]:', err)
    }
  }

  return { success: true, count: manualRows.length }
}
