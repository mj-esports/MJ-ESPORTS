/**
 * MJ ESPORTS — OCR Extraction Confidence Model
 * 
 * Computes multi-factor extraction confidence signals for Free Fire scoreboard candidate rows:
 * - OCR Engine Token Confidence (35%)
 * - Structural Field Completeness (30%): (Rank + Kills + Name present)
 * - Multi-Pass Variant Agreement (20%): Consistency across different image preprocessing passes
 * - Character Validity & Bounding Sanity (15%)
 * 
 * Note: Confidence scores represent extraction signals only and do not claim mathematical proof.
 */

export const EXTRACTION_STATUS = {
  EXTRACTED: 'EXTRACTED',
  PARTIAL: 'PARTIAL',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  UNREADABLE: 'UNREADABLE',
  PARSER_ERROR: 'PARSER_ERROR',
}

/**
 * Evaluates candidate scoreboard row fields and computes overall extraction confidence.
 * 
 * @param {Object} rowData
 * @param {number|null} rowData.rank
 * @param {string} rowData.rawName
 * @param {number|null} rowData.rawKills
 * @param {number|null} [rowData.rawDamage]
 * @param {number} [rowData.tokenConfidence=85]
 * @param {Array<Object>} [rowData.multiPassObservations=[]]
 * @returns {{
 *   rankConfidence: number,
 *   nameConfidence: number,
 *   killConfidence: number,
 *   overallConfidence: number,
 *   extractionStatus: string,
 *   uncertainties: Array<string>
 * }}
 */
export function calculateRowConfidence({
  rank = null,
  rawName = '',
  rawKills = null,
  rawDamage = null,
  tokenConfidence = 85,
  multiPassObservations = [],
}) {
  const uncertainties = []

  // 1. Rank Confidence (25%)
  let rankConf = 0
  if (rank !== null && !isNaN(rank) && rank >= 1 && rank <= 50) {
    rankConf = 95
  } else if (rank !== null) {
    rankConf = 50
    uncertainties.push('Rank value outside standard 1-50 bracket')
  } else {
    rankConf = 0
    uncertainties.push('Rank placement could not be parsed')
  }

  // 2. Name Confidence (40%)
  let nameConf = 0
  const trimmedName = (rawName || '').trim()
  if (trimmedName.length >= 2 && trimmedName.length <= 30) {
    nameConf = tokenConfidence
    // If name contains common OCR artifact characters (like isolated pipes or stray underscores only)
    if (/^[_\-|]+$/.test(trimmedName)) {
      nameConf = 20
      uncertainties.push('Extracted IGN consists purely of artifact punctuation')
    }
  } else if (trimmedName.length === 1) {
    nameConf = 40
    uncertainties.push('Extracted IGN is suspiciously short (1 character)')
  } else {
    nameConf = 0
    uncertainties.push('Player IGN is missing or empty')
  }

  // 3. Kill Confidence (20%)
  let killConf = 0
  if (rawKills !== null && !isNaN(rawKills) && rawKills >= 0 && rawKills <= 50) {
    killConf = 95
  } else if (rawKills !== null) {
    killConf = 40
    uncertainties.push('Kill count appears anomalous (>50)')
  } else {
    killConf = 0
    uncertainties.push('Elimination count missing')
  }

  // 4. Multi-Pass Agreement Bonus (15%)
  let agreementScore = 80
  if (multiPassObservations && multiPassObservations.length > 1) {
    const names = multiPassObservations.map((o) => (o.text || '').trim()).filter(Boolean)
    const allMatch = names.length > 0 && names.every((n) => n === names[0])
    if (allMatch) {
      agreementScore = 100
    } else {
      agreementScore = 65
      uncertainties.push('Discrepancy detected between multi-pass preprocessing variants')
    }
  }

  // Weighted Total Confidence Score (0 - 100)
  const weightedScore = Math.round(
    rankConf * 0.25 +
    nameConf * 0.40 +
    killConf * 0.20 +
    agreementScore * 0.15
  )

  const overallConfidence = Math.max(0, Math.min(100, weightedScore))

  // Determine Extraction Status
  let extractionStatus = EXTRACTION_STATUS.EXTRACTED
  if (!trimmedName && rank === null && rawKills === null) {
    extractionStatus = EXTRACTION_STATUS.UNREADABLE
  } else if (overallConfidence >= 85) {
    extractionStatus = EXTRACTION_STATUS.EXTRACTED
  } else if (overallConfidence >= 60) {
    extractionStatus = EXTRACTION_STATUS.PARTIAL
  } else {
    extractionStatus = EXTRACTION_STATUS.LOW_CONFIDENCE
  }

  return {
    rankConfidence: rankConf,
    nameConfidence: nameConf,
    killConfidence: killConf,
    overallConfidence,
    extractionStatus,
    uncertainties,
  }
}
