import { useState, useEffect, useMemo } from 'react'
import {
  ScanLine,
  Upload,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileSpreadsheet,
  Eye,
  Shield,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Cpu,
  UserCheck,
  AlertCircle,
  FileImage,
  SlidersHorizontal,
  ChevronDown,
  Hash,
  Copy,
  ZoomIn,
  Play,
  Edit3,
  Save,
  CheckSquare,
  FileText
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import AdminStatusBadge from '../AdminStatusBadge'
import { createOcrJob, listOcrJobs } from '../../../services/ocrJobService.js'
import { validateScoreboardImage, calculateImageSha256, calculateImagePHash } from '../../../utils/imageHashUtils.js'
import { processOcrJob, getJobExtractions, saveManualScoreboardRows } from '../../../services/ocrExtractionService.js'

export default function OcrScoreboardConsoleView({ tournaments = [], setActiveTab }) {
  const { showSuccess, showError, showInfo } = useToast()

  // Selected tournament
  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || '')
  const selectedTourney = tournaments.find((t) => String(t.id) === String(selectedTourneyId)) || tournaments[0]

  // Active Sub-Tab: 'dashboard' | 'upload' | 'queue' | 'review' | 'manual' | 'history'
  const [activeSubTab, setActiveSubTab] = useState('dashboard')

  // Target Match Reference
  const [selectedMatch, setSelectedMatch] = useState('MATCH_001')
  const [selectedGameMode, setSelectedGameMode] = useState(selectedTourney?.format || 'Squad')
  const [selectedMap, setSelectedMap] = useState('Bermuda')

  // Upload Staging State
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('')
  const [uploadSha256, setUploadSha256] = useState('')
  const [uploadPhash, setUploadPhash] = useState('')
  const [uploadDimensions, setUploadDimensions] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  // Live OCR Ingested Jobs
  const [ocrJobs, setOcrJobs] = useState([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)

  // Active Selected Job for Review / Extraction
  const [activeJob, setActiveJob] = useState(null)
  const [candidateRows, setCandidateRows] = useState([])
  const [rawObservations, setRawObservations] = useState([])
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const [processingProgress, setProcessingProgress] = useState('')

  // Manual Entry Form State (12 Rows)
  const [manualRows, setManualRows] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      rank: i + 1,
      rawName: '',
      rawKills: 0,
      rawDamage: 0,
    }))
  )
  const [isSavingManual, setIsSavingManual] = useState(false)

  // Screenshot Zoom Modal
  const [zoomJob, setZoomJob] = useState(null)
  const [showRawTokens, setShowRawTokens] = useState(false)

  // Load Ingested Jobs on Mount / Tournament Change
  const fetchJobs = async () => {
    setIsLoadingJobs(true)
    try {
      const liveJobs = await listOcrJobs({ tournamentId: selectedTourneyId })
      if (liveJobs && liveJobs.length > 0) {
        setOcrJobs(liveJobs)
      } else {
        // Fallback initial queue items
        setOcrJobs([
          {
            id: 'job-ff-001',
            tournament_id: selectedTourneyId,
            match_id: 'MATCH_001',
            game_mode: 'Squad',
            map_name: 'Bermuda',
            status: 'QUEUED',
            original_filename: 'scoreboard_round1_top.png',
            storage_path: `${selectedTourneyId}/MATCH_001/job-ff-001/original.png`,
            mime_type: 'image/png',
            file_size: 1420500,
            file_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            file_phash: '8a9c12b4e5f03d71',
            is_duplicate: false,
            is_perceptual_duplicate: false,
            signedUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          }
        ])
      }
    } catch (err) {
      console.warn('[OCR Console] Fetch jobs notice:', err)
    } finally {
      setIsLoadingJobs(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [selectedTourneyId])

  // Handle File Selection with Real-Time Validation and Hashing
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setDuplicateWarning(null)
    setUploadFile(file)

    const validation = await validateScoreboardImage(file)
    if (!validation.valid) {
      setUploadError(validation.error)
      return
    }
    if (validation.dimensions) {
      setUploadDimensions(validation.dimensions)
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result
      setUploadPreviewUrl(dataUrl)

      try {
        const sha = await calculateImageSha256(file)
        const phash = await calculateImagePHash(file)
        setUploadSha256(sha)
        setUploadPhash(phash)
      } catch (hashErr) {
        console.warn('[Image Hash Error]:', hashErr)
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Submit OCR Job
  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadError('Please select a scoreboard screenshot.')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setDuplicateWarning(null)

    try {
      const result = await createOcrJob(uploadFile, {
        tournamentId: selectedTourneyId,
        matchId: selectedMatch,
        gameMode: selectedGameMode,
        mapName: selectedMap,
        fallbackDataUrl: uploadPreviewUrl,
      })

      if (result.isDuplicate) {
        setDuplicateWarning({
          type: 'EXACT_DUPLICATE',
          message: result.message,
          job: result.existingJob,
        })
        showError('Exact duplicate screenshot detected. Redundant job blocked.', 'Duplicate Ignored')
        setIsUploading(false)
        return
      }

      if (result.isPerceptualDuplicate) {
        showInfo('Scoreboard uploaded. Note: Flagged as possible visual duplicate of existing screenshot.', 'Perceptual Duplicate Flagged')
      } else {
        showSuccess(`Scoreboard screenshot ingested into Processing Queue (Status: QUEUED).`, 'Job Created')
      }

      setOcrJobs((prev) => [result.job, ...prev])
      setUploadFile(null)
      setUploadPreviewUrl('')
      setUploadSha256('')
      setUploadPhash('')
      setActiveSubTab('queue')
    } catch (err) {
      console.error('[Upload Submit Error]:', err)
      setUploadError(err.message || 'Failed to submit scoreboard for intake.')
      showError(err.message || 'Upload failed', 'Intake Error')
    } finally {
      setIsUploading(false)
    }
  }

  // Trigger OCR Extraction Pipeline on a Staged Job
  const handleExecuteOcr = async (job) => {
    if (!job) return

    setActiveJob(job)
    setIsProcessingOcr(true)
    setProcessingProgress('1/4 Generating multi-pass preprocessing filters...')

    try {
      // Simulate step progression visually
      setTimeout(() => setProcessingProgress('2/4 Executing OCR token extraction on variants...'), 350)
      setTimeout(() => setProcessingProgress('3/4 Detecting Free Fire scoreboard region bounding boxes...'), 700)
      setTimeout(() => setProcessingProgress('4/4 Parsing structured candidate rows & computing confidence...'), 1000)

      const result = await processOcrJob(job.id, {
        fallbackImageUrl: job.signedUrl,
      })

      if (result.success) {
        setCandidateRows(result.extractedRows)
        setRawObservations(result.rawObservations)

        // Update local jobs status
        setOcrJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: result.status } : j))
        )

        if (result.status === 'REQUIRES_MANUAL_ENTRY') {
          showError('OCR text unreadable or degraded. Transitioned to Manual Entry queue.', 'Manual Entry Required')
          setActiveSubTab('manual')
        } else {
          showSuccess(`OCR extraction complete: ${result.extractedRows.length} candidate rows parsed.`, 'Staged for Review')
          setActiveSubTab('review')
        }
      } else {
        showError(result.failureReason || 'OCR processing failed.', 'Extraction Error')
      }
    } catch (err) {
      console.error('[Execute OCR Error]:', err)
      showError(err.message || 'OCR processing failed.', 'Pipeline Error')
    } finally {
      setIsProcessingOcr(false)
      setProcessingProgress('')
    }
  }

  // Handle Manual Row Change
  const handleManualRowChange = (index, field, value) => {
    setManualRows((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Save Manual Scoreboard Entries
  const handleSaveManualRows = async () => {
    const targetJobId = activeJob?.id || ocrJobs[0]?.id
    if (!targetJobId) {
      showError('Please select a job first.', 'No Job Selected')
      return
    }

    setIsSavingManual(true)
    try {
      await saveManualScoreboardRows(targetJobId, manualRows)
      showSuccess('Manual scoreboard rows saved and staged for review.', 'Rows Staged')
      
      // Update candidate rows state
      setCandidateRows(
        manualRows.map((r, i) => ({
          rowIndex: i,
          rank: r.rank,
          rawName: r.rawName,
          rawKills: r.rawKills,
          rawDamage: r.rawDamage,
          overallConfidence: 100,
          extractionStatus: 'EXTRACTED',
          multiPassObservations: [],
          uncertainties: [],
        }))
      )
      setActiveSubTab('review')
    } catch (err) {
      showError(err.message || 'Failed to save manual rows.', 'Save Error')
    } finally {
      setIsSavingManual(false)
    }
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    const queuedCount = ocrJobs.filter((j) => j.status === 'QUEUED').length
    const processingCount = ocrJobs.filter((j) => j.status === 'PROCESSING').length
    const awaitingReviewCount = ocrJobs.filter((j) => j.status === 'AWAITING_REVIEW').length
    const manualCount = ocrJobs.filter((j) => j.status === 'REQUIRES_MANUAL_ENTRY' || j.status === 'FAILED').length
    const completedCount = ocrJobs.filter((j) => j.status === 'COMPLETED').length

    return {
      totalJobs: ocrJobs.length,
      queued: queuedCount,
      processing: processingCount,
      awaitingReview: awaitingReviewCount,
      requiresManual: manualCount,
      completed: completedCount,
    }
  }, [ocrJobs])

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* TOP HEADER: OCR CONSOLE & ARCHITECTURAL SEPARATION BANNER */}
      <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-wider">
                  OCR / Scoreboard Console
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] uppercase">
                  Phase 3B: Extraction Engine Active
                </span>
              </div>
              <p className="text-xs text-[#849495] font-body">
                Multi-Pass Image Preprocessing, Scoreboard Layout Segmentation & Structured Candidate Row Parsing
              </p>
            </div>
          </div>

          {/* Tournament Selection Dropdown */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[#849495] font-bold uppercase shrink-0">Tournament:</span>
            <select
              value={selectedTourneyId}
              onChange={(e) => setSelectedTourneyId(e.target.value)}
              className="bg-[#07090c] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none transition-all cursor-pointer min-w-[220px]"
            >
              {tournaments.map((t) => (
                <option key={`ocr-tourney-opt-${t.id}`} value={t.id}>
                  {t.title || t.name} ({t.format || 'Squad'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DATA INTEGRITY & ISOLATION ALERT */}
        <div className="p-3.5 bg-[#00f2ff]/5 border border-[#00f2ff]/20 rounded-lg flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-[#00f2ff] block uppercase tracking-wider text-[11px]">
              Authoritative Results Boundary Enforced (Zero Direct Standings Mutations)
            </span>
            <p className="text-[#849495] leading-relaxed">
              OCR extractions remain staging candidates. Exact Unicode strings (e.g. <code className="text-[#00ff9d]">KA¹⁷ Mjᶠᶠ</code>) are preserved verbatim. Standings and prize payouts are finalized exclusively inside <button onClick={() => setActiveTab && setActiveTab('results')} className="text-[#00f2ff] underline font-bold hover:text-white cursor-pointer">Match Results Workspace</button>.
            </p>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-[#27272a]">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Layers, badge: null },
            { id: 'upload', label: 'Upload Scoreboard', icon: Upload, badge: null },
            { id: 'queue', label: 'Processing Queue', icon: Clock, badge: metrics.queued, badgeColor: 'bg-[#00f2ff] text-black font-black' },
            { id: 'review', label: 'Review & Verify', icon: CheckSquare, badge: candidateRows.length, badgeColor: 'bg-[#10b981] text-black font-black' },
            { id: 'manual', label: 'Manual Entry', icon: Edit3, badge: metrics.requiresManual, badgeColor: 'bg-[#ff4655] text-white font-bold' },
            { id: 'history', label: 'OCR History', icon: History, badge: ocrJobs.length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={`ocr-tab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg font-headline text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#00f2ff] text-[#00363a] shadow-[0_0_15px_rgba(0,242,255,0.3)] font-extrabold'
                    : 'bg-[#1c1b1c] text-[#849495] hover:text-white hover:bg-[#27272a]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00363a]' : 'text-[#849495]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab.badgeColor || (isActive ? 'bg-[#00363a] text-[#00f2ff]' : 'bg-[#27272a] text-[#b9cacb]')}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. OCR DASHBOARD TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#141416] border border-[#27272a] rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#849495] uppercase">Total Ingested Jobs</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{metrics.totalJobs}</span>
                <Layers className="w-4 h-4 text-[#00f2ff]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Across current tournament</span>
            </div>

            <div className="p-4 bg-[#141416] border border-[#00f2ff]/30 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#00f2ff] uppercase">Queued For Processing</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#00f2ff] font-mono">{metrics.queued}</span>
                <Clock className="w-4 h-4 text-[#00f2ff]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Awaiting extraction pipeline</span>
            </div>

            <div className="p-4 bg-[#141416] border border-[#10b981]/30 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#10b981] uppercase">Awaiting Review</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#10b981] font-mono">{metrics.awaitingReview}</span>
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Staged rows ready for audit</span>
            </div>

            <div className="p-4 bg-[#141416] border border-[#ff4655]/30 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#ff4655] uppercase">Requires Manual Entry</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#ff4655] font-mono">{metrics.requiresManual}</span>
                <AlertTriangle className="w-4 h-4 text-[#ff4655]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Degraded / unreadable extractions</span>
            </div>
          </div>

          {/* Quick Action Grid */}
          <div className="p-5 bg-gradient-to-r from-[#141416] to-[#1c1b1c] border border-[#27272a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="font-headline text-sm font-bold text-white uppercase tracking-wider block">
                OCR Pipeline Ready: Process Queued Batches
              </span>
              <p className="text-xs text-[#849495]">
                Execute multi-pass preprocessing filters, layout bounding box extraction, and structured parsing on queued scoreboards.
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab('queue')}
              className="px-5 py-2.5 bg-[#00f2ff] text-[#00363a] rounded-lg font-headline text-xs font-black uppercase tracking-wider hover:bg-[#00f2ff]/90 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.3)] cursor-pointer shrink-0"
            >
              <Play className="w-4 h-4" />
              <span>Open Processing Queue</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. UPLOAD SCOREBOARD TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="space-y-6 animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-5">
            <div>
              <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#00f2ff]" />
                Scoreboard Screenshot Intake & Job Creator
              </h2>
              <p className="text-xs text-[#849495]">
                Ingest official in-game match result screens into private storage with cryptographic checksum validation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#07090c] rounded-xl border border-[#27272a]">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#849495] uppercase block">Match Round Reference</label>
                <select
                  value={selectedMatch}
                  onChange={(e) => setSelectedMatch(e.target.value)}
                  className="w-full bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="MATCH_001">Match #1 (Round 1)</option>
                  <option value="MATCH_002">Match #2 (Round 2)</option>
                  <option value="MATCH_003">Match #3 (Finals)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#849495] uppercase block">Format Mode</label>
                <select
                  value={selectedGameMode}
                  onChange={(e) => setSelectedGameMode(e.target.value)}
                  className="w-full bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Solo">Solo (1 Player per Team)</option>
                  <option value="Duo">Duo (2 Players per Team)</option>
                  <option value="Squad">Squad (4 Players per Team)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#849495] uppercase block">Battle Royale Map</label>
                <select
                  value={selectedMap}
                  onChange={(e) => setSelectedMap(e.target.value)}
                  className="w-full bg-[#141416] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Bermuda">Bermuda</option>
                  <option value="Purgatory">Purgatory</option>
                  <option value="Kalahari">Kalahari</option>
                  <option value="Alpine">Alpine</option>
                  <option value="NexTerra">NexTerra</option>
                </select>
              </div>
            </div>

            {/* Dropzone Area */}
            <div className="border-2 border-dashed border-[#00f2ff]/30 hover:border-[#00f2ff] bg-[#00f2ff]/5 rounded-xl p-8 text-center space-y-4 transition-all">
              {uploadPreviewUrl ? (
                <div className="space-y-4 max-w-lg mx-auto">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-[#27272a] bg-black shadow-2xl">
                    <img
                      src={uploadPreviewUrl}
                      alt="Selected Scoreboard"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFile(null)
                        setUploadPreviewUrl('')
                        setUploadSha256('')
                        setUploadPhash('')
                        setDuplicateWarning(null)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-950 text-white rounded-lg border border-red-500/40 text-xs font-bold cursor-pointer"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  <div className="p-3 bg-[#07090c] rounded-lg border border-[#27272a] text-left text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#849495]">
                      <span>File: <strong className="text-white">{uploadFile?.name}</strong></span>
                      <span>{(uploadFile?.size / 1024).toFixed(1)} KB</span>
                    </div>
                    {uploadDimensions && (
                      <div className="text-[11px] text-[#849495]">
                        Resolution: <strong className="text-[#00ff9d]">{uploadDimensions.width}x{uploadDimensions.height} px</strong>
                      </div>
                    )}
                    {uploadSha256 && (
                      <div className="text-[10px] text-[#849495] truncate">
                        SHA-256: <span className="text-[#00f2ff]">{uploadSha256}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center text-[#00f2ff] mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                      Select Free Fire Scoreboard Screenshot
                    </h3>
                    <p className="text-xs text-[#849495]">
                      Supports PNG, JPG, WEBP. Minimum 640x360 resolution (1080p recommended). Max 15 MB.
                    </p>
                  </div>
                  <div className="pt-2">
                    <label className="px-4 py-2.5 bg-[#00f2ff] text-[#00363a] font-headline text-xs font-black uppercase rounded shadow-lg hover:bg-[#00f2ff]/90 transition-all cursor-pointer inline-flex items-center gap-2">
                      <FileImage className="w-4 h-4" />
                      <span>Choose Scoreboard File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {duplicateWarning && (
              <div className="p-4 bg-[#ff4655]/10 border border-[#ff4655]/40 rounded-xl space-y-2 text-xs text-[#ff4655]">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Exact Duplicate Screenshot Blocked</span>
                </div>
                <p>{duplicateWarning.message}</p>
              </div>
            )}

            {uploadError && (
              <div className="p-3 bg-[#ff4655]/10 border border-[#ff4655]/30 rounded-lg text-xs text-[#ff4655] flex items-center gap-2 font-medium" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!uploadFile || isUploading}
                className="px-6 py-3 bg-[#00f2ff] hover:bg-[#00f2ff]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#00363a] font-headline text-xs font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center gap-2 transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>{isUploading ? 'Validating & Ingesting...' : 'Submit to OCR Processing Queue'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 3. PROCESSING QUEUE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'queue' && (
        <div className="space-y-6 animate-fadeIn">
          
          {isProcessingOcr && (
            <div className="p-4 bg-[#00f2ff]/10 border border-[#00f2ff]/40 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00f2ff] uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>OCR Pipeline Processing Active</span>
              </div>
              <p className="text-xs text-white font-mono">{processingProgress}</p>
            </div>
          )}

          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00f2ff]" />
                  OCR Processing & Extraction Queue
                </h2>
                <p className="text-xs text-[#849495]">
                  Active and queued screenshot batches staged for OCR worker processing.
                </p>
              </div>
              <button
                onClick={fetchJobs}
                className="p-2 bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white rounded transition-all cursor-pointer"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {ocrJobs.length === 0 ? (
              <div className="p-12 text-center space-y-2 bg-[#07090c] rounded-xl border border-[#27272a]">
                <Clock className="w-8 h-8 text-[#849495] mx-auto opacity-60" />
                <h4 className="font-headline text-sm font-bold text-white uppercase">Queue is Empty</h4>
                <p className="text-xs text-[#849495]">No active scoreboard jobs queued.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ocrJobs.map((job) => (
                  <div
                    key={`queue-item-${job.id}`}
                    className="p-4 bg-[#07090c] rounded-xl border border-[#27272a] hover:border-[#00f2ff]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        onClick={() => setZoomJob(job)}
                        className="w-16 h-12 rounded-lg bg-[#141416] border border-[#27272a] overflow-hidden shrink-0 flex items-center justify-center relative group cursor-pointer"
                      >
                        {job.signedUrl ? (
                          <img src={job.signedUrl} alt="Scoreboard" className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="w-5 h-5 text-[#849495]" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn className="w-4 h-4 text-[#00f2ff]" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">JOB #{String(job.id).substring(0, 8)}</span>
                          <AdminStatusBadge status={job.status} />
                          {job.is_perceptual_duplicate && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 uppercase">
                              Possible Visual Duplicate
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#849495]">
                          <strong className="text-white">{job.match_id}</strong> ({job.map_name || 'Bermuda'} • {job.game_mode || 'Squad'}) • Filename: <code className="text-[#b9cacb]">{job.original_filename}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {job.status === 'QUEUED' && (
                        <button
                          onClick={() => handleExecuteOcr(job)}
                          disabled={isProcessingOcr}
                          className="px-3.5 py-2 bg-[#00f2ff] hover:bg-[#00f2ff]/90 disabled:opacity-50 text-[#00363a] font-headline text-xs font-black uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Run OCR Extraction</span>
                        </button>
                      )}

                      {job.status === 'AWAITING_REVIEW' && (
                        <button
                          onClick={() => {
                            setActiveJob(job)
                            setActiveSubTab('review')
                          }}
                          className="px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/30 hover:bg-[#10b981] hover:text-black text-[#10b981] rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Review Extractions</span>
                        </button>
                      )}

                      {job.status === 'REQUIRES_MANUAL_ENTRY' && (
                        <button
                          onClick={() => {
                            setActiveJob(job)
                            setActiveSubTab('manual')
                          }}
                          className="px-3 py-1.5 bg-[#ff4655]/10 border border-[#ff4655]/30 hover:bg-[#ff4655] hover:text-white text-[#ff4655] rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Enter Manually</span>
                        </button>
                      )}

                      <button
                        onClick={() => setZoomJob(job)}
                        className="p-2 bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff] text-white rounded text-xs font-bold cursor-pointer"
                        title="Inspect Scoreboard"
                      >
                        <Eye className="w-4 h-4 text-[#00f2ff]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REVIEW & VERIFY CANDIDATES TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'review' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
              <div>
                <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#10b981]" />
                  <span>OCR Candidate Rows Inspector ({candidateRows.length} Rows)</span>
                </h2>
                <p className="text-xs text-[#849495]">
                  Extracted scoreboard placement, verbatim Unicode IGNs, and eliminations with confidence telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRawTokens(!showRawTokens)}
                  className="px-3 py-1.5 bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff] text-xs font-bold text-white rounded transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#00f2ff]" />
                  <span>{showRawTokens ? 'Hide Raw Tokens' : 'View Raw OCR Passes'}</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('manual')}
                  className="px-3 py-1.5 bg-[#ff4655]/10 border border-[#ff4655]/30 hover:bg-[#ff4655] hover:text-white text-[#ff4655] rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manual Override</span>
                </button>
              </div>
            </div>

            {/* Raw Multi-Pass Token Inspector Panel */}
            {showRawTokens && rawObservations.length > 0 && (
              <div className="p-4 bg-[#07090c] rounded-xl border border-[#00f2ff]/30 space-y-3">
                <span className="text-xs font-bold text-[#00f2ff] uppercase tracking-wider block">
                  Raw OCR Observation Passes ({rawObservations.length} Preprocessing Passes)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {rawObservations.map((obs) => (
                    <div key={`raw-obs-${obs.passNumber}`} className="p-3 bg-[#141416] rounded-lg border border-[#27272a] space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white font-bold">Pass #{obs.passNumber}: {obs.variant}</span>
                        <span className="text-[#00f2ff]">{obs.confidence}%</span>
                      </div>
                      <div className="text-[10px] text-[#849495] truncate">Engine: {obs.engine}</div>
                      <pre className="text-[10px] text-[#b9cacb] max-h-32 overflow-auto whitespace-pre-wrap bg-black/40 p-2 rounded">
                        {obs.rawText}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate Rows Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] text-[#849495] font-headline font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Exact Raw IGN (Unicode Verbatim)</th>
                    <th className="py-2.5 px-3">Normalized Hint</th>
                    <th className="py-2.5 px-3">Kills</th>
                    <th className="py-2.5 px-3">Damage</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-right">Extraction Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {candidateRows.map((row) => (
                    <tr
                      key={`candidate-row-${row.rowIndex}`}
                      className={`hover:bg-[#1c1b1c] transition-colors ${
                        row.extractionStatus === 'LOW_CONFIDENCE'
                          ? 'bg-[#ff4655]/5'
                          : row.extractionStatus === 'PARTIAL'
                          ? 'bg-[#f59e0b]/5'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-white">#{row.rank || row.rowIndex + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-white font-bold bg-[#07090c] px-2 py-1 rounded border border-[#27272a] inline-block">
                          {row.rawName || <span className="text-[#849495] italic">Unread</span>}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#849495] text-[11px]">
                        {row.normalizedComparisonKey || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {row.rawKills !== null ? row.rawKills : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#849495]">
                        {row.rawDamage !== null ? `${row.rawDamage} DMG` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span
                          className={
                            row.overallConfidence >= 85
                              ? 'text-[#10b981]'
                              : row.overallConfidence >= 60
                              ? 'text-[#f59e0b]'
                              : 'text-[#ff4655]'
                          }
                        >
                          {row.overallConfidence}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            row.extractionStatus === 'EXTRACTED'
                              ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30'
                              : row.extractionStatus === 'PARTIAL'
                              ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                              : 'bg-[#ff4655]/10 text-[#ff4655] border-[#ff4655]/30'
                          }`}
                        >
                          {row.extractionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Staging Notice Banner */}
            <div className="p-3 bg-[#10b981]/5 border border-[#10b981]/30 rounded-lg flex items-center justify-between text-xs">
              <span className="text-[#10b981] font-bold">
                ✓ Candidate rows extracted and staged. Ready for Phase 4 Identity Matching.
              </span>
              <span className="text-[#849495] text-[11px]">
                Matches will connect against registered players in Phase 4.
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MANUAL SCOREBOARD ENTRY TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'manual' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <h2 className="font-headline text-sm font-extrabold text-[#ff4655] uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Manual Scoreboard Extraction Override
                </h2>
                <p className="text-xs text-[#849495]">
                  Input scoreboard rows manually when OCR is unreadable or fails to resolve character glyphs.
                </p>
              </div>
              <button
                onClick={handleSaveManualRows}
                disabled={isSavingManual}
                className="px-4 py-2 bg-[#00f2ff] hover:bg-[#00f2ff]/90 disabled:opacity-50 text-[#00363a] font-headline text-xs font-black uppercase rounded shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingManual ? 'Saving...' : 'Save & Stage Manual Rows'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] text-[#849495] font-headline font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3 w-16">Rank</th>
                    <th className="py-2.5 px-3">Player / Team Exact IGN</th>
                    <th className="py-2.5 px-3 w-28">Kills</th>
                    <th className="py-2.5 px-3 w-32">Damage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {manualRows.map((row, idx) => (
                    <tr key={`manual-row-${idx}`} className="hover:bg-[#1c1b1c]">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        #{row.rank}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.rawName}
                          placeholder={`Enter Row #${idx + 1} IGN (e.g. KA¹⁷ Mjᶠᶠ)`}
                          onChange={(e) => handleManualRowChange(idx, 'rawName', e.target.value)}
                          className="w-full bg-[#07090c] border border-[#27272a] focus:border-[#00f2ff] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={row.rawKills}
                          onChange={(e) => handleManualRowChange(idx, 'rawKills', e.target.value)}
                          className="w-full bg-[#07090c] border border-[#27272a] focus:border-[#00f2ff] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={row.rawDamage}
                          onChange={(e) => handleManualRowChange(idx, 'rawDamage', e.target.value)}
                          className="w-full bg-[#07090c] border border-[#27272a] focus:border-[#00f2ff] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. OCR HISTORY TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-[#00f2ff]" />
                  OCR Scoreboard Ingestion Audit Trail
                </h2>
                <p className="text-xs text-[#849495]">
                  Historical records of all scoreboard screenshot submissions and extraction telemetry.
                </p>
              </div>
              <button
                onClick={fetchJobs}
                className="p-2 bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white rounded transition-all cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] text-[#849495] font-headline font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Job ID</th>
                    <th className="py-2.5 px-3">Match</th>
                    <th className="py-2.5 px-3">Mode & Map</th>
                    <th className="py-2.5 px-3">SHA-256 Checksum</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {ocrJobs.map((j) => (
                    <tr key={`hist-job-${j.id}`} className="hover:bg-[#1c1b1c] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white flex items-center gap-2">
                        <FileImage className="w-3.5 h-3.5 text-[#00f2ff]" />
                        {String(j.id).substring(0, 8)}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#b9cacb]">{j.match_id}</td>
                      <td className="py-3 px-3 text-[#849495]">
                        <span className="text-white font-bold">{j.game_mode}</span> • {j.map_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[#00f2ff] max-w-[150px] truncate">
                        {j.file_sha256}
                      </td>
                      <td className="py-3 px-3 text-[#849495] font-mono text-[11px]">
                        {new Date(j.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <AdminStatusBadge status={j.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setZoomJob(j)}
                          className="px-2.5 py-1 bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-[#00363a] rounded text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <ZoomIn className="w-3 h-3" />
                          <span>View Proof</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREENSHOT ZOOM MODAL */}
      {zoomJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setZoomJob(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
              <div>
                <h4 className="font-headline text-base font-bold text-white uppercase flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00f2ff]" />
                  <span>Scoreboard Evidence: Job #{String(zoomJob.id).substring(0, 8)}</span>
                </h4>
                <p className="text-xs text-[#8e9dae]">{zoomJob.match_id} ({zoomJob.map_name} • {zoomJob.game_mode}) • Status: {zoomJob.status}</p>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-xl border border-[#3a494b] bg-black p-2 flex items-center justify-center">
              {zoomJob.signedUrl ? (
                <img
                  src={zoomJob.signedUrl}
                  alt="Full Scoreboard Screenshot"
                  className="max-w-full h-auto object-contain rounded"
                />
              ) : (
                <div className="p-8 text-center text-[#849495]">Image preview unavailable</div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-[#8e9dae]">
              <span className="font-mono truncate max-w-lg">SHA-256: {zoomJob.file_sha256}</span>
              <span className="font-bold text-[#00f2ff]">Private Storage Evidence</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
