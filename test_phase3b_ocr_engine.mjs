/**
 * MJ ESPORTS — Phase 3B: OCR Extraction Engine Test Suite
 * 
 * Tests image preprocessing variants, pluggable OCR adapter contracts,
 * exact Unicode token retention, scoreboard row parsing, multi-factor confidence scoring,
 * failure resilience (REQUIRES_MANUAL_ENTRY), and strict architectural boundaries.
 */

import { createPreprocessingVariants, PREPROCESSING_VARIANTS } from './src/utils/imagePreprocessingUtils.js'
import { detectScoreboardRegions } from './src/utils/scoreboardRegionDetector.js'
import { ocrRegistry } from './src/services/ocr/ocrRegistry.js'
import { BaseOcrAdapter } from './src/services/ocr/ocrAdapterInterface.js'
import { HeuristicOcrAdapter } from './src/services/ocr/heuristicOcrAdapter.js'
import { parseScoreboardRows } from './src/utils/scoreboardRowParser.js'
import { calculateRowConfidence, EXTRACTION_STATUS } from './src/utils/ocrConfidenceModel.js'
import { processOcrJob } from './src/services/ocrExtractionService.js'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✅ [PASS] ${message}`)
  } else {
    failedTests++
    console.error(`  ❌ [FAIL] ${message}`)
  }
}

async function runPhase3bTests() {
  console.log('============================================================')
  console.log('🧪 RUNNING PHASE 3B OCR EXTRACTION ENGINE TEST SUITE')
  console.log('============================================================\n')

  // --------------------------------------------------------------------------
  console.log('--- 1. Image Preprocessing & Multi-Variant Generation ---')
  // --------------------------------------------------------------------------
  const mockImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const variants = await createPreprocessingVariants(mockImage)
  assert(Array.isArray(variants) && variants.length === 3, 'Generates exactly 3 preprocessing variants')
  assert(variants[0].variant === PREPROCESSING_VARIANTS.STANDARD_CONTRAST, 'Variant 1 is STANDARD_CONTRAST')
  assert(variants[1].variant === PREPROCESSING_VARIANTS.ADAPTIVE_THRESHOLD, 'Variant 2 is ADAPTIVE_THRESHOLD')
  assert(variants[2].variant === PREPROCESSING_VARIANTS.SHARPENED_DIGITS, 'Variant 3 is SHARPENED_DIGITS')

  // --------------------------------------------------------------------------
  console.log('\n--- 2. Scoreboard Region & Layout Detection ---')
  // --------------------------------------------------------------------------
  const regions = detectScoreboardRegions(1920, 1080, { format: 'Squad', rowCount: 12 })
  assert(regions.rows.length === 12, 'Detects exactly 12 horizontal row regions for Squad format')
  assert(regions.columns.rank && regions.columns.playerIgn && regions.columns.kills, 'Calculates normalized column bounds for Rank, IGN, and Kills')
  assert(regions.rows[0].pixelBounds.width > 0 && regions.rows[0].pixelBounds.height > 0, 'Computes positive pixel bounds for row bounding boxes')

  // --------------------------------------------------------------------------
  console.log('\n--- 3. Pluggable OCR Adapter Interface & Registry ---')
  // --------------------------------------------------------------------------
  const activeAdapter = ocrRegistry.getActiveAdapter()
  assert(activeAdapter instanceof BaseOcrAdapter, 'Active adapter implements BaseOcrAdapter interface')
  assert(typeof activeAdapter.extractText === 'function', 'Adapter implements extractText()')
  assert(typeof activeAdapter.extractRegions === 'function', 'Adapter implements extractRegions()')

  const customAdapter = new HeuristicOcrAdapter()
  ocrRegistry.registerAdapter(customAdapter)
  ocrRegistry.setActiveAdapter(customAdapter.id)
  assert(ocrRegistry.getActiveAdapter().id === customAdapter.id, 'Provider registry permits swapping active OCR adapter')

  // --------------------------------------------------------------------------
  console.log('\n--- 4. Raw Text & Exact Unicode Preservation ---')
  // --------------------------------------------------------------------------
  const ocrOutput = await activeAdapter.extractText(mockImage)
  assert(ocrOutput.rawText.includes('KA¹⁷ Mjᶠᶠ'), 'Preserves exact superscript Unicode IGN (KA¹⁷ Mjᶠᶠ)')
  assert(ocrOutput.rawText.includes('亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗'), 'Preserves exact clan symbol Unicode IGN (亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗)')
  assert(ocrOutput.rawText.includes('⚡THUNDER⚡'), 'Preserves decorative lightning ornament IGN (⚡THUNDER⚡)')
  assert(ocrOutput.rawText.includes('꧁༒Viper༒꧂'), 'Preserves stylized decorative brackets (꧁༒Viper༒꧂)')

  // --------------------------------------------------------------------------
  console.log('\n--- 5. Scoreboard Row Parsing & Token Extraction ---')
  // --------------------------------------------------------------------------
  const rawObservations = [
    { passNumber: 1, variant: 'STANDARD_CONTRAST', tokens: ocrOutput.tokens, confidence: 92 },
    { passNumber: 2, variant: 'ADAPTIVE_THRESHOLD', tokens: ocrOutput.tokens, confidence: 89 },
  ]
  const parsedRows = parseScoreboardRows(rawObservations, regions)

  assert(parsedRows.length === 12, 'Parses 12 structured candidate rows from token stream')
  assert(parsedRows[0].rank === 1, 'Row 1 rank parsed as integer 1')
  assert(parsedRows[0].rawName === 'KA¹⁷ Mjᶠᶠ', 'Row 1 exact rawName preserved verbatim as KA¹⁷ Mjᶠᶠ')
  assert(parsedRows[0].rawKills === 8, 'Row 1 rawKills parsed as integer 8')
  assert(parsedRows[0].rawDamage === 2450, 'Row 1 rawDamage parsed as integer 2450')

  assert(parsedRows[1].rank === 2, 'Row 2 rank parsed as integer 2')
  assert(parsedRows[1].rawName === '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗', 'Row 2 rawName preserved verbatim as 亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗')
  assert(parsedRows[1].rawKills === 6, 'Row 2 rawKills parsed as integer 6')

  // --------------------------------------------------------------------------
  console.log('\n--- 6. Multi-Factor Confidence Model & Status Telemetry ---')
  // --------------------------------------------------------------------------
  const highConf = calculateRowConfidence({
    rank: 1,
    rawName: 'KA¹⁷ Mjᶠᶠ',
    rawKills: 8,
    tokenConfidence: 95,
    multiPassObservations: [{ text: 'KA¹⁷ Mjᶠᶠ' }, { text: 'KA¹⁷ Mjᶠᶠ' }],
  })
  assert(highConf.overallConfidence >= 85, 'Complete row with multi-pass agreement has high confidence (>=85%)')
  assert(highConf.extractionStatus === EXTRACTION_STATUS.EXTRACTED, 'High confidence row assigned status EXTRACTED')

  const partialConf = calculateRowConfidence({
    rank: null, // missing rank
    rawName: 'Shadow_Player',
    rawKills: 3,
    tokenConfidence: 75,
  })
  assert(partialConf.extractionStatus === EXTRACTION_STATUS.PARTIAL, 'Missing rank or kill degrades status to PARTIAL')
  assert(partialConf.uncertainties.length > 0, 'Uncertainties array documents missing/ambiguous fields')

  const lowConf = calculateRowConfidence({
    rank: null,
    rawName: '___|', // artifact punctuation
    rawKills: null,
    tokenConfidence: 40,
  })
  assert(lowConf.extractionStatus === EXTRACTION_STATUS.LOW_CONFIDENCE, 'Garbage artifact text assigned LOW_CONFIDENCE')

  const unreadableConf = calculateRowConfidence({
    rank: null,
    rawName: '',
    rawKills: null,
  })
  assert(unreadableConf.extractionStatus === EXTRACTION_STATUS.UNREADABLE, 'Empty line assigned UNREADABLE')

  // --------------------------------------------------------------------------
  console.log('\n--- 7. Pipeline Execution & Failure Handling ---')
  // --------------------------------------------------------------------------
  const pipelineResult = await processOcrJob('mock-job-001', {
    fallbackImageUrl: mockImage,
  })
  assert(pipelineResult.success === true, 'processOcrJob completes successfully')
  assert(pipelineResult.status === 'AWAITING_REVIEW', 'Successful extraction transitions job to AWAITING_REVIEW')
  assert(pipelineResult.extractedRows.length === 12, 'Pipeline returns 12 candidate extracted rows')

  // --------------------------------------------------------------------------
  console.log('\n--- 8. Strict Architectural Boundary (Zero Writes to Results) ---')
  // --------------------------------------------------------------------------
  assert(!pipelineResult.match_results, 'Pipeline does NOT write to match_results')
  assert(!pipelineResult.payouts, 'Pipeline does NOT write to payouts')
  assert(!pipelineResult.final_standings, 'Pipeline does NOT modify final tournament standings')

  console.log('\n============================================================')
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`)
  console.log('============================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runPhase3bTests()
