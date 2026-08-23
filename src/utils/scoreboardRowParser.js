/**
 * MJ ESPORTS — Free Fire Scoreboard Row Parser
 * 
 * Converts raw OCR token streams and multi-pass observations into structured candidate rows:
 * - Preserves exact verbatim Unicode characters in `raw_ign`
 * - Extracts placement rank, kill counts, damage values
 * - Computes multi-factor confidence ratings
 * - Retains multi-pass variant observations for administrative verification
 */

import { calculateRowConfidence, EXTRACTION_STATUS } from './ocrConfidenceModel.js'
import { normalizeIgn } from './playerIdentityUtils.js'

/**
 * Parses raw OCR token lines into structured scoreboard candidate rows.
 * 
 * @param {Array<Object>} rawObservations - Array of OCR passes ({ passNumber, variant, tokens, rawText })
 * @param {Object} [detectedRegions] - Optional region bounding box metadata
 * @returns {Array<Object>} Structured candidate scoreboard rows
 */
export function parseScoreboardRows(rawObservations = [], detectedRegions = null) {
  if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
    return []
  }

  // Primary observation pass
  const primaryPass = rawObservations[0]
  const tokens = primaryPass.tokens || []

  const parsedRows = []

  tokens.forEach((token, idx) => {
    try {
      const lineText = (token.text || '').trim()
      if (!lineText) return

      // 1. Parse Rank (e.g. "#1", "1", "1.", "# 1")
      let rank = null
      const rankMatch = lineText.match(/^#?\s*(\d{1,2})\b/)
      if (rankMatch) {
        rank = parseInt(rankMatch[1], 10)
      } else if (token.rankToken) {
        const rMatch = String(token.rankToken).match(/(\d+)/)
        if (rMatch) rank = parseInt(rMatch[1], 10)
      }

      // 2. Parse Kills (e.g. "8 KILLS", "8 kills", "8 K", "8")
      let rawKills = null
      const killsMatch = lineText.match(/(\d+)\s*(?:KILLS?|KILL|K|ELIMS?)\b/i)
      if (killsMatch) {
        rawKills = parseInt(killsMatch[1], 10)
      } else if (token.killsToken) {
        const kMatch = String(token.killsToken).match(/(\d+)/)
        if (kMatch) rawKills = parseInt(kMatch[1], 10)
      }

      // 3. Parse Damage (e.g. "2450 DMG", "2450 damage", "2450 D")
      let rawDamage = null
      const dmgMatch = lineText.match(/(\d+)\s*(?:DMG|DAMAGE|D)\b/i)
      if (dmgMatch) {
        rawDamage = parseInt(dmgMatch[1], 10)
      }

      // 4. Extract Exact Verbatim IGN (Preserve Full Unicode)
      let rawName = ''
      if (token.ignToken) {
        rawName = token.ignToken.trim()
      } else {
        // Strip rank and kills from line text to isolate player IGN
        let cleaned = lineText
        if (rankMatch) {
          cleaned = cleaned.substring(rankMatch[0].length).trim()
        }
        if (killsMatch) {
          const kIdx = cleaned.search(new RegExp(`\\b${killsMatch[0]}\\b`, 'i'))
          if (kIdx !== -1) {
            cleaned = cleaned.substring(0, kIdx).trim()
          }
        }
        rawName = cleaned
      }

      // 5. Gather Multi-Pass Observations for this row
      const multiPassList = rawObservations.map((obs, pIdx) => {
        const correspondingToken = obs.tokens?.[idx]
        return {
          passNumber: pIdx + 1,
          variant: obs.variant || 'STANDARD_CONTRAST',
          text: correspondingToken?.ignToken || correspondingToken?.text || lineText,
          confidence: correspondingToken?.confidence || obs.confidence || 85,
        }
      })

      // 6. Compute Multi-Factor Confidence
      const confidenceData = calculateRowConfidence({
        rank,
        rawName,
        rawKills,
        rawDamage,
        tokenConfidence: token.confidence || 85,
        multiPassObservations: multiPassList,
      })

      // 7. Auxiliary Normalization Hint (Secondary search key only)
      const normalizedComparisonKey = normalizeIgn(rawName)

      // 8. Bounding Box association from detected regions if available
      const regionBox = detectedRegions?.rows?.[idx]?.pixelBounds || {
        x: 0,
        y: idx * 40,
        width: 1200,
        height: 40,
      }

      parsedRows.push({
        rowIndex: idx,
        rank,
        rawName,
        rawKills,
        rawDamage,
        normalizedComparisonKey,
        rankConfidence: confidenceData.rankConfidence,
        nameConfidence: confidenceData.nameConfidence,
        killConfidence: confidenceData.killConfidence,
        overallConfidence: confidenceData.overallConfidence,
        extractionStatus: confidenceData.extractionStatus,
        uncertainties: confidenceData.uncertainties,
        boundingBox: regionBox,
        multiPassObservations: multiPassList,
      })
    } catch (rowErr) {
      console.warn(`[ScoreboardRowParser] Row ${idx} parsing notice:`, rowErr)
      parsedRows.push({
        rowIndex: idx,
        rank: idx + 1,
        rawName: 'UNPARSEABLE_ROW',
        rawKills: null,
        rawDamage: null,
        normalizedComparisonKey: 'unparseable_row',
        overallConfidence: 20,
        extractionStatus: EXTRACTION_STATUS.PARSER_ERROR,
        uncertainties: [`Parser error: ${rowErr.message}`],
        multiPassObservations: [],
      })
    }
  })

  return parsedRows
}
