import { useState, useRef } from 'react'
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
  Code
} from 'lucide-react'

export default function PaddleOcrTestPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('Idle') // 'Idle' | 'Loading' | 'Processing' | 'Complete' | 'Error'
  const [statusDetail, setStatusDetail] = useState('')
  const [ocrResults, setOcrResults] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [runtimeInfo, setRuntimeInfo] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [selectedLang, setSelectedLang] = useState('ch') // 'ch' includes English + Chinese; 'en' is English
  const [useWorker, setUseWorker] = useState(false)

  const fileInputRef = useRef(null)
  const ocrInstanceRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setErrorMessage(null)
    setOcrResults(null)
    setMetrics(null)
    setRuntimeInfo(null)
    setStatus('Idle')
    setStatusDetail('')

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleRunPaddleOcr = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a screenshot first.')
      return
    }

    setErrorMessage(null)
    setOcrResults(null)
    setMetrics(null)
    setRuntimeInfo(null)

    try {
      setStatus('Loading')
      setStatusDetail('Loading @paddleocr/paddleocr-js and ONNX runtime...')

      // Dynamically import PaddleOCR to preserve isolated code-splitting
      const { PaddleOCR } = await import('@paddleocr/paddleocr-js')

      setStatusDetail(`Initializing PaddleOCR pipeline (lang: "${selectedLang}", worker: ${useWorker})...`)

      const ocrOptions = {
        lang: selectedLang,
        ocrVersion: 'PP-OCRv5',
      }

      if (useWorker) {
        ocrOptions.worker = true
      }

      const ocr = await PaddleOCR.create(ocrOptions)
      ocrInstanceRef.current = ocr

      setStatus('Processing')
      setStatusDetail('Running text detection and recognition on image...')

      const startTime = performance.now()
      const results = await ocr.predict(selectedFile)
      const elapsedTotalMs = performance.now() - startTime

      if (!results || results.length === 0) {
        throw new Error('PaddleOCR returned empty results array.')
      }

      const primaryResult = results[0]
      setOcrResults(primaryResult.items || [])

      setMetrics({
        detMs: primaryResult.metrics?.detMs ?? null,
        recMs: primaryResult.metrics?.recMs ?? null,
        totalMs: primaryResult.metrics?.totalMs ?? elapsedTotalMs,
        detectedBoxes: primaryResult.metrics?.detectedBoxes ?? primaryResult.items?.length ?? 0,
        recognizedCount: primaryResult.metrics?.recognizedCount ?? primaryResult.items?.length ?? 0,
      })

      setRuntimeInfo(primaryResult.runtime || null)
      setStatus('Complete')
      setStatusDetail('OCR completed successfully.')
    } catch (err) {
      console.error('[PaddleOCR Test] Error:', err)
      setStatus('Error')
      setStatusDetail('')
      setErrorMessage(
        err.message || 'PaddleOCR execution failed. Inspect browser console for full traceback.'
      )
    }
  }

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    setStatus('Idle')
    setStatusDetail('')
    setOcrResults(null)
    setMetrics(null)
    setRuntimeInfo(null)
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
      <div className="max-w-5xl mx-auto space-y-6">
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
                  <h1 className="text-2xl font-black tracking-wider uppercase font-heading bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                    PADDLE OCR TEST
                  </h1>
                  <p className="text-xs font-mono text-slate-400">
                    Isolated Browser Proof of Concept (@paddleocr/paddleocr-js)
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

        {/* Configuration & Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <span className="text-[11px] text-slate-500 mt-2">
              Model: PP-OCRv5 mobile det + rec
            </span>
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
            <span className="text-[11px] text-slate-500 mt-2">
              Unchecked runs on main thread (safest baseline)
            </span>
          </div>

          <div className="border border-slate-800 bg-[#0e121b] rounded-xl p-4 flex flex-col justify-between">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block">
              Actions
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRunPaddleOcr}
                disabled={!selectedFile || status === 'Loading' || status === 'Processing'}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,242,255,0.25)]"
              >
                {status === 'Loading' || status === 'Processing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    RUNNING...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    RUN PADDLE OCR
                  </>
                )}
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
            {statusDetail && (
              <span className="text-[11px] font-mono text-cyan-400 mt-2 truncate" title={statusDetail}>
                {statusDetail}
              </span>
            )}
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

        {/* Screenshot Upload & Preview */}
        <div className="border border-slate-800 bg-[#0e121b] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Screenshot Selection & Preview
            </h2>
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
          </div>

          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-black/40 max-h-[420px] flex items-center justify-center p-2">
                <img
                  src={previewUrl}
                  alt="Free Fire Profile Screenshot Preview"
                  className="max-h-[400px] w-auto object-contain rounded-lg shadow-lg"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>File: {selectedFile?.name}</span>
                <span>Size: {(selectedFile?.size / 1024).toFixed(1)} KB</span>
              </div>
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
                PNG, JPG, JPEG, or WEBP supported
              </p>
            </div>
          )}
        </div>

        {/* Metrics Banner */}
        {metrics && (
          <div className="border border-cyan-500/20 bg-[#0b0e14] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Detection Time
              </span>
              <p className="text-lg font-mono font-bold text-cyan-300">
                {metrics.detMs != null ? `${metrics.detMs.toFixed(1)} ms` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Recognition Time
              </span>
              <p className="text-lg font-mono font-bold text-cyan-300">
                {metrics.recMs != null ? `${metrics.recMs.toFixed(1)} ms` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                Total Time
              </span>
              <p className="text-lg font-mono font-bold text-white">
                {metrics.totalMs != null ? `${metrics.totalMs.toFixed(1)} ms` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                Recognized Items
              </span>
              <p className="text-lg font-mono font-bold text-emerald-400">
                {ocrResults?.length ?? 0} items
              </p>
            </div>
          </div>
        )}

        {/* Runtime info */}
        {runtimeInfo && (
          <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-4 px-2">
            <span>Requested Backend: <strong className="text-slate-200">{runtimeInfo.requestedBackend || 'auto'}</strong></span>
            <span>Detection Provider: <strong className="text-slate-200">{runtimeInfo.detProvider || 'N/A'}</strong></span>
            <span>Recognition Provider: <strong className="text-slate-200">{runtimeInfo.recProvider || 'N/A'}</strong></span>
            <span>WebGPU: <strong className={runtimeInfo.webgpuAvailable ? 'text-emerald-400' : 'text-slate-500'}>{runtimeInfo.webgpuAvailable ? 'Available' : 'No'}</strong></span>
          </div>
        )}

        {/* OCR Results Section */}
        <div className="border border-slate-800 bg-[#0e121b] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                OCR RESULTS
              </h2>
              {ocrResults && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {ocrResults.length} text blocks detected
                </span>
              )}
            </div>

            {ocrResults && ocrResults.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRawJson((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono transition-all"
              >
                {showRawJson ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                {showRawJson ? 'Formatted View' : 'Raw JSON'}
              </button>
            )}
          </div>

          {/* Results List */}
          {ocrResults === null ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No OCR results yet. Select a screenshot and click [ RUN PADDLE OCR ].
            </div>
          ) : ocrResults.length === 0 ? (
            <div className="p-8 text-center text-amber-400/80 font-mono text-xs">
              PaddleOCR completed, but detected 0 text lines.
            </div>
          ) : showRawJson ? (
            <pre className="bg-black/50 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto max-h-[500px]">
              {JSON.stringify(ocrResults, null, 2)}
            </pre>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3">Detected Text</th>
                    <th className="py-2.5 px-3 w-28 text-right">Confidence</th>
                    <th className="py-2.5 px-3">Coordinates (Polygon)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ocrResults.map((item, index) => {
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
                        <td className="py-2 px-3 text-slate-500">{index + 1}</td>
                        <td className="py-2 px-3 text-white font-bold tracking-wide">
                          {item.text}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono border ${confColor}`}
                          >
                            {confPct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px] break-all font-mono">
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
    </div>
  )
}
