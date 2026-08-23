/**
 * MJ ESPORTS — Phase 3A: OCR Scoreboard Ingestion & Job Pipeline Test Suite
 * 
 * Tests image integrity validation, cryptographic SHA-256 duplicate rejection,
 * 64-bit perceptual hash (pHash) near-duplicate detection, QUEUED job orchestration,
 * private storage isolation, and strict isolation from the Match Results workspace.
 */

import {
  calculateImageSha256,
  calculateImagePHash,
  calculateHammingDistance,
  validateScoreboardImage,
} from './src/utils/imageHashUtils.js'
import { createOcrJob } from './src/services/ocrJobService.js'

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

async function runTestSuite() {
  console.log('============================================================')
  console.log('🧪 RUNNING PHASE 3A OCR SCOREBOARD INGESTION TEST SUITE')
  console.log('============================================================\n')

  // Synthetic valid 1080p dummy image buffer (PNG header + payload > 10KB)
  const validImageBuffer = Buffer.alloc(50 * 1024, 0x89)
  // Standard PNG signature bytes
  validImageBuffer[0] = 0x89
  validImageBuffer[1] = 0x50
  validImageBuffer[2] = 0x4e
  validImageBuffer[3] = 0x47
  validImageBuffer[4] = 0x0d
  validImageBuffer[5] = 0x0a
  validImageBuffer[6] = 0x1a
  validImageBuffer[7] = 0x0a

  // --------------------------------------------------------------------------
  console.log('--- 1. Image Format & Integrity Validation ---')
  // --------------------------------------------------------------------------
  const validFile = {
    name: 'match1_scoreboard.png',
    type: 'image/png',
    size: 450 * 1024,
  }
  const validRes = await validateScoreboardImage(validFile)
  assert(validRes.valid === true, 'Valid PNG image within size bounds is accepted')

  const webpFile = {
    name: 'match1_scoreboard.webp',
    type: 'image/webp',
    size: 250 * 1024,
  }
  const webpRes = await validateScoreboardImage(webpFile)
  assert(webpRes.valid === true, 'Valid WEBP image format is accepted')

  const pdfFile = {
    name: 'match1_scoreboard.pdf',
    type: 'application/pdf',
    size: 150 * 1024,
  }
  const pdfRes = await validateScoreboardImage(pdfFile)
  assert(pdfRes.valid === false && pdfRes.error.includes('Unsupported image format'), 'Unsupported MIME type (.pdf) is rejected')

  const tinyFile = {
    name: 'thumbnail.png',
    type: 'image/png',
    size: 4 * 1024, // 4 KB (< 10 KB)
  }
  const tinyRes = await validateScoreboardImage(tinyFile)
  assert(tinyRes.valid === false && tinyRes.error.includes('too small'), 'Oversized or undersized (<10KB) image is rejected')

  const hugeFile = {
    name: 'huge_screenshot.png',
    type: 'image/png',
    size: 25 * 1024 * 1024, // 25 MB (> 15 MB)
  }
  const hugeRes = await validateScoreboardImage(hugeFile)
  assert(hugeRes.valid === false && hugeRes.error.includes('exceeds maximum allowed limit'), 'Oversized file (>15MB) is rejected')

  // --------------------------------------------------------------------------
  console.log('\n--- 2. Cryptographic SHA-256 Calculation & Duplicate Detection ---')
  // --------------------------------------------------------------------------
  const sha1 = await calculateImageSha256(validImageBuffer)
  assert(typeof sha1 === 'string' && sha1.length === 64, 'SHA-256 returns 64-character lowercase hex string')

  const copyBuffer = Buffer.from(validImageBuffer)
  const sha2 = await calculateImageSha256(copyBuffer)
  assert(sha1 === sha2, 'Identical image buffers produce exact identical SHA-256 checksum')

  const alteredBuffer = Buffer.from(validImageBuffer)
  alteredBuffer[100] = 0xff
  const sha3 = await calculateImageSha256(alteredBuffer)
  assert(sha1 !== sha3, 'Modified image payload produces distinct SHA-256 checksum')

  // --------------------------------------------------------------------------
  console.log('\n--- 3. 64-Bit Perceptual Hash (pHash) & Hamming Distance ---')
  // --------------------------------------------------------------------------
  const phash1 = await calculateImagePHash(validImageBuffer)
  assert(typeof phash1 === 'string' && phash1.length === 16, 'pHash generates 16-character (64-bit) hex perceptual fingerprint')

  const compExact = calculateHammingDistance(phash1, phash1)
  assert(compExact.distance === 0 && compExact.isExactVisualMatch === true, 'Identical perceptual hash has Hamming distance 0')

  // Near-duplicate hash (differing by 2 bits out of 64)
  // flip lower 2 bits in last byte
  const lastByteVal = parseInt(phash1.substr(14, 2), 16) || 0
  const flippedByte = (lastByteVal ^ 0x03).toString(16).padStart(2, '0')
  const nearPhash = phash1.substring(0, 14) + flippedByte

  const compNear = calculateHammingDistance(phash1, nearPhash)
  assert(compNear.distance === 2 && compNear.isNearDuplicate === true, 'Hamming distance <= 5 flags visual near-duplicate (POSSIBLE_DUPLICATE)')

  // Distinct image hash (differing by > 20 bits)
  const invertedHash = phash1.split('').map(c => (15 - parseInt(c, 16)).toString(16)).join('')
  const compDistinct = calculateHammingDistance(phash1, invertedHash)
  assert(compDistinct.distance > 20 && compDistinct.isNearDuplicate === false, 'Dissimilar images have large Hamming distance and are not flagged')

  // --------------------------------------------------------------------------
  console.log('\n--- 4. OCR Job Ingestion & QUEUED State Machine ---')
  // --------------------------------------------------------------------------
  const mockFile = {
    name: 'round1_ff_scoreboard.png',
    type: 'image/png',
    size: 150 * 1024,
  }

  const jobResult = await createOcrJob(mockFile, {
    tournamentId: 'tourney-ff-001',
    matchId: 'MATCH_001',
    gameMode: 'Squad',
    mapName: 'Bermuda',
    fallbackDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  })

  assert(jobResult.success === true, 'createOcrJob succeeds for valid payload')
  assert(jobResult.job.status === 'QUEUED', 'Newly ingested OCR job strictly initializes with status QUEUED')
  assert(jobResult.job.match_id === 'MATCH_001', 'Job correctly associates target Match Round reference')
  assert(jobResult.job.tournament_id === 'tourney-ff-001', 'Job correctly associates Tournament ID')

  // --------------------------------------------------------------------------
  console.log('\n--- 5. Association Validation & Storage Path Isolation ---')
  // --------------------------------------------------------------------------
  let missingTourneyErr = null
  try {
    await createOcrJob(mockFile, { tournamentId: null, matchId: 'MATCH_001' })
  } catch (e) {
    missingTourneyErr = e.message
  }
  assert(missingTourneyErr && missingTourneyErr.includes('Tournament association is required'), 'Job creation without tournament ID is rejected')

  let missingMatchErr = null
  try {
    await createOcrJob(mockFile, { tournamentId: 'tourney-01', matchId: null })
  } catch (e) {
    missingMatchErr = e.message
  }
  assert(missingMatchErr && missingMatchErr.includes('Match round reference is required'), 'Job creation without match ID is rejected')

  const pathParts = jobResult.job.storage_path.split('/')
  assert(pathParts[0] === 'tourney-ff-001' && pathParts[1] === 'MATCH_001', 'Storage path is strictly isolated under tournamentId/matchId/jobId')

  // --------------------------------------------------------------------------
  console.log('\n--- 6. Architectural Boundary (Zero Writes to Match Results) ---')
  // --------------------------------------------------------------------------
  assert(!jobResult.job.payouts, 'OCR job object does NOT contain payouts or prize distributions')
  assert(!jobResult.job.final_standings, 'OCR job object does NOT calculate final standings')
  assert(!jobResult.job.winner_user_id, 'OCR job object does NOT designate tournament winners')

  console.log('\n============================================================')
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`)
  console.log('============================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTestSuite()
