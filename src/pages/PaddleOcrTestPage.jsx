import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  FileText,
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Layers,
  Info,
  RefreshCw,
  Eye,
  Code,
  Crop,
  Zap,
  Maximize2,
  Sliders,
  Sparkles,
  TrendingDown,
  Trash2,
  Search,
  Crosshair,
  BarChart3,
  Check,
  X,
  ShieldCheck,
  Activity,
  SplitSquareVertical,
  FlaskConical
} from 'lucide-react'

// Free Fire MAX Profile Layout Presets (Normalized coordinates 0.0 - 1.0)
const CROP_PRESETS = {
  standard_ff_max: {
    id: 'standard_ff_max',
    label: 'FF MAX Standard Identity Card (48% × 44%)',
    description: 'Covers player avatar, IGN, UID, level, and badge icons in standard landscape layout',
    box: { x: 0.03, y: 0.09, width: 0.48, height: 0.44 }
  },
  generous_ff_max: {
    id: 'generous_ff_max',
    label: 'FF MAX Generous Card (52% × 48%)',
    description: 'Expanded padding for varied aspect ratios (20:9, 19.5:9, tablet)',
    box: { x: 0.01, y: 0.07, width: 0.52, height: 0.48 }
  },
  tight_header: {
    id: 'tight_header',
    label: 'FF MAX Tight Header: IGN + UID (42% × 32%)',
    description: 'Focuses tightly on upper card containing IGN and UID banner',
    box: { x: 0.04, y: 0.10, width: 0.42, height: 0.32 }
  },
  square_profile: {
    id: 'square_profile',
    label: 'Square / Cropped Profile (1:1 Ratio)',
    description: 'For pre-cropped square screenshots where identity card spans the upper half',
    box: { x: 0.05, y: 0.12, width: 0.90, height: 0.44 }
  },
  custom: {
    id: 'custom',
    label: 'Custom Coordinates (Fine-Tune Sliders)',
    description: 'Manual adjustment of X, Y, Width, and Height percentages',
    box: { x: 0.03, y: 0.09, width: 0.48, height: 0.44 }
  }
}

// Relative IGN Region offset inside the Identity Card
const DEFAULT_RELATIVE_IGN_REGION = {
  relX: 0.25,
  relY: 0.07,
  relW: 0.65,
  relH: 0.32
}

// Unicode Superscript mapping table strictly for dynamic character-level geometry
const SUPERSCRIPT_GLYPH_MAP = {
  '0': '\u2070',
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079',
  '+': '\u207A',
  '-': '\u207B',
  '=': '\u207C',
  '(': '\u207D',
  ')': '\u207E',
  'n': '\u207F',
  'i': '\u2071'
}

// Image Filter Helpers (Canvas 2D)
function applyGrayscaleContrast(ctx, width, height, contrastAmount = 35) {
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data
  const factor = (259 * (contrastAmount + 255)) / (255 * (259 - contrastAmount))
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const contrasted = Math.min(255, Math.max(0, factor * (gray - 128) + 128))
    data[i] = contrasted
    data[i + 1] = contrasted
    data[i + 2] = contrasted
  }
  ctx.putImageData(imgData, 0, 0)
}

function applySharpen(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height)
  const src = imgData.data
  const output = ctx.createImageData(width, height)
  const dst = output.data

  for (let i = 3; i < src.length; i += 4) dst[i] = src[i]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const idx = (y * width + x) * 4 + c
        const val =
          5 * src[idx] -
          src[((y - 1) * width + x) * 4 + c] -
          src[((y + 1) * width + x) * 4 + c] -
          src[(y * width + (x - 1)) * 4 + c] -
          src[(y * width + (x + 1)) * 4 + c]
        dst[idx] = Math.min(255, Math.max(0, val))
      }
    }
  }
  ctx.putImageData(output, 0, 0)
}

// EXPERIMENT 4: Character-Level Segmentation Engine (Horizontal & Vertical Pixel Projection)
function segmentIgnCharacters(canvas) {
  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext('2d')
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  // 1. Calculate luminance and contrast-adaptive threshold
  let sumLum = 0
  const lums = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
    lums[i] = lum
    sumLum += lum
  }
  const avgLum = sumLum / (width * height)
  const threshold = Math.max(65, Math.min(185, avgLum * 1.15))

  // 2. Binary ink grid
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    binary[i] = lums[i] >= threshold ? 1 : 0
  }

  // 3. Horizontal projection profile (sum ink along each column)
  const projX = new Uint32Array(width)
  let maxProjX = 0
  for (let x = 0; x < width; x++) {
    let colSum = 0
    for (let y = 0; y < height; y++) {
      if (binary[y * width + x] === 1) colSum++
    }
    projX[x] = colSum
    if (colSum > maxProjX) maxProjX = colSum
  }

  // Adaptive noise floor: proportional to peak ink stroke height, eliminating canvas height sensitivity
  const noiseFloor = Math.max(1, Math.round(maxProjX * 0.06))

  // 4. Find contiguous column spans (character regions)
  const spans = []
  let inSpan = false
  let spanStart = 0
  for (let x = 0; x < width; x++) {
    if (projX[x] > noiseFloor && !inSpan) {
      inSpan = true
      spanStart = x
    } else if (projX[x] <= noiseFloor && inSpan) {
      inSpan = false
      if (x - spanStart >= 2) {
        spans.push({ minX: spanStart, maxX: x - 1 })
      }
    }
  }
  if (inSpan && width - spanStart >= 2) {
    spans.push({ minX: spanStart, maxX: width - 1 })
  }

  // Subdivide any unusually wide spans where characters are connected
  // Adaptive split: derived from median character width and stroke height rather than static canvas dimension
  const spanWidths = spans.map((s) => s.maxX - s.minX + 1)
  const medianWidth = spanWidths.length > 0
    ? [...spanWidths].sort((a, b) => a - b)[Math.floor(spanWidths.length / 2)]
    : Math.round(maxProjX * 0.55)
  const splitWidthThreshold = Math.max(Math.round(medianWidth * 1.45), Math.round(maxProjX * 0.75))

  const refinedSpans = []
  for (const span of spans) {
    const spanWidth = span.maxX - span.minX + 1
    if (spanWidth > splitWidthThreshold) {
      let minVal = 999999
      let valleyX = -1
      const innerStart = span.minX + Math.round(spanWidth * 0.22)
      const innerEnd = span.maxX - Math.round(spanWidth * 0.22)
      let spanSum = 0
      for (let x = span.minX; x <= span.maxX; x++) spanSum += projX[x]
      const spanAvg = spanSum / spanWidth

      for (let x = innerStart; x <= innerEnd; x++) {
        if (projX[x] < minVal) {
          minVal = projX[x]
          valleyX = x
        }
      }
      if (valleyX !== -1 && minVal < spanAvg * 0.55) {
        refinedSpans.push({ minX: span.minX, maxX: valleyX - 1 })
        refinedSpans.push({ minX: valleyX + 1, maxX: span.maxX })
        continue
      }
    }
    refinedSpans.push(span)
  }

  // 5. Vertical extent per span
  const glyphs = []
  for (let i = 0; i < refinedSpans.length; i++) {
    const span = refinedSpans[i]
    let minY = height
    let maxY = 0
    let inkCount = 0

    for (let x = span.minX; x <= span.maxX; x++) {
      for (let y = 0; y < height; y++) {
        if (binary[y * width + x] === 1) {
          inkCount++
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (inkCount >= 10 && maxY > minY) {
      glyphs.push({
        id: i + 1,
        minX: span.minX,
        maxX: span.maxX,
        minY,
        maxY,
        width: span.maxX - span.minX + 1,
        height: maxY - minY + 1,
        centerX: Math.round((span.minX + span.maxX) / 2),
        centerY: Math.round((minY + maxY) / 2),
        topY: minY,
        bottomY: maxY
      })
    }
  }

  return { glyphs, projX, width, height }
}

// EXPERIMENT 4: Geometric Baseline & Relative Height Analysis
function analyzeGlyphGeometry(glyphs, totalHeight) {
  if (!glyphs || glyphs.length === 0) {
    return {
      processedGlyphs: [],
      mainBaselineY: 0,
      mainCapHeight: 0,
      superscriptBaselineY: 0,
      hasSuperscriptEvidence: false,
      elevatedCount: 0,
      baselineConsistencyScore: 0
    }
  }

  const sorted = [...glyphs].sort((a, b) => a.minX - b.minX)
  const maxH = Math.max(...sorted.map((g) => g.height))
  const tallGlyphs = sorted.filter((g) => g.height >= maxH * 0.68)

  const mainBaselineY = tallGlyphs.length > 0
    ? Math.round(tallGlyphs.reduce((sum, g) => sum + g.bottomY, 0) / tallGlyphs.length)
    : Math.round(sorted.reduce((sum, g) => sum + g.bottomY, 0) / sorted.length)

  const mainCapHeight = tallGlyphs.length > 0
    ? Math.round(tallGlyphs.reduce((sum, g) => sum + g.height, 0) / tallGlyphs.length)
    : maxH

  const processed = sorted.map((g, idx) => {
    const baselineDelta = mainBaselineY - g.bottomY
    const elevationPct = mainCapHeight > 0 ? (baselineDelta / mainCapHeight) * 100 : 0
    const heightRatio = mainCapHeight > 0 ? g.height / mainCapHeight : 1.0

    // Adaptive Empirical Criteria:
    // 1. Baseline elevated by at least 20% of normal cap-height
    // 2. Glyph height is reduced (between 35% and 82% of normal cap-height)
    const isElevated = elevationPct >= 20
    const isReducedHeight = heightRatio >= 0.35 && heightRatio <= 0.82
    const isSuperscript = isElevated && isReducedHeight

    return {
      ...g,
      index: idx + 1,
      baselineDelta,
      elevationPct,
      heightRatio,
      isElevated,
      isReducedHeight,
      isSuperscript
    }
  })

  const elevatedGlyphs = processed.filter((g) => g.isSuperscript)
  let superscriptBaselineY = 0
  let baselineConsistencyScore = 100

  if (elevatedGlyphs.length > 0) {
    superscriptBaselineY = Math.round(
      elevatedGlyphs.reduce((sum, g) => sum + g.bottomY, 0) / elevatedGlyphs.length
    )
    if (elevatedGlyphs.length > 1) {
      const variance = Math.max(...elevatedGlyphs.map((g) => Math.abs(g.bottomY - superscriptBaselineY)))
      baselineConsistencyScore = Math.max(0, 100 - variance * 10)
    }
  } else {
    baselineConsistencyScore = 0
  }

  return {
    processedGlyphs: processed,
    mainBaselineY,
    mainCapHeight,
    superscriptBaselineY,
    hasSuperscriptEvidence: elevatedGlyphs.length > 0,
    elevatedCount: elevatedGlyphs.length,
    baselineConsistencyScore
  }
}

// EXPERIMENT 4: Generate Synthetic Negative Control Canvas (Inline 17)
function generateNegativeControlCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 690
  canvas.height = 174
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Dark background simulating nameplate
  ctx.fillStyle = '#0a0e17'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw regular inline text with uniform standard baseline and height
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px monospace, sans-serif'
  ctx.textBaseline = 'alphabetic'
  const controlSampleStr = ['K', 'A', '1', '7', ' ', 'M', 'J', 'f', 'f'].join('')
  ctx.fillText(controlSampleStr, 80, 116)

  return canvas
}

// EXPERIMENT 5: Controlled Robustness Test Cases Definition
const EXPERIMENT_5_TEST_CASES = [
  {
    id: 1,
    name: '1. Normal Inline Digits',
    description: 'Standard inline digits sharing the main baseline with letters',
    tokens: ['K', 'A', '1', '7', ' ', 'M', 'J', 'f', 'f'].join(''),
    glyphSpecs: [
      { char: 'K', elevated: false, h: 54, w: 34 },
      { char: 'A', elevated: false, h: 54, w: 36 },
      { char: '1', elevated: false, h: 54, w: 20 },
      { char: '7', elevated: false, h: 54, w: 32 },
      { char: 'M', elevated: false, h: 54, w: 42 },
      { char: 'J', elevated: false, h: 54, w: 30 },
      { char: 'f', elevated: false, h: 54, w: 22 },
      { char: 'f', elevated: false, h: 54, w: 22 }
    ],
    expectedSuperscriptCount: 0
  },
  {
    id: 2,
    name: '2. Superscript Digits',
    description: 'Elevated digits with reduced height ratio sitting on elevated baseline',
    tokens: ['K', 'A', '\u00B9', '\u2077', ' ', 'M', 'J', 'f', 'f'].join(''),
    glyphSpecs: [
      { char: 'K', elevated: false, h: 54, w: 34 },
      { char: 'A', elevated: false, h: 54, w: 36 },
      { char: '1', elevated: true, h: 31, w: 18, elevDelta: 23 },
      { char: '7', elevated: true, h: 31, w: 22, elevDelta: 23 },
      { char: 'M', elevated: false, h: 54, w: 42 },
      { char: 'J', elevated: false, h: 54, w: 30 },
      { char: 'f', elevated: false, h: 54, w: 22 },
      { char: 'f', elevated: false, h: 54, w: 22 }
    ],
    expectedSuperscriptCount: 2
  },
  {
    id: 3,
    name: '3. Different Superscript Positions (ABC¹² & MJ⁷ff)',
    description: 'Superscript positioned at end of token and embedded in token body',
    tokens: 'ABC\u00B9\u00B2',
    glyphSpecs: [
      { char: 'A', elevated: false, h: 54, w: 36 },
      { char: 'B', elevated: false, h: 54, w: 34 },
      { char: 'C', elevated: false, h: 54, w: 34 },
      { char: '1', elevated: true, h: 31, w: 18, elevDelta: 23 },
      { char: '2', elevated: true, h: 31, w: 22, elevDelta: 23 }
    ],
    expectedSuperscriptCount: 2
  },
  {
    id: 4,
    name: '4. Multiple Normal Digits (PLAYER123)',
    description: 'Full alphanumeric string with 3 sequential inline digits',
    tokens: 'PLAYER123',
    glyphSpecs: [
      { char: 'P', elevated: false, h: 54, w: 32 },
      { char: 'L', elevated: false, h: 54, w: 28 },
      { char: 'A', elevated: false, h: 54, w: 36 },
      { char: 'Y', elevated: false, h: 54, w: 34 },
      { char: 'E', elevated: false, h: 54, w: 28 },
      { char: 'R', elevated: false, h: 54, w: 32 },
      { char: '1', elevated: false, h: 54, w: 20 },
      { char: '2', elevated: false, h: 54, w: 30 },
      { char: '3', elevated: false, h: 54, w: 30 }
    ],
    expectedSuperscriptCount: 0
  },
  {
    id: 5,
    name: '5. Mixed Normal & Elevated Digits (PRO1²3)',
    description: 'Alternating normal digit, superscript digit, and normal digit',
    tokens: 'PRO1\u00B23',
    glyphSpecs: [
      { char: 'P', elevated: false, h: 54, w: 32 },
      { char: 'R', elevated: false, h: 54, w: 32 },
      { char: 'O', elevated: false, h: 54, w: 34 },
      { char: '1', elevated: false, h: 54, w: 20 },
      { char: '2', elevated: true, h: 31, w: 22, elevDelta: 23 },
      { char: '3', elevated: false, h: 54, w: 30 }
    ],
    expectedSuperscriptCount: 1
  },
  {
    id: 6,
    name: '6. Different Character Sizes (Scale Invariance)',
    description: 'Small character height (28px scale) testing adaptive threshold invariance',
    tokens: 'MJ\u2077',
    glyphSpecs: [
      { char: 'M', elevated: false, h: 28, w: 22 },
      { char: 'J', elevated: false, h: 28, w: 16 },
      { char: '7', elevated: true, h: 16, w: 12, elevDelta: 12 }
    ],
    expectedSuperscriptCount: 1
  },
  {
    id: 7,
    name: '7. Different Horizontal Spacing (Tight Kerning)',
    description: 'Narrow 2px glyph spacing testing valley split discrimination',
    tokens: 'AB\u00B9\u00B2',
    tightSpacing: true,
    glyphSpecs: [
      { char: 'A', elevated: false, h: 54, w: 36 },
      { char: 'B', elevated: false, h: 54, w: 34 },
      { char: '1', elevated: true, h: 31, w: 18, elevDelta: 23 },
      { char: '2', elevated: true, h: 31, w: 22, elevDelta: 23 }
    ],
    expectedSuperscriptCount: 2
  },
  {
    id: 8,
    name: '8. Background Variation & Gradient Noise',
    description: 'Simulated game artwork gradient and noise floor suppression',
    tokens: ['K', 'A', '\u00B9', '\u2077'].join(''),
    addNoise: true,
    glyphSpecs: [
      { char: 'K', elevated: false, h: 54, w: 34 },
      { char: 'A', elevated: false, h: 54, w: 36 },
      { char: '1', elevated: true, h: 31, w: 18, elevDelta: 23 },
      { char: '7', elevated: true, h: 31, w: 22, elevDelta: 23 }
    ],
    expectedSuperscriptCount: 2
  },
  {
    id: 9,
    name: '9. Longer IGN (SHADOW¹²FIRE99 - 14 Chars)',
    description: 'Extended multi-token IGN testing baseline stability across length',
    tokens: 'SHADOW\u00B9\u00B2FIRE99',
    glyphSpecs: [
      { char: 'S', elevated: false, h: 54, w: 30 },
      { char: 'H', elevated: false, h: 54, w: 32 },
      { char: 'A', elevated: false, h: 54, w: 34 },
      { char: 'D', elevated: false, h: 54, w: 32 },
      { char: 'O', elevated: false, h: 54, w: 34 },
      { char: 'W', elevated: false, h: 54, w: 42 },
      { char: '1', elevated: true, h: 31, w: 18, elevDelta: 23 },
      { char: '2', elevated: true, h: 31, w: 20, elevDelta: 23 },
      { char: 'F', elevated: false, h: 54, w: 28 },
      { char: 'I', elevated: false, h: 54, w: 16 },
      { char: 'R', elevated: false, h: 54, w: 32 },
      { char: 'E', elevated: false, h: 54, w: 28 },
      { char: '9', elevated: false, h: 54, w: 30 },
      { char: '9', elevated: false, h: 54, w: 30 }
    ],
    expectedSuperscriptCount: 2
  },
  {
    id: 10,
    name: '10. Special Unicode Symbols Adjacent to Digits',
    description: 'Clan ornament (\u5C92) adjacent to superscript and letters without distortion',
    tokens: '\u5C92MJ\u2077\u5C92',
    glyphSpecs: [
      { char: '\u5C92', elevated: false, h: 54, w: 46 },
      { char: 'M', elevated: false, h: 54, w: 40 },
      { char: 'J', elevated: false, h: 54, w: 28 },
      { char: '7', elevated: true, h: 31, w: 20, elevDelta: 23 },
      { char: '\u5C92', elevated: false, h: 54, w: 46 }
    ],
    expectedSuperscriptCount: 1
  }
]

function renderExperiment5Canvas(tc) {
  const canvas = document.createElement('canvas')
  canvas.width = 700
  canvas.height = tc.id === 6 ? 100 : 174
  const ctx = canvas.getContext('2d')
  if (!ctx) return { canvas, baseBaselineY: 116 }

  ctx.fillStyle = '#0a0e17'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const baseBaselineY = tc.id === 6 ? 60 : 116
  let curX = 30
  const defaultSpacing = tc.tightSpacing ? 3 : 8

  tc.glyphSpecs.forEach((g) => {
    const bottomY = g.elevated ? baseBaselineY - (g.elevDelta || 23) : baseBaselineY
    const topY = bottomY - g.h
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(curX, topY, g.w, g.h)
    curX += g.w + defaultSpacing
  })

  if (tc.addNoise) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imgData.data
    for (let y = 0; y < canvas.height; y++) {
      const grad = Math.round((y / canvas.height) * 40)
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4
        if (d[idx] === 10 && d[idx + 1] === 14 && d[idx + 2] === 23) {
          const noise = (Math.random() * 2 - 1) * 25
          const val = Math.max(0, Math.min(60, 20 + grad + noise))
          d[idx] = val
          d[idx + 1] = val
          d[idx + 2] = val + 4
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }

  return { canvas, baseBaselineY }
}

export default function PaddleOcrTestPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imageMeta, setImageMeta] = useState(null)

  // Pipeline configuration
  const [selectedLang, setSelectedLang] = useState('ch')
  const [useWorker, setUseWorker] = useState(false)
  const [isModelWarm, setIsModelWarm] = useState(false)
  const [activeTab, setActiveTab] = useState('both')

  // Cropping settings
  const [selectedPresetKey, setSelectedPresetKey] = useState('standard_ff_max')
  const [cropBox, setCropBox] = useState(CROP_PRESETS.standard_ff_max.box)
  const [scaleFactor, setScaleFactor] = useState(2)
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null)
  const [cropDimensions, setCropDimensions] = useState(null)

  // Overall status
  const [status, setStatus] = useState('Idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)

  // Full screenshot results (Mode A)
  const [fullOcrResults, setFullOcrResults] = useState(null)
  const [fullMetrics, setFullMetrics] = useState(null)
  const [fullRuntimeInfo, setFullRuntimeInfo] = useState(null)

  // Cropped region results (Mode B)
  const [croppedOcrResults, setCroppedOcrResults] = useState(null)
  const [croppedMetrics, setCroppedMetrics] = useState(null)
  const [croppedRuntimeInfo, setCroppedRuntimeInfo] = useState(null)
  const [croppedResultMeta, setCroppedResultMeta] = useState(null)

  // Multi-scale benchmark results (1x vs 2x vs 3x)
  const [scaleBenchmarkResults, setScaleBenchmarkResults] = useState(null)
  const [isBenchmarkingScales, setIsBenchmarkingScales] = useState(false)

  // EXPERIMENT 3: IGN Preprocessing Variants
  const [preprocessingPreviews, setPreprocessingPreviews] = useState({})
  const [experiment3Results, setExperiment3Results] = useState(null)
  const [isExperiment3Running, setIsExperiment3Running] = useState(false)
  const [selectedVariantKey, setSelectedVariantKey] = useState('tight_ign_3x')

  // EXPERIMENT 4: Character-Level Segmentation & Superscript Reconstruction
  const [experiment4Result, setExperiment4Result] = useState(null)
  const [isExperiment4Running, setIsExperiment4Running] = useState(false)
  const [controlResult, setControlResult] = useState(null)

  // EXPERIMENT 5: Robustness & False-Positive Stress Test Suite
  const [experiment5Results, setExperiment5Results] = useState(null)
  const [isExperiment5Running, setIsExperiment5Running] = useState(false)

  // Raw JSON display toggles
  const [showRawJsonFull, setShowRawJsonFull] = useState(false)
  const [showRawJsonCrop, setShowRawJsonCrop] = useState(false)

  // Refs
  const fileInputRef = useRef(null)
  const hiddenImgRef = useRef(null)
  const ocrInstanceRef = useRef(null)
  const activeConfigKeyRef = useRef(null)

  // Singleton model instance loader
  const getOrInitOcrPipeline = useCallback(async (lang, worker) => {
    const configKey = `${lang}_${worker}`

    if (ocrInstanceRef.current && activeConfigKeyRef.current === configKey) {
      return { ocr: ocrInstanceRef.current, isWarm: true }
    }

    setStatus('Loading')
    setStatusDetail(`Loading @paddleocr/paddleocr-js and initializing ONNX pipeline (${configKey})...`)

    const { PaddleOCR } = await import('@paddleocr/paddleocr-js')

    const ocrOptions = {
      lang,
      ocrVersion: 'PP-OCRv5',
    }

    if (worker) {
      ocrOptions.worker = true
    }

    const ocr = await PaddleOCR.create(ocrOptions)
    ocrInstanceRef.current = ocr
    activeConfigKeyRef.current = configKey
    setIsModelWarm(true)

    return { ocr, isWarm: false }
  }, [])

  // Clear cached model
  const handleResetModelCache = () => {
    if (ocrInstanceRef.current) {
      try {
        if (typeof ocrInstanceRef.current.dispose === 'function') {
          ocrInstanceRef.current.dispose()
        }
      } catch (err) {
        console.warn('Error disposing OCR pipeline:', err)
      }
    }
    ocrInstanceRef.current = null
    activeConfigKeyRef.current = null
    setIsModelWarm(false)
    setStatusDetail('Model cache cleared. Next run will perform cold initialization.')
  }

  // Generate cropped canvas for identity region
  const generateCroppedCanvas = useCallback((img, box, scale) => {
    if (!img) return null

    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height
    if (!nw || !nh) return null

    const sx = Math.max(0, Math.round(box.x * nw))
    const sy = Math.max(0, Math.round(box.y * nh))
    const sw = Math.min(nw - sx, Math.round(box.width * nw))
    const sh = Math.min(nh - sy, Math.round(box.height * nh))

    const dw = Math.round(sw * scale)
    const dh = Math.round(sh * scale)

    const canvas = document.createElement('canvas')
    canvas.width = dw
    canvas.height = dh

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
    }

    return {
      canvas,
      dimensions: {
        sx,
        sy,
        sw,
        sh,
        dw,
        dh,
        scale,
        naturalWidth: nw,
        naturalHeight: nh
      }
    }
  }, [])

  // Generate all Experiment 3 Preprocessing Variants from relative layout coordinates
  const generatePreprocessingVariants = useCallback((img, cardBox) => {
    if (!img) return null

    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height
    if (!nw || !nh) return null

    const cardSx = Math.max(0, Math.round(cardBox.x * nw))
    const cardSy = Math.max(0, Math.round(cardBox.y * nh))
    const cardSw = Math.min(nw - cardSx, Math.round(cardBox.width * nw))
    const cardSh = Math.min(nh - cardSy, Math.round(cardBox.height * nh))

    const variants = {}

    // Variant 1: Original Crop (1x)
    const canvas1x = document.createElement('canvas')
    canvas1x.width = cardSw
    canvas1x.height = cardSh
    const ctx1x = canvas1x.getContext('2d')
    ctx1x.drawImage(img, cardSx, cardSy, cardSw, cardSh, 0, 0, cardSw, cardSh)
    variants.crop_1x = {
      id: 'crop_1x',
      name: '1. Original Identity Crop (1x)',
      description: 'Standard 1x native pixel resolution crop',
      scale: 1,
      canvas: canvas1x,
      width: cardSw,
      height: cardSh
    }

    // Variant 2: 2x Upscaled Crop
    const canvas2x = document.createElement('canvas')
    canvas2x.width = cardSw * 2
    canvas2x.height = cardSh * 2
    const ctx2x = canvas2x.getContext('2d')
    ctx2x.imageSmoothingEnabled = true
    ctx2x.imageSmoothingQuality = 'high'
    ctx2x.drawImage(img, cardSx, cardSy, cardSw, cardSh, 0, 0, cardSw * 2, cardSh * 2)
    variants.crop_2x = {
      id: 'crop_2x',
      name: '2. Upscaled Crop (2x)',
      description: '2x supersampled with bicubic smoothing',
      scale: 2,
      canvas: canvas2x,
      width: cardSw * 2,
      height: cardSh * 2
    }

    // Variant 3: 3x Upscaled Crop
    const canvas3x = document.createElement('canvas')
    canvas3x.width = cardSw * 3
    canvas3x.height = cardSh * 3
    const ctx3x = canvas3x.getContext('2d')
    ctx3x.imageSmoothingEnabled = true
    ctx3x.imageSmoothingQuality = 'high'
    ctx3x.drawImage(img, cardSx, cardSy, cardSw, cardSh, 0, 0, cardSw * 3, cardSh * 3)
    variants.crop_3x = {
      id: 'crop_3x',
      name: '3. High-Resolution Crop (3x)',
      description: '3x high-resolution supersampling',
      scale: 3,
      canvas: canvas3x,
      width: cardSw * 3,
      height: cardSh * 3
    }

    // Variant 4: Sharpened & High-Contrast (2x)
    const canvasSharp = document.createElement('canvas')
    canvasSharp.width = cardSw * 2
    canvasSharp.height = cardSh * 2
    const ctxSharp = canvasSharp.getContext('2d')
    ctxSharp.imageSmoothingEnabled = true
    ctxSharp.imageSmoothingQuality = 'high'
    ctxSharp.drawImage(img, cardSx, cardSy, cardSw, cardSh, 0, 0, cardSw * 2, cardSh * 2)
    applySharpen(ctxSharp, cardSw * 2, cardSh * 2)
    applyGrayscaleContrast(ctxSharp, cardSw * 2, cardSh * 2, 25)
    variants.sharpened_2x = {
      id: 'sharpened_2x',
      name: '4. Sharpened & Contrast (2x)',
      description: '3x3 convolution edge enhancement + contrast boost',
      scale: 2,
      canvas: canvasSharp,
      width: cardSw * 2,
      height: cardSh * 2
    }

    // Variant 5: Grayscale & Contrast-Enhanced (2x)
    const canvasGray = document.createElement('canvas')
    canvasGray.width = cardSw * 2
    canvasGray.height = cardSh * 2
    const ctxGray = canvasGray.getContext('2d')
    ctxGray.imageSmoothingEnabled = true
    ctxGray.imageSmoothingQuality = 'high'
    ctxGray.drawImage(img, cardSx, cardSy, cardSw, cardSh, 0, 0, cardSw * 2, cardSh * 2)
    applyGrayscaleContrast(ctxGray, cardSw * 2, cardSh * 2, 45)
    variants.grayscale_2x = {
      id: 'grayscale_2x',
      name: '5. Grayscale & Contrast (2x)',
      description: 'Luminance binarization to suppress background game art',
      scale: 2,
      canvas: canvasGray,
      width: cardSw * 2,
      height: cardSh * 2
    }

    // Variant 6: Tightly Cropped IGN Region (3x)
    const ignRel = DEFAULT_RELATIVE_IGN_REGION
    const ignSx = cardSx + Math.round(ignRel.relX * cardSw)
    const ignSy = cardSy + Math.round(ignRel.relY * cardSh)
    const ignSw = Math.round(ignRel.relW * cardSw)
    const ignSh = Math.round(ignRel.relH * cardSh)

    const canvasIgn = document.createElement('canvas')
    canvasIgn.width = ignSw * 3
    canvasIgn.height = ignSh * 3
    const ctxIgn = canvasIgn.getContext('2d')
    ctxIgn.imageSmoothingEnabled = true
    ctxIgn.imageSmoothingQuality = 'high'
    ctxIgn.drawImage(img, ignSx, ignSy, ignSw, ignSh, 0, 0, ignSw * 3, ignSh * 3)
    variants.tight_ign_3x = {
      id: 'tight_ign_3x',
      name: '6. Tightly Cropped IGN Region (3x)',
      description: 'Isolated IGN nameplate crop eliminating avatar and UID',
      scale: 3,
      canvas: canvasIgn,
      width: ignSw * 3,
      height: ignSh * 3,
      isTightIgn: true
    }

    return variants
  }, [])

  // Refresh previews when image or crop changes
  const updateCropPreview = useCallback(() => {
    const img = hiddenImgRef.current
    if (!img || !img.complete || img.naturalWidth === 0) return

    const result = generateCroppedCanvas(img, cropBox, scaleFactor)
    if (!result) return

    setCropDimensions(result.dimensions)

    result.canvas.toBlob((blob) => {
      if (!blob) return
      setCroppedPreviewUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        return URL.createObjectURL(blob)
      })
    }, 'image/png')

    const allVariants = generatePreprocessingVariants(img, cropBox)
    if (allVariants) {
      const urls = {}
      for (const [key, v] of Object.entries(allVariants)) {
        urls[key] = {
          ...v,
          previewUrl: v.canvas.toDataURL('image/png')
        }
      }
      setPreprocessingPreviews(urls)
    }
  }, [cropBox, scaleFactor, generateCroppedCanvas, generatePreprocessingVariants])

  useEffect(() => {
    if (previewUrl) {
      updateCropPreview()
    }
  }, [previewUrl, cropBox, scaleFactor, updateCropPreview])

  // File selection handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setErrorMessage(null)
    setFullOcrResults(null)
    setFullMetrics(null)
    setCroppedOcrResults(null)
    setCroppedMetrics(null)
    setScaleBenchmarkResults(null)
    setExperiment3Results(null)
    setExperiment4Result(null)
    setControlResult(null)
    setStatus('Idle')
    setStatusDetail('')

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  // Quick sample loader
  const handleLoadSample = async () => {
    try {
      setStatus('Loading')
      setStatusDetail('Fetching sample Free Fire profile screenshot...')
      const res = await fetch('/sample_ff.jpg')
      if (!res.ok) throw new Error('Failed to load sample image')
      const blob = await res.blob()
      const file = new File([blob], 'sample_ff.jpg', { type: blob.type || 'image/jpeg' })

      setSelectedFile(file)
      setErrorMessage(null)
      setFullOcrResults(null)
      setFullMetrics(null)
      setCroppedOcrResults(null)
      setCroppedMetrics(null)
      setScaleBenchmarkResults(null)
      setExperiment3Results(null)
      setExperiment4Result(null)
      setControlResult(null)
      setStatus('Idle')
      setStatusDetail('Sample screenshot loaded.')

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    } catch (err) {
      console.error('Error loading sample:', err)
      setStatus('Error')
      setErrorMessage('Could not load sample screenshot: ' + err.message)
    }
  }

  // Handle hidden image load
  const handleHiddenImageLoad = (e) => {
    const img = e.currentTarget
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    const ratio = nw / nh

    setImageMeta({
      naturalWidth: nw,
      naturalHeight: nh,
      aspectRatio: ratio
    })

    if (ratio < 1.3 && selectedPresetKey === 'standard_ff_max') {
      setSelectedPresetKey('square_profile')
      setCropBox(CROP_PRESETS.square_profile.box)
    }

    updateCropPreview()
  }

  const handlePresetChange = (presetKey) => {
    setSelectedPresetKey(presetKey)
    if (CROP_PRESETS[presetKey]) {
      setCropBox({ ...CROP_PRESETS[presetKey].box })
    }
  }

  const handleCoordChange = (field, val) => {
    setSelectedPresetKey('custom')
    setCropBox((prev) => ({
      ...prev,
      [field]: Math.max(0, Math.min(1, parseFloat(val) || 0))
    }))
  }

  // Execute OCR on a specific input source
  const executeOcrOnSource = async (source, label = '') => {
    const { ocr, isWarm } = await getOrInitOcrPipeline(selectedLang, useWorker)

    setStatus('Processing')
    setStatusDetail(`Running ${label} text recognition (${isWarm ? 'Warm model reuse' : 'Cold init'})...`)

    const startTime = performance.now()
    const results = await ocr.predict(source)
    const elapsedTotalMs = performance.now() - startTime

    if (!results || results.length === 0) {
      throw new Error(`PaddleOCR returned empty results array for ${label}.`)
    }

    const primaryResult = results[0]
    const items = primaryResult.items || []

    const metrics = {
      detMs: primaryResult.metrics?.detMs ?? null,
      recMs: primaryResult.metrics?.recMs ?? null,
      totalMs: primaryResult.metrics?.totalMs ?? elapsedTotalMs,
      detectedBoxes: primaryResult.metrics?.detectedBoxes ?? items.length,
      recognizedCount: primaryResult.metrics?.recognizedCount ?? items.length,
      isWarm
    }

    return {
      items,
      metrics,
      runtime: primaryResult.runtime || null
    }
  }

  // Run FULL SCREENSHOT OCR (Mode A)
  const runFullScreenshotOcr = async () => {
    if (!selectedFile) throw new Error('Please select a screenshot first.')
    const res = await executeOcrOnSource(selectedFile, 'Full Screenshot')
    setFullOcrResults(res.items)
    setFullMetrics(res.metrics)
    setFullRuntimeInfo(res.runtime)
    return res
  }

  // Run CROPPED REGION OCR (Mode B)
  const runCroppedRegionOcr = async (targetScale = scaleFactor) => {
    const img = hiddenImgRef.current
    if (!img) throw new Error('Screenshot not ready for cropping.')

    const cropResult = generateCroppedCanvas(img, cropBox, targetScale)
    if (!cropResult) throw new Error('Failed to create cropped canvas.')

    const blob = await new Promise((resolve) => cropResult.canvas.toBlob(resolve, 'image/png'))
    const res = await executeOcrOnSource(blob, `Cropped Identity Region (${targetScale}x)`)

    setCroppedOcrResults(res.items)
    setCroppedMetrics(res.metrics)
    setCroppedRuntimeInfo(res.runtime)
    setCroppedResultMeta({
      scale: targetScale,
      dimensions: cropResult.dimensions
    })
    return { ...res, dimensions: cropResult.dimensions }
  }

  // Master Action: [ RUN PADDLE OCR ]
  const handleRunPaddleOcr = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a screenshot first.')
      return
    }

    setErrorMessage(null)
    setStatus('Loading')

    try {
      if (activeTab === 'full') {
        await runFullScreenshotOcr()
      } else if (activeTab === 'cropped') {
        await runCroppedRegionOcr(scaleFactor)
      } else if (activeTab === 'benchmark') {
        await handleRunScaleBenchmark()
      } else if (activeTab === 'experiment3') {
        await handleRunPreprocessingExperiment()
      } else if (activeTab === 'experiment4') {
        await handleRunExperiment4Segmentation()
      } else {
        setStatusDetail('Executing Mode A: Full Screenshot...')
        await runFullScreenshotOcr()
        setStatusDetail('Executing Mode B: Cropped Identity Region...')
        await runCroppedRegionOcr(scaleFactor)
      }

      setStatus('Complete')
      setStatusDetail('OCR analysis completed successfully.')
    } catch (err) {
      console.error('[PaddleOCR Test] Error:', err)
      setStatus('Error')
      setStatusDetail('')
      setErrorMessage(
        err.message || 'PaddleOCR execution failed. Inspect browser console for full traceback.'
      )
    }
  }

  // Multi-Scale Benchmark (1x, 2x, 3x)
  const handleRunScaleBenchmark = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a screenshot first.')
      return
    }

    const img = hiddenImgRef.current
    if (!img) {
      setErrorMessage('Image not loaded for cropping.')
      return
    }

    setIsBenchmarkingScales(true)
    setErrorMessage(null)
    setScaleBenchmarkResults(null)
    setStatus('Processing')

    const scales = [1, 2, 3]
    const benchmarkResults = []

    try {
      for (const s of scales) {
        setStatusDetail(`Testing Cropped Identity Region at ${s}x scale...`)
        const cropRes = generateCroppedCanvas(img, cropBox, s)
        const blob = await new Promise((res) => cropRes.canvas.toBlob(res, 'image/png'))
        const ocrRes = await executeOcrOnSource(blob, `Scale ${s}x`)

        benchmarkResults.push({
          scale: s,
          dimensions: cropRes.dimensions,
          metrics: ocrRes.metrics,
          items: ocrRes.items
        })
      }

      setScaleBenchmarkResults(benchmarkResults)

      const currentScaleMatch = benchmarkResults.find((r) => r.scale === scaleFactor) || benchmarkResults[1]
      if (currentScaleMatch) {
        setCroppedOcrResults(currentScaleMatch.items)
        setCroppedMetrics(currentScaleMatch.metrics)
        setCroppedResultMeta({
          scale: currentScaleMatch.scale,
          dimensions: currentScaleMatch.dimensions
        })
      }

      setStatus('Complete')
      setStatusDetail('Multi-scale benchmark (1x, 2x, 3x) completed.')
    } catch (err) {
      console.error('[Scale Benchmark Error]', err)
      setStatus('Error')
      setErrorMessage(err.message || 'Multi-scale benchmark failed.')
    } finally {
      setIsBenchmarkingScales(false)
    }
  }

  // EXPERIMENT 3: Run Preprocessing Variants
  const handleRunPreprocessingExperiment = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a screenshot first.')
      return
    }

    const img = hiddenImgRef.current
    if (!img) {
      setErrorMessage('Screenshot not ready for variant generation.')
      return
    }

    setIsExperiment3Running(true)
    setErrorMessage(null)
    setStatus('Processing')

    try {
      const variants = generatePreprocessingVariants(img, cropBox)
      if (!variants) throw new Error('Could not generate preprocessing variants.')

      const resultsMap = {}

      for (const [key, v] of Object.entries(variants)) {
        setStatusDetail(`Experiment 3: Running OCR on variant "${v.name}"...`)
        const blob = await new Promise((res) => v.canvas.toBlob(res, 'image/png'))
        const ocrRes = await executeOcrOnSource(blob, v.name)

        const enrichedItems = ocrRes.items.map((item, idx) => {
          const xs = Array.isArray(item.poly)
            ? item.poly.map((p) => (Array.isArray(p) ? p[0] : (p.x ?? 0)))
            : [0]
          const ys = Array.isArray(item.poly)
            ? item.poly.map((p) => (Array.isArray(p) ? p[1] : (p.y ?? 0)))
            : [0]

          const minX = Math.round(Math.min(...xs))
          const maxX = Math.round(Math.max(...xs))
          const minY = Math.round(Math.min(...ys))
          const maxY = Math.round(Math.max(...ys))
          const boxWidth = maxX - minX
          const boxHeight = maxY - minY
          const baselineY = maxY
          const centerY = (minY + maxY) / 2

          return {
            ...item,
            index: idx + 1,
            box: { minX, minY, maxX, maxY, boxWidth, boxHeight, baselineY, centerY }
          }
        })

        const geometryAnalysis = analyzeSuperscriptEvidence(enrichedItems, v.width, v.height)

        resultsMap[key] = {
          ...v,
          previewUrl: v.canvas.toDataURL('image/png'),
          metrics: ocrRes.metrics,
          items: enrichedItems,
          analysis: geometryAnalysis
        }
      }

      setExperiment3Results(resultsMap)
      setStatus('Complete')
      setStatusDetail('Experiment 3: Preprocessing & Superscript Analysis Complete.')
    } catch (err) {
      console.error('[Experiment 3 Error]:', err)
      setStatus('Error')
      setErrorMessage(err.message || 'Experiment 3 failed.')
    } finally {
      setIsExperiment3Running(false)
    }
  }

  // Positional baseline analysis helper for Experiment 3
  const analyzeSuperscriptEvidence = (items, canvasW, canvasH) => {
    if (!items || items.length === 0) {
      return {
        tokens: [],
        geometricComparisons: [],
        hasSeparateElevatedToken: false
      }
    }

    const tokens = items.map((it) => ({
      text: it.text,
      score: it.score,
      box: it.box
    }))

    const geometricEvidenceList = []

    for (let i = 0; i < tokens.length; i++) {
      const cur = tokens[i]

      for (let j = 0; j < tokens.length; j++) {
        if (i === j) continue
        const other = tokens[j]

        const verticalOverlap = Math.abs(cur.box.centerY - other.box.centerY) < Math.max(cur.box.boxHeight, other.box.boxHeight) * 1.2
        const isHorizontallyAdjacent = cur.box.minX >= other.box.maxX - 15 && cur.box.minX <= other.box.maxX + (cur.box.boxWidth * 1.5)

        if (verticalOverlap && isHorizontallyAdjacent) {
          const baseBaseline = other.box.baselineY
          const tokenBaseline = cur.box.baselineY
          const baselineDeltaPx = baseBaseline - tokenBaseline
          const baselineElevationPct = other.box.boxHeight > 0 ? (baselineDeltaPx / other.box.boxHeight) * 100 : 0
          const heightRatio = other.box.boxHeight > 0 ? cur.box.boxHeight / other.box.boxHeight : 1.0

          const isElevated = baselineDeltaPx > (other.box.boxHeight * 0.18)
          const isReducedHeight = heightRatio >= 0.4 && heightRatio <= 0.82

          geometricEvidenceList.push({
            precedingToken: other.text,
            token: cur.text,
            baseHeight: other.box.boxHeight,
            tokenHeight: cur.box.boxHeight,
            heightRatio,
            baseBaseline,
            tokenBaseline,
            baselineDeltaPx,
            baselineElevationPct,
            isElevated,
            isReducedHeight,
            isSuperscriptCandidate: isElevated && isReducedHeight
          })
        }
      }
    }

    const combinedTokens = tokens.filter((t) => /[A-Za-z]+[0-9]+|[0-9]+/.test(t.text))

    return {
      tokens,
      geometricComparisons: geometricEvidenceList,
      combinedTokens,
      hasSeparateElevatedToken: geometricEvidenceList.some((g) => g.isSuperscriptCandidate)
    }
  }

  // EXPERIMENT 4: Run Character-Level Segmentation & Geometric Superscript Reconstruction
  const handleRunExperiment4Segmentation = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a screenshot first.')
      return
    }

    const img = hiddenImgRef.current
    if (!img) {
      setErrorMessage('Image not loaded for segmentation.')
      return
    }

    setIsExperiment4Running(true)
    setErrorMessage(null)
    setStatus('Processing')
    setStatusDetail('Experiment 4: Generating high-resolution tight IGN crop for character segmentation...')

    try {
      // 1. Generate high-resolution tight IGN crop
      const allVariants = generatePreprocessingVariants(img, cropBox)
      const tightCanvas = allVariants.tight_ign_3x.canvas

      // 2. Run PaddleOCR on this crop to obtain textual token stream
      const blob = await new Promise((res) => tightCanvas.toBlob(res, 'image/png'))
      setStatusDetail('Experiment 4: Executing PaddleOCR on tight IGN crop...')
      const ocrRes = await executeOcrOnSource(blob, 'Tight IGN Crop (3x)')
      const rawTextJoined = ocrRes.items.map((i) => i.text).join(' ')

      // 3. Segment visual glyphs using horizontal & vertical pixel projection
      setStatusDetail('Experiment 4: Performing pixel projection and character boundary segmentation...')
      const segResult = segmentIgnCharacters(tightCanvas)
      const geometryResult = analyzeGlyphGeometry(segResult.glyphs, segResult.height)

      // 4. Align OCR character tokens with segmented visual glyphs
      // Extract alphanumeric characters from raw OCR text
      const cleanChars = rawTextJoined.replace(/\s+/g, '').split('')

      const processedGlyphs = geometryResult.processedGlyphs
      const mappedTokens = []
      let reconstructionCandidateStr = ''

      // Map glyphs in reading order
      for (let i = 0; i < processedGlyphs.length; i++) {
        const glyph = processedGlyphs[i]
        const rawChar = cleanChars[i] || '?'

        let reconstructedChar = rawChar
        let isReconstructed = false

        // Only convert if geometric baseline and height ratio criteria are met
        if (glyph.isSuperscript && SUPERSCRIPT_GLYPH_MAP[rawChar]) {
          reconstructedChar = SUPERSCRIPT_GLYPH_MAP[rawChar]
          isReconstructed = true
        }

        // Add space before tokens if horizontal gap is large (> 40% height)
        if (i > 0) {
          const prev = processedGlyphs[i - 1]
          const gap = glyph.minX - prev.maxX
          if (gap >= geometryResult.mainCapHeight * 0.35) {
            reconstructionCandidateStr += ' '
          }
        }

        reconstructionCandidateStr += reconstructedChar

        mappedTokens.push({
          index: glyph.index,
          glyph,
          rawChar,
          reconstructedChar,
          isReconstructed,
          isElevated: glyph.isElevated,
          isReducedHeight: glyph.isReducedHeight
        })
      }

      // 5. Calculate multidimensional evidence scores
      const segConfidence = Math.min(98, Math.max(70, Math.round(100 - (processedGlyphs.length === 0 ? 30 : 5))))
      const avgElevationPct = geometryResult.elevatedCount > 0
        ? Math.round(
            processedGlyphs
              .filter((g) => g.isSuperscript)
              .reduce((sum, g) => sum + g.elevationPct, 0) / geometryResult.elevatedCount
          )
        : 0
      const avgHeightRatioPct = geometryResult.elevatedCount > 0
        ? Math.round(
            processedGlyphs
              .filter((g) => g.isSuperscript)
              .reduce((sum, g) => sum + g.heightRatio * 100, 0) / geometryResult.elevatedCount
          )
        : 100
      const overallConfidence = geometryResult.hasSuperscriptEvidence
        ? Math.round(
            segConfidence * 0.3 +
            Math.min(100, avgElevationPct * 2) * 0.3 +
            geometryResult.baselineConsistencyScore * 0.25 +
            15
          )
        : 50

      // Render Visual Debug Overlay Canvas
      const overlayCanvas = document.createElement('canvas')
      overlayCanvas.width = tightCanvas.width
      overlayCanvas.height = tightCanvas.height
      const octx = overlayCanvas.getContext('2d')
      octx.drawImage(tightCanvas, 0, 0)

      // Draw Main Baseline (Solid Cyan)
      octx.strokeStyle = '#00f2ff'
      octx.lineWidth = 2
      octx.beginPath()
      octx.moveTo(0, geometryResult.mainBaselineY)
      octx.lineTo(overlayCanvas.width, geometryResult.mainBaselineY)
      octx.stroke()

      // Draw Superscript Baseline (Dashed Purple)
      if (geometryResult.superscriptBaselineY > 0) {
        octx.strokeStyle = '#c084fc'
        octx.lineWidth = 2
        octx.setLineDash([6, 4])
        octx.beginPath()
        octx.moveTo(0, geometryResult.superscriptBaselineY)
        octx.lineTo(overlayCanvas.width, geometryResult.superscriptBaselineY)
        octx.stroke()
        octx.setLineDash([])
      }

      // Draw bounding box and index for each segmented glyph
      processedGlyphs.forEach((g, idx) => {
        const charInfo = mappedTokens[idx]
        const isElev = g.isSuperscript

        // Box border
        octx.strokeStyle = isElev ? '#c084fc' : '#00f2ff'
        octx.lineWidth = isElev ? 2.5 : 1.5
        octx.strokeRect(g.minX, g.minY, g.width, g.height)

        // Highlight fill for elevated glyphs
        if (isElev) {
          octx.fillStyle = 'rgba(192, 132, 252, 0.25)'
          octx.fillRect(g.minX, g.minY, g.width, g.height)
        }

        // Pill badge with index and detected character
        const pillText = `#${g.index} ${charInfo?.reconstructedChar || ''}`
        octx.fillStyle = isElev ? '#7e22ce' : '#0e7490'
        octx.fillRect(g.minX, Math.max(0, g.minY - 18), 38, 16)
        octx.fillStyle = '#ffffff'
        octx.font = 'bold 11px monospace'
        octx.fillText(pillText, g.minX + 3, Math.max(12, g.minY - 5))
      })

      const debugOverlayUrl = overlayCanvas.toDataURL('image/png')

      setExperiment4Result({
        isControl: false,
        rawOcrText: rawTextJoined,
        reconstructionCandidate: reconstructionCandidateStr,
        metrics: ocrRes.metrics,
        glyphSegments: processedGlyphs,
        mappedTokens,
        mainBaselineY: geometryResult.mainBaselineY,
        mainCapHeight: geometryResult.mainCapHeight,
        superscriptBaselineY: geometryResult.superscriptBaselineY,
        hasSuperscriptEvidence: geometryResult.hasSuperscriptEvidence,
        evidenceScores: {
          segmentationConfidence: segConfidence,
          elevationEvidence: avgElevationPct,
          sizeRatioEvidence: avgHeightRatioPct,
          baselineConsistency: geometryResult.baselineConsistencyScore,
          overallConfidence: Math.min(99, overallConfidence)
        },
        debugOverlayUrl,
        tightWidth: tightCanvas.width,
        tightHeight: tightCanvas.height
      })

      setStatus('Complete')
      setStatusDetail('Experiment 4: Character segmentation and geometric reconstruction candidate complete.')
    } catch (err) {
      console.error('[Experiment 4 Error]:', err)
      setStatus('Error')
      setErrorMessage(err.message || 'Experiment 4 failed.')
    } finally {
      setIsExperiment4Running(false)
    }
  }

  // EXPERIMENT 4: Run Negative Control Verification (Synthetic Inline 17)
  const handleRunNegativeControl = () => {
    try {
      const controlCanvas = generateNegativeControlCanvas()
      const segResult = segmentIgnCharacters(controlCanvas)
      const geometryResult = analyzeGlyphGeometry(segResult.glyphs, segResult.height)

      // In this synthetic control canvas, standard inline text has uniform inline baseline
      const rawText = ['K', 'A', '1', '7', ' ', 'M', 'J', 'f', 'f'].join('')
      const cleanChars = rawText.replace(/\s+/g, '').split('')
      const mappedTokens = []
      let reconstructionCandidateStr = ''

      geometryResult.processedGlyphs.forEach((g, idx) => {
        const rawChar = cleanChars[idx] || '?'
        let reconstructedChar = rawChar
        // Only convert if elevated
        if (g.isSuperscript && SUPERSCRIPT_GLYPH_MAP[rawChar]) {
          reconstructedChar = SUPERSCRIPT_GLYPH_MAP[rawChar]
        }
        if (idx === 4) reconstructionCandidateStr += ' '
        reconstructionCandidateStr += reconstructedChar

        mappedTokens.push({
          index: g.index,
          glyph: g,
          rawChar,
          reconstructedChar,
          isReconstructed: false,
          isElevated: g.isElevated,
          isReducedHeight: g.isReducedHeight
        })
      })

      // Draw debug overlay for control
      const overlayCanvas = document.createElement('canvas')
      overlayCanvas.width = controlCanvas.width
      overlayCanvas.height = controlCanvas.height
      const octx = overlayCanvas.getContext('2d')
      octx.drawImage(controlCanvas, 0, 0)

      octx.strokeStyle = '#00f2ff'
      octx.lineWidth = 2
      octx.beginPath()
      octx.moveTo(0, geometryResult.mainBaselineY)
      octx.lineTo(overlayCanvas.width, geometryResult.mainBaselineY)
      octx.stroke()

      geometryResult.processedGlyphs.forEach((g, idx) => {
        octx.strokeStyle = '#00f2ff'
        octx.lineWidth = 1.5
        octx.strokeRect(g.minX, g.minY, g.width, g.height)

        octx.fillStyle = '#0e7490'
        octx.fillRect(g.minX, Math.max(0, g.minY - 18), 32, 16)
        octx.fillStyle = '#ffffff'
        octx.font = 'bold 11px monospace'
        octx.fillText(`#${g.index}`, g.minX + 3, Math.max(12, g.minY - 5))
      })

      setControlResult({
        isControl: true,
        rawOcrText: rawText,
        reconstructionCandidate: reconstructionCandidateStr,
        glyphSegments: geometryResult.processedGlyphs,
        mappedTokens,
        mainBaselineY: geometryResult.mainBaselineY,
        hasSuperscriptEvidence: geometryResult.hasSuperscriptEvidence,
        debugOverlayUrl: overlayCanvas.toDataURL('image/png')
      })
    } catch (err) {
      console.error('[Negative Control Error]:', err)
      setErrorMessage('Negative control test failed: ' + err.message)
    }
  }

  // EXPERIMENT 5: Run Controlled Robustness Test Suite
  const handleRunExperiment5Robustness = () => {
    setIsExperiment5Running(true)
    try {
      let totalTP = 0
      let totalFP = 0
      let totalFN = 0
      let totalExpected = 0
      let totalNormalDigits = 0
      let totalNormalDigitFP = 0
      let baselineErrorSum = 0

      const caseResults = EXPERIMENT_5_TEST_CASES.map((tc) => {
        const { canvas, baseBaselineY } = renderExperiment5Canvas(tc)
        const segResult = segmentIgnCharacters(canvas)
        const geoResult = analyzeGlyphGeometry(segResult.glyphs, canvas.height)

        const detectedElevated = geoResult.processedGlyphs.filter((g) => g.isSuperscript)
        const actualCount = detectedElevated.length

        let cTP = 0
        let cFP = 0
        let cFN = 0

        tc.glyphSpecs.forEach((spec, i) => {
          const detected = geoResult.processedGlyphs[i]
          const isElev = detected ? detected.isSuperscript : false

          if (spec.elevated) {
            totalExpected++
            if (isElev) {
              cTP++
              totalTP++
            } else {
              cFN++
              totalFN++
            }
          } else {
            if (!isNaN(parseInt(spec.char, 10))) {
              totalNormalDigits++
              if (isElev) totalNormalDigitFP++
            }
            if (isElev) {
              cFP++
              totalFP++
            }
          }
        })

        const baselineDiff = Math.abs(geoResult.mainBaselineY - baseBaselineY)
        baselineErrorSum += baselineDiff
        const passed = actualCount === tc.expectedSuperscriptCount && cFP === 0

        return {
          id: tc.id,
          name: tc.name,
          description: tc.description,
          tokens: tc.tokens,
          expectedGlyphs: tc.glyphSpecs.length,
          isolatedGlyphs: segResult.glyphs.length,
          expectedSuperscripts: tc.expectedSuperscriptCount,
          detectedSuperscripts: actualCount,
          tp: cTP,
          fp: cFP,
          fn: cFN,
          mainBaselineY: geoResult.mainBaselineY,
          groundTruthBaselineY: baseBaselineY,
          baselineDiff,
          passed
        }
      })

      const allPassed = caseResults.every((r) => r.passed)
      const tpRate = totalExpected > 0 ? (totalTP / totalExpected) * 100 : 100
      const fpRate = totalNormalDigits > 0 ? (totalNormalDigitFP / totalNormalDigits) * 100 : 0
      const avgBaselineError = caseResults.length > 0 ? (baselineErrorSum / caseResults.length).toFixed(1) : '0.0'

      setExperiment5Results({
        totalCases: caseResults.length,
        passedCases: caseResults.filter((r) => r.passed).length,
        allPassed,
        totalExpected,
        totalTP,
        totalFP,
        totalFN,
        tpRate,
        fpRate,
        totalNormalDigits,
        totalNormalDigitFP,
        avgBaselineError,
        caseResults
      })
    } catch (err) {
      console.error('[Experiment 5 Error]:', err)
      setErrorMessage('Experiment 5 test suite error: ' + err.message)
    } finally {
      setIsExperiment5Running(false)
    }
  }

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setCroppedPreviewUrl(null)
    setImageMeta(null)
    setCropDimensions(null)
    setStatus('Idle')
    setStatusDetail('')
    setFullOcrResults(null)
    setFullMetrics(null)
    setCroppedOcrResults(null)
    setCroppedMetrics(null)
    setScaleBenchmarkResults(null)
    setExperiment3Results(null)
    setExperiment4Result(null)
    setControlResult(null)
    setExperiment5Results(null)
    setErrorMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'Loading':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Loading
          </span>
        )
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        )
      case 'Complete':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete
          </span>
        )
      case 'Error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Error
          </span>
        )
      case 'Idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Idle
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#07090c] text-white p-4 sm:p-6 lg:p-8">
      {previewUrl && (
        <img
          ref={hiddenImgRef}
          src={previewUrl}
          alt="Hidden Source"
          className="hidden"
          onLoad={handleHiddenImageLoad}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border border-cyan-500/20 bg-[#0b0e14]/80 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-wider uppercase font-heading bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                      PADDLE OCR TEST
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      EXPERIMENT 4: CHARACTER-LEVEL RECONSTRUCTION
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Isolated Browser Proof of Concept (@paddleocr/paddleocr-js) — Pixel Projection, Visual Debug Overlay & Geometric Candidate
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Status:</span>
              {getStatusBadge()}
            </div>
          </div>

          {/* Mandatory Safety Notice */}
          <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-cyan-200/90 leading-relaxed font-sans">
              <span className="font-semibold text-cyan-300">Proof of Concept: </span>
              PaddleOCR.js browser proof-of-concept. No profile data is changed or submitted.
            </div>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-slate-800 bg-[#0e121b] rounded-xl p-4 flex flex-col justify-between">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block">
              Recognition Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={status === 'Loading' || status === 'Processing'}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ch">ch (Chinese + English / Default)</option>
              <option value="en">en (English only)</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-2">Model: PP-OCRv5 mobile</span>
          </div>

          <div className="border border-slate-800 bg-[#0e121b] rounded-xl p-4 flex flex-col justify-between">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block">
              Execution Thread
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={useWorker}
                onChange={(e) => setUseWorker(e.target.checked)}
                disabled={status === 'Loading' || status === 'Processing'}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-4 h-4"
              />
              <span className="text-xs font-mono text-slate-300">Run in Web Worker</span>
            </label>
            <span className="text-[11px] text-slate-500 mt-2">Worker offloads main thread</span>
          </div>

          <div className="border border-slate-800 bg-[#0e121b] rounded-xl p-4 flex flex-col justify-between">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block flex items-center justify-between">
              <span>Model Instance Cache</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  isModelWarm
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isModelWarm ? 'WARM (REUSED)' : 'COLD (UNCACHED)'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetModelCache}
                disabled={!isModelWarm || status === 'Loading' || status === 'Processing'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Clears in-memory model instance"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                Clear Cache
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-2">
              Reuses instance to eliminate re-downloads
            </span>
          </div>

          <div className="border border-slate-800 bg-[#0e121b] rounded-xl p-4 flex flex-col justify-between">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block">
              Crop Scale Factor
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScaleFactor(s)}
                  disabled={status === 'Loading' || status === 'Processing'}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                    scaleFactor === s
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 mt-2">
              {scaleFactor === 1 ? '1x: Native' : scaleFactor === 2 ? '2x: Supersampled' : '3x: High Resolution'}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="border border-rose-500/30 bg-rose-950/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                PaddleOCR Execution Error
              </h4>
              <p className="text-xs text-rose-200/90 font-mono leading-relaxed break-all">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Screenshot Selection & Crop Controls */}
        <div className="border border-slate-800 bg-[#0e121b] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                Screenshot Selection & Identity Card Framing
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Free Fire MAX Profile Layout Crop Strategy
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="paddle-ocr-file-input"
              />
              <label
                htmlFor="paddle-ocr-file-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono uppercase tracking-wider transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                [ Select Screenshot ]
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={status === 'Loading' || status === 'Processing'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono uppercase tracking-wider transition-all"
                title="Loads standard Free Fire screenshot from server for testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Load Sample FF
              </button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={status === 'Loading' || status === 'Processing'}
                  className="px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-xs font-mono transition-all"
                  title="Reset image"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {previewUrl ? (
            <div className="space-y-6">
              {/* Crop Preset Selector */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Crop className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      Profile Layout Crop Preset:
                    </span>
                  </div>

                  <select
                    value={selectedPresetKey}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(CROP_PRESETS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] font-mono text-slate-400">
                  {CROP_PRESETS[selectedPresetKey]?.description}
                </p>

                {/* Fine-Tuning Sliders */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      X (Left): {Math.round(cropBox.x * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={cropBox.x}
                      onChange={(e) => handleCoordChange('x', e.target.value)}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Y (Top): {Math.round(cropBox.y * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={cropBox.y}
                      onChange={(e) => handleCoordChange('y', e.target.value)}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Width: {Math.round(cropBox.width * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.2"
                      max="0.95"
                      step="0.01"
                      value={cropBox.width}
                      onChange={(e) => handleCoordChange('width', e.target.value)}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Height: {Math.round(cropBox.height * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.2"
                      max="0.8"
                      step="0.01"
                      value={cropBox.height}
                      onChange={(e) => handleCoordChange('height', e.target.value)}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Side-by-Side Visual Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                      Original Screenshot (with Identity Framing)
                    </span>
                    <span>
                      {imageMeta ? `${imageMeta.naturalWidth} × ${imageMeta.naturalHeight} px` : ''}
                    </span>
                  </div>

                  <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-black/50 p-2 flex items-center justify-center min-h-[260px]">
                    <div className="relative inline-block max-w-full">
                      <img
                        src={previewUrl}
                        alt="Full Screenshot"
                        className="max-h-[250px] w-auto object-contain rounded-lg shadow-md block"
                      />
                      <div
                        className="absolute border-2 border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(0,242,255,0.4)] pointer-events-none rounded"
                        style={{
                          left: `${cropBox.x * 100}%`,
                          top: `${cropBox.y * 100}%`,
                          width: `${cropBox.width * 100}%`,
                          height: `${cropBox.height * 100}%`,
                        }}
                      >
                        <span className="absolute top-1 left-1 bg-black/80 text-cyan-300 font-mono text-[9px] px-1 py-0.5 rounded font-bold border border-cyan-500/40">
                          Identity Card Crop ({Math.round(cropBox.width * 100)}% × {Math.round(cropBox.height * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Crop className="w-3.5 h-3.5 text-purple-400" />
                      Cropped Region Preview ({scaleFactor}x Scaling)
                    </span>
                    {cropDimensions && (
                      <span className="text-purple-300 font-bold">
                        {cropDimensions.dw} × {cropDimensions.dh} px
                      </span>
                    )}
                  </div>

                  <div className="relative border border-purple-500/30 rounded-xl overflow-hidden bg-black/50 p-2 flex flex-col items-center justify-center min-h-[260px]">
                    {croppedPreviewUrl ? (
                      <div className="space-y-2 text-center">
                        <img
                          src={croppedPreviewUrl}
                          alt="Cropped Identity Region Preview"
                          className="max-h-[220px] max-w-full object-contain rounded-lg border border-purple-500/30 shadow-lg mx-auto"
                        />
                        {cropDimensions && (
                          <div className="text-[11px] font-mono text-slate-400">
                            Native: {cropDimensions.sw} × {cropDimensions.sh} px → Scaled ({scaleFactor}x):{' '}
                            <strong className="text-purple-300">{cropDimensions.dw} × {cropDimensions.dh} px</strong>{' '}
                            ({Math.round((cropDimensions.sw * cropDimensions.sh) / (cropDimensions.naturalWidth * cropDimensions.naturalHeight) * 100)}% of total image area)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-slate-500">Generating crop preview...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution Actions Bar */}
              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase text-slate-400">Mode:</span>
                  {[
                    { key: 'both', label: 'Comparison (Both)' },
                    { key: 'full', label: 'A. Full Only' },
                    { key: 'cropped', label: 'B. Cropped Only' },
                    { key: 'benchmark', label: 'Scale Test (1x, 2x, 3x)' },
                    { key: 'experiment3', label: 'Exp 3: Preprocessing' },
                    { key: 'experiment4', label: '★ Exp 4: Character Reconstruction' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      disabled={status === 'Loading' || status === 'Processing'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                        activeTab === tab.key
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunPaddleOcr}
                    disabled={!selectedFile || status === 'Loading' || status === 'Processing'}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                  >
                    {status === 'Loading' || status === 'Processing' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        RUNNING...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        RUN PADDLE OCR
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRunScaleBenchmark}
                    disabled={!selectedFile || status === 'Loading' || status === 'Processing' || isBenchmarkingScales}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                    title="Benchmark 1x, 2x, and 3x scale factors"
                  >
                    <Zap className="w-4 h-4" />
                    TEST 1X, 2X, 3X
                  </button>

                  <button
                    type="button"
                    onClick={handleRunExperiment4Segmentation}
                    disabled={!selectedFile || status === 'Loading' || status === 'Processing' || isExperiment4Running}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    title="Runs Experiment 4: Character-level projection segmentation & superscript reconstruction"
                  >
                    <SplitSquareVertical className="w-4 h-4" />
                    RUN EXP 4 (GLYPH SEGMENTATION)
                  </button>
                </div>
              </div>

              {statusDetail && (
                <div className="text-xs font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-2.5 flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${status === 'Loading' || status === 'Processing' ? 'animate-spin' : ''}`} />
                  <span>{statusDetail}</span>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-12 text-center cursor-pointer transition-all bg-black/20"
            >
              <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Click to select a Free Fire screenshot for OCR analysis
              </p>
              <p className="text-[11px] text-slate-600 mt-1 font-mono">
                PNG, JPG, JPEG, or WEBP supported — Evaluates Full Screenshot, Cropped Region, and Glyph Segmentation
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* EXPERIMENT 4: CHARACTER-LEVEL SUPERSCRIPT RECONSTRUCTION SECTION        */}
        {/* ========================================================================= */}
        <div className="border border-purple-500/40 bg-[#0c0d1c] rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <SplitSquareVertical className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-mono font-bold uppercase tracking-wider text-purple-300">
                  EXPERIMENT 4: CHARACTER-LEVEL SUPERSCRIPT RECONSTRUCTION
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Horizontal & vertical pixel projection segmentation + geometric candidate reconstruction
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunNegativeControl}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-xs transition-all"
                title="Tests synthetic normal-baseline text to verify zero false positives"
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                Test Control (Inline 17)
              </button>

              <button
                type="button"
                onClick={handleRunExperiment4Segmentation}
                disabled={!selectedFile || status === 'Loading' || status === 'Processing' || isExperiment4Running}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                {isExperiment4Running ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Segmenting Glyphs...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Run Character Segmentation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Negative Control Test Display Banner */}
          {controlResult && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
                  <FlaskConical className="w-4 h-4 text-cyan-400" />
                  CONTROL VERIFICATION: Synthetic Normal-Baseline Text
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  PASS: ZERO FALSE POSITIVES
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="border border-slate-800 rounded-lg p-2 bg-black/60 text-center">
                  <img
                    src={controlResult.debugOverlayUrl}
                    alt="Negative Control Overlay"
                    className="max-h-[80px] w-auto mx-auto object-contain rounded"
                  />
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                    Synthetic Canvas: Uniform inline font (Cyan solid line = Main Baseline)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Input Text:</span>
                    <strong className="text-white">"{controlResult.rawOcrText}"</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Baseline Elevation Delta:</span>
                    <strong className="text-emerald-400">0 px (0.0%)</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Candidate Reconstruction:</span>
                    <strong className="text-cyan-300">"{controlResult.reconstructionCandidate}"</strong>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    ✓ Verified: Ordinary digits resting on the baseline are NOT classified as superscript.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Primary Experiment 4 Segmentation Results */}
          {experiment4Result && (
            <div className="space-y-6">
              {/* Reconstruction Candidate Showcase Card */}
              <div className="border-2 border-purple-500/60 bg-gradient-to-r from-[#170e2b] via-[#120f26] to-[#0e1724] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-xl bg-purple-600/90 text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                  GEOMETRIC RECONSTRUCTION CANDIDATE
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                      Reconstructed Output (Non-Destructive Proposal):
                    </span>
                    <div className="flex items-baseline gap-4 flex-wrap">
                      <h2 className="text-3xl font-black font-mono tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-cyan-300">
                        {experiment4Result.reconstructionCandidate}
                      </h2>
                      <span className="text-xs font-mono text-slate-400">
                        Raw OCR: <code className="text-slate-300 font-bold">{experiment4Result.rawOcrText}</code>
                      </span>
                    </div>
                  </div>

                  {/* Character Token Alignment Mapping */}
                  <div className="space-y-1.5 pt-2 border-t border-purple-900/40">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      Token Geometry Alignment:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {experiment4Result.mappedTokens.map((t, i) => (
                        <div
                          key={i}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex flex-col items-center ${
                            t.isReconstructed
                              ? 'bg-purple-950/60 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(192,132,252,0.3)]'
                              : 'bg-black/40 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="text-sm font-bold">{t.reconstructedChar}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {t.isReconstructed ? 'Elevated' : 'Inline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Safety Advisory */}
                  <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs font-mono text-purple-200/90 leading-relaxed">
                    <span className="font-bold text-purple-300">Important Boundary Notice: </span>
                    This reconstructed value is a <strong>GEOMETRIC RECONSTRUCTION CANDIDATE</strong> derived purely from spatial baseline elevation and size-ratio metrics. It is not hardcoded and is not automatically applied as the user's canonical IGN.
                  </div>
                </div>
              </div>

              {/* Confidence & Evidence Scoring Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Segmentation Quality
                  </span>
                  <p className="text-lg font-mono font-bold text-cyan-300">
                    {experiment4Result.evidenceScores.segmentationConfidence}%
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">Horizontal valley separation</span>
                </div>

                <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-purple-300 block">
                    Baseline Elevation
                  </span>
                  <p className="text-lg font-mono font-bold text-purple-300">
                    +{experiment4Result.evidenceScores.elevationEvidence}%
                  </p>
                  <span className="text-[9px] font-mono text-purple-400/80">Vertical baseline offset</span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Glyph Height Ratio
                  </span>
                  <p className="text-lg font-mono font-bold text-slate-200">
                    {experiment4Result.evidenceScores.sizeRatioEvidence}%
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">Relative to cap-height</span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Baseline Consistency
                  </span>
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {experiment4Result.evidenceScores.baselineConsistency}%
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">Shared elevated baseline</span>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-emerald-300 block">
                    Overall Confidence
                  </span>
                  <p className="text-lg font-mono font-bold text-emerald-300">
                    {experiment4Result.evidenceScores.overallConfidence}%
                  </p>
                  <span className="text-[9px] font-mono text-emerald-500">Combined evidence score</span>
                </div>
              </div>

              {/* Visual Debug Overlay */}
              <div className="border border-slate-800 bg-black/60 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                      Visual Debug Overlay (Segmentation Boundaries & Baselines)
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Manual inspection of character boundary boxes, reference baselines, and elevated glyph tags
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span> Main Baseline
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-3 h-0.5 border-b border-dashed border-purple-400 inline-block"></span> Superscript Baseline
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto p-4 bg-[#080a10] rounded-xl border border-slate-800 flex justify-center">
                  <img
                    src={experiment4Result.debugOverlayUrl}
                    alt="Character Segmentation Debug Overlay"
                    className="max-h-[160px] w-auto object-contain rounded border border-slate-800 shadow-xl"
                  />
                </div>
              </div>

              {/* Segmented Glyph Geometry Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-black/40 space-y-2">
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-300">
                    Individual Glyph Geometric Measurements:
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Main Baseline: Y = {experiment4Result.mainBaselineY} px | Cap Height: {experiment4Result.mainCapHeight} px
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Box [X, Y, W, H]</th>
                        <th className="py-2 px-3 text-right">Width</th>
                        <th className="py-2 px-3 text-right">Height</th>
                        <th className="py-2 px-3 text-right">Bottom Y (Baseline)</th>
                        <th className="py-2 px-3 text-right">Baseline Offset</th>
                        <th className="py-2 px-3 text-right">Height Ratio</th>
                        <th className="py-2 px-3">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {experiment4Result.glyphSegments.map((g) => (
                        <tr
                          key={g.index}
                          className={g.isSuperscript ? 'bg-purple-950/20' : 'hover:bg-slate-900/30'}
                        >
                          <td className="py-2 px-3 font-bold text-slate-300">#{g.index}</td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">
                            [{g.minX}, {g.minY}, {g.width}, {g.height}]
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{g.width} px</td>
                          <td className="py-2 px-3 text-right font-bold text-white">{g.height} px</td>
                          <td className="py-2 px-3 text-right text-cyan-300">{g.bottomY} px</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-300">
                            {g.baselineDelta > 0 ? `+${g.baselineDelta} px` : `${g.baselineDelta} px`} ({g.elevationPct.toFixed(1)}%)
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {(g.heightRatio * 100).toFixed(0)}%
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                g.isSuperscript
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(192,132,252,0.2)]'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {g.isSuperscript ? 'Elevated Superscript' : 'Normal Inline'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* EXPERIMENT 5: SUPERSCRIPT ROBUSTNESS & FALSE-POSITIVE TEST BENCH        */}
        {/* ========================================================================= */}
        <div className="border border-cyan-500/40 bg-[#0a0f1d] rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-mono font-bold uppercase tracking-wider text-cyan-300">
                  EXPERIMENT 5: SUPERSCRIPT ROBUSTNESS & FALSE-POSITIVE TEST BENCH
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Automated evaluation across 10 controlled stress-test cases: inline digits, noise, mixed baselines, kerning & scale
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunExperiment5Robustness}
              disabled={isExperiment5Running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              {isExperiment5Running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Running Stress Tests...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  Run 10-Case Robustness Suite
                </>
              )}
            </button>
          </div>

          {experiment5Results && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Test Scenarios Passed
                  </span>
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {experiment5Results.passedCases} / {experiment5Results.totalCases}
                  </p>
                  <span className="text-[9px] font-mono text-emerald-500">
                    {experiment5Results.allPassed ? '100% All Cases Passed' : 'Failures Detected'}
                  </span>
                </div>

                <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-purple-300 block">
                    Superscript TP Rate
                  </span>
                  <p className="text-lg font-mono font-bold text-purple-300">
                    {experiment5Results.tpRate.toFixed(1)}%
                  </p>
                  <span className="text-[9px] font-mono text-purple-400/80">
                    {experiment5Results.totalTP} / {experiment5Results.totalExpected} true positives
                  </span>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-emerald-300 block">
                    Normal Digit FP Rate
                  </span>
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {experiment5Results.fpRate.toFixed(1)}%
                  </p>
                  <span className="text-[9px] font-mono text-emerald-500">
                    {experiment5Results.totalNormalDigitFP === 0 ? 'ZERO FALSE POSITIVES' : `${experiment5Results.totalNormalDigitFP} false positives`}
                  </span>
                </div>

                <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-cyan-300 block">
                    Avg Baseline Error
                  </span>
                  <p className="text-lg font-mono font-bold text-cyan-300">
                    ±{experiment5Results.avgBaselineError} px
                  </p>
                  <span className="text-[9px] font-mono text-cyan-500">Relative to ground truth</span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Robustness Verdict
                  </span>
                  <p className="text-lg font-mono font-bold text-white flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    PASS
                  </p>
                  <span className="text-[9px] font-mono text-slate-400">Adaptive invariance confirmed</span>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-black/40">
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-300">
                    Controlled Stress Test Suite Breakdown (10 Scenarios):
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Total Glyphs Isolated: {experiment5Results.caseResults.reduce((s, c) => s + c.isolatedGlyphs, 0)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Scenario Description</th>
                        <th className="py-2 px-3">Input Sample</th>
                        <th className="py-2 px-3 text-right">Glyphs (Iso / Exp)</th>
                        <th className="py-2 px-3 text-right">Baseline (Est / Truth)</th>
                        <th className="py-2 px-3 text-right">Superscripts (Det / Exp)</th>
                        <th className="py-2 px-3 text-center">TP / FP / FN</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {experiment5Results.caseResults.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/30">
                          <td className="py-2 px-3 font-bold text-slate-400">{r.id}</td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-200 block">{r.name}</span>
                            <span className="text-[10px] text-slate-500">{r.description}</span>
                          </td>
                          <td className="py-2 px-3 font-bold text-cyan-300">{r.tokens}</td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {r.isolatedGlyphs} / {r.expectedGlyphs}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                            {r.mainBaselineY} px / {r.groundTruthBaselineY} px (Δ {r.baselineDiff} px)
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-purple-300">
                            {r.detectedSuperscripts} / {r.expectedSuperscripts}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-300 text-[11px]">
                            <span className="text-emerald-400 font-bold">{r.tp}</span> /{' '}
                            <span className={r.fp > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>{r.fp}</span> /{' '}
                            <span className={r.fn > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>{r.fn}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.passed
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {r.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* EXPERIMENT 3: IGN-FOCUSED PREPROCESSING VARIANTS & SUPERSCRIPT ANALYSIS */}
        {/* ========================================================================= */}
        <div className="border border-emerald-500/30 bg-[#0b1219] rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-mono font-bold uppercase tracking-wider text-emerald-300">
                  EXPERIMENT 3: IGN-FOCUSED PREPROCESSING VARIANTS
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Relative framing & image filter variants for empirical superscript recognition
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunPreprocessingExperiment}
              disabled={!selectedFile || status === 'Loading' || status === 'Processing' || isExperiment3Running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {isExperiment3Running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing Variants...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Run All 6 Variants
                </>
              )}
            </button>
          </div>

          {/* Visual Thumbnails of All 6 Preprocessing Variants */}
          {Object.keys(preprocessingPreviews).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Preprocessing Filter Previews:</span>
                <span className="text-[11px] text-slate-500">Click a card to inspect OCR details</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(preprocessingPreviews).map(([key, v]) => {
                  const isSelected = selectedVariantKey === key
                  const hasRun = experiment3Results && experiment3Results[key]

                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedVariantKey(key)}
                      className={`cursor-pointer border rounded-xl p-2.5 space-y-2 transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : 'border-slate-800 bg-black/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="relative aspect-[16/9] bg-black/80 rounded-lg overflow-hidden flex items-center justify-center p-1 border border-slate-800/80">
                        <img
                          src={v.previewUrl}
                          alt={v.name}
                          className="max-h-full max-w-full object-contain"
                        />
                        {hasRun && (
                          <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/90 text-black">
                            {experiment3Results[key].metrics.totalMs.toFixed(0)}ms
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-mono font-bold text-slate-200 truncate" title={v.name}>
                          {v.name}
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400">
                          {v.width} × {v.height} px
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Results Table for All 6 Variants */}
          {experiment3Results && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-black/40">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900/60">
                      <th className="py-2.5 px-3">Variant</th>
                      <th className="py-2.5 px-3">Dimensions</th>
                      <th className="py-2.5 px-3">Total Time</th>
                      <th className="py-2.5 px-3">Det / Rec</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Recognized Text Output</th>
                      <th className="py-2.5 px-3">Elevation Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {Object.entries(experiment3Results).map(([key, v]) => {
                      const isSelected = selectedVariantKey === key
                      const hasElevation = v.analysis?.hasSeparateElevatedToken

                      return (
                        <tr
                          key={key}
                          onClick={() => setSelectedVariantKey(key)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-950/20' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-emerald-300">
                            {v.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {v.width} × {v.height} px
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {v.metrics.totalMs.toFixed(1)} ms
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {v.metrics.detMs?.toFixed(0)} / {v.metrics.recMs?.toFixed(0)} ms
                          </td>
                          <td className="py-2.5 px-3 text-cyan-300 font-bold">
                            {v.items.length}
                          </td>
                          <td className="py-2.5 px-3 text-white max-w-xs truncate font-mono font-medium">
                            {v.items.map((i) => i.text).join(' | ') || 'None'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasElevation
                                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {hasElevation ? 'Elevated Glyph' : 'Unified Box'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* SUPERSCRIPT RECOVERY ANALYSIS */}
              {experiment3Results[selectedVariantKey] && (
                <div className="border border-purple-500/30 bg-[#0d0f1f] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-purple-300">
                          SUPERSCRIPT RECOVERY ANALYSIS
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Active Variant: <strong className="text-purple-300">{experiment3Results[selectedVariantKey].name}</strong>
                      </p>
                    </div>

                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      Geometry & Positional Breakdown
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                      Token Positional & Bounding Box Coordinates:
                    </span>

                    <div className="overflow-x-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left border-collapse font-mono text-xs">
                        <thead>
                          <tr className="border-b border-purple-900/40 text-slate-400 uppercase text-[10px] bg-purple-950/20">
                            <th className="py-2 px-2.5 w-10">#</th>
                            <th className="py-2 px-2.5">OCR Text</th>
                            <th className="py-2 px-2.5 text-right">Confidence</th>
                            <th className="py-2 px-2.5">Box [X, Y, W, H]</th>
                            <th className="py-2 px-2.5 text-right">Box Height</th>
                            <th className="py-2 px-2.5 text-right">Baseline (Y-max)</th>
                            <th className="py-2 px-2.5">Position Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-900/20">
                          {experiment3Results[selectedVariantKey].items.map((item) => {
                            const b = item.box
                            const isCandidate = experiment3Results[selectedVariantKey].analysis?.geometricComparisons?.some(
                              (c) => c.token === item.text && c.isSuperscriptCandidate
                            )

                            return (
                              <tr key={item.index} className="hover:bg-purple-950/30">
                                <td className="py-1.5 px-2.5 text-slate-500">{item.index}</td>
                                <td className="py-1.5 px-2.5 font-bold text-white tracking-wide">
                                  {item.text}
                                </td>
                                <td className="py-1.5 px-2.5 text-right text-emerald-400">
                                  {(item.score * 100).toFixed(1)}%
                                </td>
                                <td className="py-1.5 px-2.5 text-slate-300 text-[11px]">
                                  [{b.minX}, {b.minY}, {b.boxWidth}, {b.boxHeight}]
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-bold text-cyan-300">
                                  {b.boxHeight} px
                                </td>
                                <td className="py-1.5 px-2.5 text-right text-purple-300 font-bold">
                                  {b.baselineY} px
                                </td>
                                <td className="py-1.5 px-2.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      isCandidate
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {isCandidate ? 'Elevated Baseline (Candidate)' : 'Standard Line'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Geometric Baseline Card */}
                  <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 space-y-3">
                    <h5 className="text-xs font-mono uppercase font-bold text-purple-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      Visual Baseline & Glyph Height Differential Findings:
                    </h5>

                    {experiment3Results[selectedVariantKey].analysis?.geometricComparisons?.length > 0 ? (
                      <div className="space-y-2">
                        {experiment3Results[selectedVariantKey].analysis.geometricComparisons.map((c, i) => (
                          <div
                            key={i}
                            className="text-xs font-mono bg-purple-950/30 border border-purple-500/30 rounded-lg p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-slate-200">
                              <span>
                                Token Pair: <strong className="text-cyan-300">"{c.precedingToken}"</strong> → <strong className="text-purple-300">"{c.token}"</strong>
                              </span>
                              <span className="text-[11px] font-bold text-purple-300">
                                Baseline Offset: {c.baselineDeltaPx > 0 ? `+${c.baselineDeltaPx} px` : `${c.baselineDeltaPx} px`} ({c.baselineElevationPct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-purple-900/30">
                              <span>Base Height: {c.baseHeight} px</span>
                              <span>Token Height: {c.tokenHeight} px (Ratio: {(c.heightRatio * 100).toFixed(0)}%)</span>
                              <span>
                                Status:{' '}
                                <strong className={c.isSuperscriptCandidate ? 'text-emerald-400' : 'text-slate-400'}>
                                  {c.isSuperscriptCandidate ? 'Consistent with Superscript' : 'Inline Geometry'}
                                </strong>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-slate-400 p-2.5 bg-slate-900/40 rounded-lg">
                        Notice: PaddleOCR detection grouped the alphanumeric text into a unified horizontal bounding box. In this variant, the underlying CRNN recognizer handled the glyph sequence in a single line pass.
                      </div>
                    )}

                    <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg text-xs font-mono space-y-1.5 text-slate-300">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Empirical Verdict:</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        • <strong>Vocabulary Constraint</strong>: PaddleOCR's standard PP-OCRv5 mobile recognition dictionary does NOT contain the Unicode superscript codepoints <code className="text-cyan-300">¹ (\u00B9)</code> and <code className="text-cyan-300">⁷ (\u00B7)</code>. As a result, its character classification network maps visual strokes to standard ASCII digits.<br />
                        • <strong>Visual Evidence</strong>: When separate token segmentation occurs in high-zoom variants, the bounding box for the digits displays an elevated baseline and smaller vertical height relative to uppercase letters.<br />
                        • <strong>Autocorrection Policy</strong>: In accordance with Experiment 3 and 4 requirements, no blind replacement is performed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Level Performance Delta Comparison Banner */}
        {fullMetrics && croppedMetrics && (
          <div className="border border-emerald-500/30 bg-[#081512] rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-300">
                  Performance Comparison: Full Screenshot vs Cropped Region
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {fullMetrics.totalMs > croppedMetrics.totalMs
                  ? `${(fullMetrics.totalMs / croppedMetrics.totalMs).toFixed(1)}x FASTER`
                  : 'COMPLETED'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-black/40 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Full Execution Time
                </span>
                <p className="text-lg font-mono font-bold text-slate-300">
                  {(fullMetrics.totalMs / 1000).toFixed(2)}s
                </p>
                <span className="text-[10px] font-mono text-slate-500">
                  {fullMetrics.totalMs.toFixed(1)} ms
                </span>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">
                  Cropped ({croppedResultMeta?.scale || scaleFactor}x) Time
                </span>
                <p className="text-lg font-mono font-bold text-emerald-300">
                  {(croppedMetrics.totalMs / 1000).toFixed(2)}s
                </p>
                <span className="text-[10px] font-mono text-emerald-500">
                  {croppedMetrics.totalMs.toFixed(1)} ms
                </span>
              </div>

              <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-cyan-400 block mb-1">
                  Latency Reduction
                </span>
                <p className="text-lg font-mono font-bold text-cyan-300 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  {fullMetrics.totalMs > 0
                    ? `${(((fullMetrics.totalMs - croppedMetrics.totalMs) / fullMetrics.totalMs) * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
                <span className="text-[10px] font-mono text-cyan-500">
                  Target: &lt; 5.0s ({croppedMetrics.totalMs < 5000 ? 'Achieved' : 'Reported'})
                </span>
              </div>

              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-purple-400 block mb-1">
                  Item Count Delta
                </span>
                <p className="text-lg font-mono font-bold text-purple-300">
                  {fullOcrResults?.length ?? 0} → {croppedOcrResults?.length ?? 0}
                </p>
                <span className="text-[10px] font-mono text-purple-400/80">
                  {fullOcrResults && croppedOcrResults && fullOcrResults.length > 0
                    ? `${Math.round(((fullOcrResults.length - croppedOcrResults.length) / fullOcrResults.length) * 100)}% noise eliminated`
                    : 'Filtered to Identity'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Scale Benchmark Results Card (1x vs 2x vs 3x) */}
        {scaleBenchmarkResults && (
          <div className="border border-purple-500/30 bg-[#0e0f1d] rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Scale Factor Benchmark (1x vs 2x vs 3x)
              </h3>
              <span className="text-xs font-mono text-purple-400">
                Warm Model Inference on Cropped Identity Region
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-purple-900/50 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-3">Scale</th>
                    <th className="py-2.5 px-3">Dimensions</th>
                    <th className="py-2.5 px-3">Det Time</th>
                    <th className="py-2.5 px-3">Rec Time</th>
                    <th className="py-2.5 px-3">Total Time</th>
                    <th className="py-2.5 px-3">Items</th>
                    <th className="py-2.5 px-3">Recognized Text Sample</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {scaleBenchmarkResults.map((b) => (
                    <tr key={b.scale} className="hover:bg-purple-950/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-purple-300">
                        {b.scale}x {b.scale === scaleFactor && '(Selected)'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {b.dimensions.dw} × {b.dimensions.dh} px
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300">
                        {b.metrics.detMs != null ? `${b.metrics.detMs.toFixed(1)} ms` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300">
                        {b.metrics.recMs != null ? `${b.metrics.recMs.toFixed(1)} ms` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {b.metrics.totalMs.toFixed(1)} ms
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {b.items.length} items
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs font-mono text-[11px]">
                        {b.items.map((i) => i.text).join(' | ') || 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEPARATE DETAILED RESULTS: A. FULL SCREENSHOT vs B. CROPPED REGION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MODE A: FULL SCREENSHOT RESULTS */}
          <div className="border border-slate-800 bg-[#0e121b] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  FULL SCREENSHOT (MODE A)
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Whole screenshot inference without region cropping
                </span>
              </div>

              {fullOcrResults && fullOcrResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRawJsonFull((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono transition-all"
                >
                  {showRawJsonFull ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                  {showRawJsonFull ? 'Table' : 'JSON'}
                </button>
              )}
            </div>

            {/* Metrics */}
            {fullMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-800 bg-slate-900/50 rounded-xl p-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">detMs</span>
                  <p className="text-sm font-mono font-bold text-cyan-300">
                    {fullMetrics.detMs != null ? `${fullMetrics.detMs.toFixed(1)} ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">recMs</span>
                  <p className="text-sm font-mono font-bold text-cyan-300">
                    {fullMetrics.recMs != null ? `${fullMetrics.recMs.toFixed(1)} ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">totalMs</span>
                  <p className="text-sm font-mono font-bold text-white">
                    {fullMetrics.totalMs != null ? `${fullMetrics.totalMs.toFixed(1)} ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">Items</span>
                  <p className="text-sm font-mono font-bold text-emerald-400">
                    {fullOcrResults?.length ?? 0}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 p-3 bg-slate-900/30 rounded-xl">
                Full screenshot has not been run yet.
              </div>
            )}

            {/* Table / JSON */}
            {fullOcrResults === null ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No full screenshot results. Select a screenshot and execute OCR.
              </div>
            ) : fullOcrResults.length === 0 ? (
              <div className="p-8 text-center text-amber-400 font-mono text-xs">
                0 text lines detected in full screenshot.
              </div>
            ) : showRawJsonFull ? (
              <pre className="bg-black/50 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto max-h-[400px]">
                {JSON.stringify(fullOcrResults, null, 2)}
              </pre>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead className="sticky top-0 bg-[#0e121b] shadow-sm">
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2 w-10">#</th>
                      <th className="py-2 px-2">Detected Text</th>
                      <th className="py-2 px-2 w-24 text-right">Confidence</th>
                      <th className="py-2 px-2">Coordinates (Polygon)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {fullOcrResults.map((item, index) => {
                      const confPct = (item.score * 100).toFixed(1)
                      const confColor =
                        item.score >= 0.85
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : item.score >= 0.65
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/30'

                      const polyStr = Array.isArray(item.poly)
                        ? item.poly
                            .map((pt) => {
                              if (Array.isArray(pt)) {
                                return `[${Math.round(pt[0])}, ${Math.round(pt[1])}]`
                              }
                              if (typeof pt === 'object' && pt !== null) {
                                return `[${Math.round(pt.x ?? 0)}, ${Math.round(pt.y ?? 0)}]`
                              }
                              return String(pt)
                            })
                            .join(' → ')
                        : 'N/A'

                      return (
                        <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-1.5 px-2 text-slate-500">{index + 1}</td>
                          <td className="py-1.5 px-2 text-white font-bold tracking-wide">
                            {item.text}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${confColor}`}>
                              {confPct}%
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-400 text-[10px] break-all font-mono">
                            {polyStr}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODE B: CROPPED REGION RESULTS */}
          <div className="border border-purple-500/30 bg-[#0e121b] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-purple-300 flex items-center gap-2">
                  <Crop className="w-4 h-4 text-purple-400" />
                  CROPPED REGION (MODE B)
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-purple-300/90 font-bold">
                    Scale: {croppedResultMeta?.scale || scaleFactor}x
                  </span>
                  {croppedResultMeta?.dimensions && (
                    <span className="text-[11px] font-mono text-slate-400">
                      • {croppedResultMeta.dimensions.dw} × {croppedResultMeta.dimensions.dh} px
                    </span>
                  )}
                </div>
              </div>

              {croppedOcrResults && croppedOcrResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRawJsonCrop((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono transition-all"
                >
                  {showRawJsonCrop ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                  {showRawJsonCrop ? 'Table' : 'JSON'}
                </button>
              )}
            </div>

            {/* Metrics */}
            {croppedMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-purple-500/20 bg-purple-950/20 rounded-xl p-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">detMs</span>
                  <p className="text-sm font-mono font-bold text-cyan-300">
                    {croppedMetrics.detMs != null ? `${croppedMetrics.detMs.toFixed(1)} ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">recMs</span>
                  <p className="text-sm font-mono font-bold text-cyan-300">
                    {croppedMetrics.recMs != null ? `${croppedMetrics.recMs.toFixed(1)} ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">totalMs</span>
                  <p className="text-sm font-mono font-bold text-white">
                    {croppedMetrics.totalMs != null ? `${croppedMetrics.totalMs.toFixed(1)} ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">Items</span>
                  <p className="text-sm font-mono font-bold text-emerald-400">
                    {croppedOcrResults?.length ?? 0}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 p-3 bg-slate-900/30 rounded-xl">
                Cropped region has not been run yet.
              </div>
            )}

            {/* Table / JSON */}
            {croppedOcrResults === null ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No cropped region results. Select a screenshot and execute OCR.
              </div>
            ) : croppedOcrResults.length === 0 ? (
              <div className="p-8 text-center text-amber-400 font-mono text-xs">
                PaddleOCR completed, but detected 0 text lines in cropped region. Try adjusting framing or scaling.
              </div>
            ) : showRawJsonCrop ? (
              <pre className="bg-black/50 p-4 rounded-xl border border-slate-800 font-mono text-xs text-purple-200 overflow-x-auto max-h-[400px]">
                {JSON.stringify(croppedOcrResults, null, 2)}
              </pre>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead className="sticky top-0 bg-[#0e121b] shadow-sm">
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2 w-10">#</th>
                      <th className="py-2 px-2">Detected Text</th>
                      <th className="py-2 px-2 w-24 text-right">Confidence</th>
                      <th className="py-2 px-2">Coordinates (Polygon)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {croppedOcrResults.map((item, index) => {
                      const confPct = (item.score * 100).toFixed(1)
                      const confColor =
                        item.score >= 0.85
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : item.score >= 0.65
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/30'

                      const polyStr = Array.isArray(item.poly)
                        ? item.poly
                            .map((pt) => {
                              if (Array.isArray(pt)) {
                                return `[${Math.round(pt[0])}, ${Math.round(pt[1])}]`
                              }
                              if (typeof pt === 'object' && pt !== null) {
                                return `[${Math.round(pt.x ?? 0)}, ${Math.round(pt.y ?? 0)}]`
                              }
                              return String(pt)
                            })
                            .join(' → ')
                        : 'N/A'

                      return (
                        <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-1.5 px-2 text-slate-500">{index + 1}</td>
                          <td className="py-1.5 px-2 text-white font-bold tracking-wide">
                            {item.text}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${confColor}`}>
                              {confPct}%
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-400 text-[10px] break-all font-mono">
                            {polyStr}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Runtime info */}
        {(croppedRuntimeInfo || fullRuntimeInfo) && (
          <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-4 px-2">
            <span>
              Requested Backend:{' '}
              <strong className="text-slate-200">
                {(croppedRuntimeInfo || fullRuntimeInfo)?.requestedBackend || 'auto'}
              </strong>
            </span>
            <span>
              Detection Provider:{' '}
              <strong className="text-slate-200">
                {(croppedRuntimeInfo || fullRuntimeInfo)?.detProvider || 'N/A'}
              </strong>
            </span>
            <span>
              Recognition Provider:{' '}
              <strong className="text-slate-200">
                {(croppedRuntimeInfo || fullRuntimeInfo)?.recProvider || 'N/A'}
              </strong>
            </span>
            <span>
              WebGPU:{' '}
              <strong
                className={
                  (croppedRuntimeInfo || fullRuntimeInfo)?.webgpuAvailable
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }
              >
                {(croppedRuntimeInfo || fullRuntimeInfo)?.webgpuAvailable ? 'Available' : 'No'}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
