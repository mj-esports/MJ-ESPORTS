import { useState, useRef, useEffect, useCallback } from 'react'
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
  Trash2
} from 'lucide-react'

// Free Fire MAX Profile Layout Presets (Normalized coordinates 0.0 - 1.0)
// Derived from standard Free Fire MAX Profile Screen layouts (where Player Card is in the upper-left)
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

export default function PaddleOcrTestPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imageMeta, setImageMeta] = useState(null) // { naturalWidth, naturalHeight, aspectRatio }

  // Pipeline configuration
  const [selectedLang, setSelectedLang] = useState('ch') // 'ch' includes English + Chinese; 'en' is English
  const [useWorker, setUseWorker] = useState(false)
  const [isModelWarm, setIsModelWarm] = useState(false)
  const [activeTab, setActiveTab] = useState('both') // 'both' | 'full' | 'cropped' | 'benchmark'

  // Cropping settings
  const [selectedPresetKey, setSelectedPresetKey] = useState('standard_ff_max')
  const [cropBox, setCropBox] = useState(CROP_PRESETS.standard_ff_max.box)
  const [scaleFactor, setScaleFactor] = useState(2) // 1x, 2x, 3x
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null)
  const [cropDimensions, setCropDimensions] = useState(null) // { sw, sh, dw, dh, scale }

  // Overall status (for backwards compatibility with test suite 11)
  const [status, setStatus] = useState('Idle') // 'Idle' | 'Loading' | 'Processing' | 'Complete' | 'Error'
  const [statusDetail, setStatusDetail] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)

  // Full screenshot results
  const [fullOcrResults, setFullOcrResults] = useState(null)
  const [fullMetrics, setFullMetrics] = useState(null)
  const [fullRuntimeInfo, setFullRuntimeInfo] = useState(null)

  // Cropped region results
  const [croppedOcrResults, setCroppedOcrResults] = useState(null)
  const [croppedMetrics, setCroppedMetrics] = useState(null)
  const [croppedRuntimeInfo, setCroppedRuntimeInfo] = useState(null)
  const [croppedResultMeta, setCroppedResultMeta] = useState(null) // { scale, dimensions }

  // Multi-scale benchmark results (1x vs 2x vs 3x)
  const [scaleBenchmarkResults, setScaleBenchmarkResults] = useState(null)
  const [isBenchmarkingScales, setIsBenchmarkingScales] = useState(false)

  // Raw JSON display toggle
  const [showRawJsonFull, setShowRawJsonFull] = useState(false)
  const [showRawJsonCrop, setShowRawJsonCrop] = useState(false)

  // Refs
  const fileInputRef = useRef(null)
  const hiddenImgRef = useRef(null)
  const ocrInstanceRef = useRef(null)
  const activeConfigKeyRef = useRef(null)

  // Singleton model instance loader to prevent repeated downloading and re-initialization
  const getOrInitOcrPipeline = useCallback(async (lang, worker) => {
    const configKey = `${lang}_${worker}`

    // Reuse existing pipeline if config hasn't changed (Warm start)
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

  // Generate cropped canvas and preview
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

  // Refresh cropped preview when image, box, or scale changes
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
  }, [cropBox, scaleFactor, generateCroppedCanvas])

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
    setStatus('Idle')
    setStatusDetail('')

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  // Handle hidden image load to get true dimensions
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

    // If square or portrait, suggest square preset
    if (ratio < 1.3 && selectedPresetKey === 'standard_ff_max') {
      setSelectedPresetKey('square_profile')
      setCropBox(CROP_PRESETS.square_profile.box)
    }

    updateCropPreview()
  }

  // Preset selection handler
  const handlePresetChange = (presetKey) => {
    setSelectedPresetKey(presetKey)
    if (CROP_PRESETS[presetKey]) {
      setCropBox({ ...CROP_PRESETS[presetKey].box })
    }
  }

  // Custom coordinate change handler
  const handleCoordChange = (field, val) => {
    setSelectedPresetKey('custom')
    setCropBox((prev) => ({
      ...prev,
      [field]: Math.max(0, Math.min(1, parseFloat(val) || 0))
    }))
  }

  // Execute OCR on a specific input source (File or Canvas/Blob)
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

    // Convert canvas to blob for optimal and cross-worker transfer
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
  // Required by test suite #10 and user workflow
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
      } else {
        // Default 'both' (Full + Cropped Comparison)
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

      // Also populate the active cropped result with the currently selected scaleFactor or 2x
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

  // Quick sample loader for automated and user testing
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
    setErrorMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Combined metrics for backward-compatibility with test suite 12
  const activeMetrics = croppedMetrics || fullMetrics

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
      {/* Hidden image element used for canvas operations */}
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-wider uppercase font-heading bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                      PADDLE OCR TEST
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      EXPERIMENT 2: IDENTITY REGION CROPPING
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Isolated Browser Proof of Concept (@paddleocr/paddleocr-js) — Full vs Cropped Performance Benchmark
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
              {scaleFactor === 1 ? '1x: Native crop' : scaleFactor === 2 ? '2x: Supersampled (Best for small text)' : '3x: High resolution'}
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

        {/* Screenshot Selection & Crop Configuration */}
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
              {/* Crop Controls */}
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

              {/* Side-by-Side Visual Previews: Full with Bounding Box Overlay & Cropped Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Full Screenshot with Crop Overlay */}
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
                      {/* Bounding box highlight representing the cropped identity region */}
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

                {/* 2. Cropped Identity Card Preview */}
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
                    { key: 'benchmark', label: 'Scale Test (1x, 2x, 3x)' }
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

                <div className="flex items-center gap-2">
                  {/* Primary RUN button fulfilling test suite #10 */}
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
                PNG, JPG, JPEG, or WEBP supported — Evaluates Full Screenshot vs Cropped Identity Region
              </p>
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
          {/* ========================================================= */}
          {/* MODE A: FULL SCREENSHOT RESULTS                           */}
          {/* ========================================================= */}
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

          {/* ========================================================= */}
          {/* MODE B: CROPPED REGION RESULTS                            */}
          {/* ========================================================= */}
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
