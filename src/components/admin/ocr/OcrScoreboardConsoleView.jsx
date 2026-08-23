import { useState, useMemo } from 'react'
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
  ChevronDown
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import AdminStatusBadge from '../AdminStatusBadge'

export default function OcrScoreboardConsoleView({ tournaments = [], setActiveTab }) {
  const { showSuccess, showError, showInfo } = useToast()

  // Selected tournament
  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || '')
  const selectedTourney = tournaments.find((t) => String(t.id) === String(selectedTourneyId)) || tournaments[0]

  // Active Sub-Tab: 'dashboard' | 'upload' | 'queue' | 'review' | 'manual' | 'history'
  const [activeSubTab, setActiveSubTab] = useState('dashboard')

  // Selected Match Reference for Scoreboard Intake
  const [selectedMatch, setSelectedMatch] = useState('MATCH_001')
  const [selectedGameMode, setSelectedGameMode] = useState(selectedTourney?.format || 'Squad')
  const [selectedMap, setSelectedMap] = useState('Bermuda')

  // Mock Staged OCR Batches for Pre-Verification Simulation
  const [stagedBatches, setStagedBatches] = useState([
    {
      id: 'BATCH-FF-082',
      tournamentId: selectedTourneyId,
      tournamentName: selectedTourney?.title || 'Free Fire Pro Championship',
      matchId: 'MATCH_001',
      map: 'Bermuda',
      mode: 'Squad',
      uploadedAt: '2026-08-23 10:15:30',
      screenshotCount: 3,
      status: 'AWAITING_REVIEW', // 'QUEUED' | 'PROCESSING' | 'AWAITING_REVIEW' | 'VERIFIED_HANDOFF' | 'FAILED'
      extractedRowsCount: 12,
      matchedPlayersCount: 11,
      ambiguousCount: 1,
      averageConfidence: 94,
      reviewer: 'Admin_Master',
      disposition: 'Pending Admin Verification',
      screenshotUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'BATCH-FF-081',
      tournamentId: selectedTourneyId,
      tournamentName: selectedTourney?.title || 'Free Fire Pro Championship',
      matchId: 'MATCH_002',
      map: 'Purgatory',
      mode: 'Squad',
      uploadedAt: '2026-08-23 09:40:12',
      screenshotCount: 2,
      status: 'VERIFIED_HANDOFF',
      extractedRowsCount: 12,
      matchedPlayersCount: 12,
      ambiguousCount: 0,
      averageConfidence: 98,
      reviewer: 'Admin_Master',
      disposition: 'Handed Off to Results Workspace',
      screenshotUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'BATCH-FF-080',
      tournamentId: selectedTourneyId,
      tournamentName: selectedTourney?.title || 'Free Fire Pro Championship',
      matchId: 'MATCH_003',
      map: 'Kalahari',
      mode: 'Squad',
      uploadedAt: '2026-08-22 18:20:00',
      screenshotCount: 1,
      status: 'REQUIRES_MANUAL',
      extractedRowsCount: 10,
      matchedPlayersCount: 7,
      ambiguousCount: 3,
      averageConfidence: 68,
      reviewer: 'Admin_Master',
      disposition: 'Low Confidence — Decorative Font Unresolved',
      screenshotUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
    },
  ])

  // Sample Staged Extraction Candidates for Active Review Tab
  const [candidateRows, setCandidateRows] = useState([
    {
      rowId: 'row-1',
      rank: 1,
      extractedIgn: 'KA¹⁷ Mjᶠᶠ',
      normalizedIgn: 'ka17 mjff',
      matchedUid: '518920412',
      matchedRegisteredName: 'KA¹⁷ Mjᶠᶠ (Captain)',
      teamName: 'MJ STRIKERS',
      kills: 8,
      damage: 2450,
      confidence: 96,
      status: 'CONFIRMED', // 'CONFIRMED' | 'AMBIGUOUS' | 'UNRESOLVED'
      flag: null,
    },
    {
      rowId: 'row-2',
      rank: 1,
      extractedIgn: '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗',
      normalizedIgn: '亗 ꭲ ɪ ᴛ ᴀ ɴ 亗',
      matchedUid: '518920413',
      matchedRegisteredName: '亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗 (Teammate #1)',
      teamName: 'MJ STRIKERS',
      kills: 5,
      damage: 1820,
      confidence: 92,
      status: 'CONFIRMED',
      flag: null,
    },
    {
      rowId: 'row-3',
      rank: 2,
      extractedIgn: '꧁༺NINJA༻꧂',
      normalizedIgn: '꧁༺ninja༻꧂',
      matchedUid: '518920414',
      matchedRegisteredName: '꧁༺NINJA༻꧂ (Captain)',
      teamName: 'CYBER TITANS',
      kills: 4,
      damage: 1420,
      confidence: 95,
      status: 'CONFIRMED',
      flag: null,
    },
    {
      rowId: 'row-4',
      rank: 3,
      extractedIgn: 'V² | ᴀ ᴋ ᴀ ʏ',
      normalizedIgn: 'v2 | a k a y',
      matchedUid: '518920415',
      matchedRegisteredName: 'V² | ᴀ ᴋ ᴀ ʏ (Member)',
      teamName: 'VIPER ESPORTS',
      kills: 2,
      damage: 980,
      confidence: 88,
      status: 'CONFIRMED',
      flag: null,
    },
    {
      rowId: 'row-5',
      rank: 4,
      extractedIgn: '𝕾𝖍𝖆𝖉𝖔𝖜',
      normalizedIgn: 'shadow',
      matchedUid: '518920416',
      matchedRegisteredName: 'Shadow_King (Ambiguous candidate)',
      teamName: 'SHADOW CLAN',
      kills: 6,
      damage: 1650,
      confidence: 72,
      status: 'AMBIGUOUS',
      flag: 'Multiple registered candidates share normalized IGN "shadow". Admin review required.',
    },
  ])

  // Summary Metrics
  const metrics = useMemo(() => {
    return {
      totalJobs: stagedBatches.length,
      awaitingReview: stagedBatches.filter((b) => b.status === 'AWAITING_REVIEW').length,
      verifiedHandoff: stagedBatches.filter((b) => b.status === 'VERIFIED_HANDOFF').length,
      requiresManual: stagedBatches.filter((b) => b.status === 'REQUIRES_MANUAL').length,
      averageConfidence: 89,
    }
  }, [stagedBatches])

  const handleSimulatedHandoff = (batchId) => {
    setStagedBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? { ...b, status: 'VERIFIED_HANDOFF', disposition: 'Verified & Made Available to Results Workspace' }
          : b
      )
    )
    showSuccess(`Batch ${batchId} verified! Staging data is now accessible by Match Results Workspace.`, 'OCR Staging Confirmed')
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* TOP HEADER: OCR CONSOLE & ARCHITECTURAL SEPARATION BANNER */}
      <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
        
        {/* Title Bar & Tournament Selector */}
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
                  Staging Layer
                </span>
              </div>
              <p className="text-xs text-[#849495] font-body">
                Pre-Results Scoreboard Intake, Identity Disambiguation & Staged Roster Verification
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
              Architectural Boundary Guard Active
            </span>
            <p className="text-[#849495] leading-relaxed">
              OCR extractions operate strictly inside a <strong className="text-white">pre-results staging buffer</strong>. Extracted rows do <strong className="text-white">NOT</strong> overwrite canonical match standings or wallet payouts until an administrator explicitly confirms verification. Authoritative finalization remains in <button onClick={() => setActiveTab && setActiveTab('results')} className="text-[#00f2ff] underline font-bold hover:text-white cursor-pointer">Match Results</button>.
            </p>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS (6 Core OCR Console Sections) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-[#27272a]">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Layers, badge: null },
            { id: 'upload', label: 'Upload Scoreboard', icon: Upload, badge: null },
            { id: 'queue', label: 'Processing Queue', icon: Clock, badge: stagedBatches.length },
            { id: 'review', label: 'Review & Verify', icon: Eye, badge: metrics.awaitingReview > 0 ? metrics.awaitingReview : null, badgeColor: 'bg-[#f59e0b] text-black' },
            { id: 'manual', label: 'Requires Manual Entry', icon: AlertTriangle, badge: metrics.requiresManual > 0 ? metrics.requiresManual : null, badgeColor: 'bg-[#ff4655] text-white' },
            { id: 'history', label: 'OCR History', icon: History, badge: null },
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
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${tab.badgeColor || (isActive ? 'bg-[#00363a] text-[#00f2ff]' : 'bg-[#27272a] text-[#b9cacb]')}`}>
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
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#141416] border border-[#27272a] rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#849495] uppercase">Total Intake Batches</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{metrics.totalJobs}</span>
                <Layers className="w-4 h-4 text-[#00f2ff]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Across all tournament rounds</span>
            </div>

            <div className="p-4 bg-[#141416] border border-[#f59e0b]/30 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#f59e0b] uppercase">Awaiting Verification</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#f59e0b] font-mono">{metrics.awaitingReview}</span>
                <Clock className="w-4 h-4 text-[#f59e0b]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Staged extractions pending review</span>
            </div>

            <div className="p-4 bg-[#141416] border border-[#10b981]/30 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#10b981] uppercase">Verified & Handed Off</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#10b981] font-mono">{metrics.verifiedHandoff}</span>
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Available in Results Workspace</span>
            </div>

            <div className="p-4 bg-[#141416] border border-[#ff4655]/30 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold text-[#ff4655] uppercase">Requires Manual Resolution</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#ff4655] font-mono">{metrics.requiresManual}</span>
                <AlertTriangle className="w-4 h-4 text-[#ff4655]" />
              </div>
              <span className="text-[10px] text-[#849495] block">Ambiguous / unread glyphs</span>
            </div>
          </div>

          {/* Staging Pipeline Architecture Flowchart */}
          <div className="p-5 bg-[#141416] border border-[#27272a] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00f2ff]" />
                <h3 className="font-headline text-xs font-bold text-white uppercase tracking-wider">
                  Pre-Results Staging Dataflow
                </h3>
              </div>
              <span className="text-[10px] text-[#10b981] font-mono font-bold bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/30">
                ACTIVE & ISOLATED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1">
                <div className="flex items-center gap-2 text-[#00f2ff] font-bold text-xs">
                  <span>1.</span>
                  <span>Intake Upload</span>
                </div>
                <p className="text-[10px] text-[#849495]">Raw screenshot ingested to private storage bucket.</p>
              </div>

              <div className="p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1">
                <div className="flex items-center gap-2 text-[#00f2ff] font-bold text-xs">
                  <span>2.</span>
                  <span>OCR Extraction</span>
                </div>
                <p className="text-[10px] text-[#849495]">Extracts raw IGNs, kills, damage, and placement rows.</p>
              </div>

              <div className="p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1">
                <div className="flex items-center gap-2 text-[#f59e0b] font-bold text-xs">
                  <span>3.</span>
                  <span>Roster Match</span>
                </div>
                <p className="text-[10px] text-[#849495]">Matches against tournament_players (UID + Canonical IGN).</p>
              </div>

              <div className="p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1">
                <div className="flex items-center gap-2 text-[#a855f7] font-bold text-xs">
                  <span>4.</span>
                  <span>Admin Review</span>
                </div>
                <p className="text-[10px] text-[#849495]">Admin audits confidence, disambiguates collisions.</p>
              </div>

              <div className="p-3 bg-[#1c1b1c] rounded-lg border border-[#10b981]/40 space-y-1 bg-[#10b981]/5">
                <div className="flex items-center gap-2 text-[#10b981] font-bold text-xs">
                  <span>5.</span>
                  <span>Results Handoff</span>
                </div>
                <p className="text-[10px] text-[#849495]">Confirmed data made accessible in Results Workspace.</p>
              </div>
            </div>
          </div>

          {/* Active Staged Batches Quick Table */}
          <div className="bg-[#141416] border border-[#27272a] rounded-xl overflow-hidden shadow-xl space-y-3 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00f2ff]" />
                <h3 className="font-headline text-xs font-bold text-white uppercase tracking-wider">
                  Active Staging Batches ({stagedBatches.length})
                </h3>
              </div>
              <button
                onClick={() => setActiveSubTab('upload')}
                className="px-3 py-1.5 bg-[#00f2ff] text-[#00363a] rounded text-xs font-bold uppercase tracking-wider hover:bg-[#00f2ff]/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload New Scoreboard
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] text-[#849495] font-headline font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Batch ID</th>
                    <th className="py-2.5 px-3">Match</th>
                    <th className="py-2.5 px-3">Mode & Map</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Matched Players</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {stagedBatches.map((batch) => (
                    <tr key={`dash-batch-${batch.id}`} className="hover:bg-[#1c1b1c] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white flex items-center gap-2">
                        <FileImage className="w-3.5 h-3.5 text-[#00f2ff]" />
                        {batch.id}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#b9cacb]">{batch.matchId}</td>
                      <td className="py-3 px-3 text-[#849495]">
                        <span className="text-white font-bold">{batch.mode}</span> • {batch.map}
                      </td>
                      <td className="py-3 px-3">
                        <AdminStatusBadge status={batch.status} />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={batch.averageConfidence >= 90 ? 'text-[#10b981]' : 'text-[#f59e0b]'}>
                          {batch.averageConfidence}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#b9cacb]">
                        <span className="text-white font-bold">{batch.matchedPlayersCount}</span> / {batch.extractedRowsCount} rows
                      </td>
                      <td className="py-3 px-3 text-right">
                        {batch.status === 'AWAITING_REVIEW' && (
                          <button
                            onClick={() => setActiveSubTab('review')}
                            className="px-2.5 py-1 bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff] hover:text-[#00363a] rounded text-[11px] font-bold uppercase transition-all cursor-pointer"
                          >
                            Review & Verify
                          </button>
                        )}
                        {batch.status === 'VERIFIED_HANDOFF' && (
                          <button
                            onClick={() => setActiveTab && setActiveTab('results')}
                            className="px-2.5 py-1 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981] hover:text-black rounded text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <span>Open Results</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {batch.status === 'REQUIRES_MANUAL' && (
                          <button
                            onClick={() => setActiveSubTab('manual')}
                            className="px-2.5 py-1 bg-[#ff4655]/10 border border-[#ff4655]/30 text-[#ff4655] hover:bg-[#ff4655] hover:text-white rounded text-[11px] font-bold uppercase transition-all cursor-pointer"
                          >
                            Manual Entry
                          </button>
                        )}
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
      {/* 2. UPLOAD SCOREBOARD TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-5">
            <div>
              <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#00f2ff]" />
                Scoreboard Screenshot Intake
              </h2>
              <p className="text-xs text-[#849495]">
                Upload official in-game match result screens for pre-results OCR staging and identity extraction.
              </p>
            </div>

            {/* Target Match & Scope Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#07090c] rounded-xl border border-[#27272a]">
              
              {/* Match ID Selector */}
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

              {/* Game Mode */}
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

              {/* Map Selection */}
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

            {/* Drag and Drop Intake Dropzone Area */}
            <div className="border-2 border-dashed border-[#00f2ff]/30 hover:border-[#00f2ff] bg-[#00f2ff]/5 rounded-xl p-8 text-center space-y-3 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center text-[#00f2ff] mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
                  Drag and Drop Scoreboard Screenshots Here
                </h3>
                <p className="text-xs text-[#849495]">
                  Supports multiple screenshots (PNG, JPG, WEBP). High resolution 1080p recommended.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showInfo('OCR Intake Pipeline integration ready. Live image upload will activate in Phase 2.', 'OCR Intake Staging')}
                  className="px-4 py-2 bg-[#00f2ff] text-[#00363a] font-headline text-xs font-extrabold uppercase rounded shadow-lg hover:bg-[#00f2ff]/90 transition-all cursor-pointer"
                >
                  Select Screenshot Files
                </button>
              </div>
            </div>

            {/* Ingestion Standards & Tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[#07090c] rounded-lg border border-[#27272a] space-y-1">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                  Full Match Table Visible
                </span>
                <p className="text-[10px] text-[#849495]">Ensure all placement ranks, player IGNs, and kill counts are un-cropped.</p>
              </div>

              <div className="p-3 bg-[#07090c] rounded-lg border border-[#27272a] space-y-1">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                  Multi-Page Coverage
                </span>
                <p className="text-[10px] text-[#849495]">For 12-squad matches, upload both top-half (1-6) and bottom-half (7-12) screenshots.</p>
              </div>

              <div className="p-3 bg-[#07090c] rounded-lg border border-[#27272a] space-y-1">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                  Roster Isolation
                </span>
                <p className="text-[10px] text-[#849495]">Uploaded screenshots will be compared exclusively against registered tournament players.</p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PROCESSING QUEUE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'queue' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00f2ff]" />
                  OCR Processing & Extraction Queue
                </h2>
                <p className="text-xs text-[#849495]">
                  Active and queued screenshot batches awaiting staging analysis.
                </p>
              </div>
              <button
                onClick={() => showInfo('Queue refreshed.', 'OCR Queue')}
                className="p-2 bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white rounded transition-all cursor-pointer"
                title="Refresh Queue"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {stagedBatches.map((batch) => (
                <div key={`queue-card-${batch.id}`} className="p-4 bg-[#07090c] rounded-xl border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-lg bg-[#141416] border border-[#27272a] overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={batch.screenshotUrl} alt="Scoreboard" className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{batch.id}</span>
                        <AdminStatusBadge status={batch.status} />
                      </div>
                      <p className="text-xs text-[#849495]">
                        <strong className="text-white">{batch.matchId}</strong> ({batch.map}) • {batch.screenshotCount} Screenshot(s) • Uploaded {batch.uploadedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-[#849495] block uppercase font-bold">Confidence</span>
                      <span className="text-sm font-mono font-bold text-[#10b981]">{batch.averageConfidence}%</span>
                    </div>
                    <button
                      onClick={() => setActiveSubTab('review')}
                      className="px-3 py-1.5 bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff] text-white rounded text-xs font-bold uppercase transition-all cursor-pointer"
                    >
                      Inspect Batch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REVIEW & VERIFICATION TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'review' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Staging Review Control Banner */}
          <div className="p-4 bg-[#141416] border border-[#27272a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-xs">BATCH-FF-082</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30">
                  STAGED CANDIDATES (UNCONFIRMED)
                </span>
              </div>
              <p className="text-xs text-[#849495] mt-0.5">
                Match #1 (Bermuda Squad) • 5 Extracted Candidates • 1 Ambiguous Match
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveSubTab('manual')}
                className="px-3 py-2 bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white rounded text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Resolve Ambiguities
              </button>
              <button
                onClick={() => handleSimulatedHandoff('BATCH-FF-082')}
                className="px-4 py-2 bg-[#10b981] text-black font-headline text-xs font-black uppercase tracking-wider rounded shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-[#10b981]/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Handoff to Results
              </button>
            </div>
          </div>

          {/* Side-by-Side Review Grid: Screenshot + Staged Extraction Candidates */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Scoreboard Screenshot Viewer (5 Columns) */}
            <div className="lg:col-span-5 bg-[#141416] border border-[#27272a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <span className="font-headline text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileImage className="w-3.5 h-3.5 text-[#00f2ff]" />
                  Original Scoreboard
                </span>
                <span className="text-[10px] text-[#849495] font-mono">1920x1080 PNG</span>
              </div>

              <div className="relative aspect-video rounded-lg overflow-hidden border border-[#27272a] bg-black">
                <img
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
                  alt="Scoreboard Screenshot Proof"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur rounded text-[10px] font-mono font-bold text-[#00f2ff] border border-[#00f2ff]/30">
                  PROOF #1
                </div>
              </div>

              <div className="p-3 bg-[#07090c] rounded-lg border border-[#27272a] space-y-1">
                <span className="text-[11px] font-bold text-white uppercase block">Visual Quality Check</span>
                <p className="text-[10px] text-[#849495]">
                  Scoreboard un-occluded. All 4 squad kill rows are legible with minimal artifact noise.
                </p>
              </div>
            </div>

            {/* Right Column: Staged Candidate Rows Table (7 Columns) */}
            <div className="lg:col-span-7 bg-[#141416] border border-[#27272a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <span className="font-headline text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#00f2ff]" />
                  Staged Roster Extraction ({candidateRows.length})
                </span>
                <span className="text-[10px] text-[#f59e0b] font-bold">1 Requires Attention</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27272a] text-[#849495] font-headline font-bold uppercase text-[10px]">
                      <th className="py-2 px-2.5">Rank</th>
                      <th className="py-2 px-2.5">Extracted IGN</th>
                      <th className="py-2 px-2.5">Matched Registered Identity</th>
                      <th className="py-2 px-2.5">Kills</th>
                      <th className="py-2 px-2.5">Confidence</th>
                      <th className="py-2 px-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]/60">
                    {candidateRows.map((row) => (
                      <tr key={`cand-row-${row.rowId}`} className={`hover:bg-[#1c1b1c] transition-colors ${row.status === 'AMBIGUOUS' ? 'bg-[#ff4655]/5' : ''}`}>
                        <td className="py-2.5 px-2.5 font-mono font-bold text-white">#{row.rank}</td>
                        <td className="py-2.5 px-2.5 font-bold text-white">
                          <span className="font-mono bg-[#07090c] px-1.5 py-0.5 rounded border border-[#27272a]">
                            {row.extractedIgn}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="space-y-0.5">
                            <span className="text-white font-bold block">{row.matchedRegisteredName}</span>
                            <span className="text-[10px] text-[#849495] font-mono">UID: {row.matchedUid} • {row.teamName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono font-bold text-white">{row.kills}</td>
                        <td className="py-2.5 px-2.5 font-mono font-bold">
                          <span className={row.confidence >= 90 ? 'text-[#10b981]' : 'text-[#f59e0b]'}>
                            {row.confidence}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          {row.status === 'CONFIRMED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
                              Matched
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff4655]/10 text-[#ff4655] border border-[#ff4655]/30 animate-pulse">
                              Ambiguous
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warning Banner for Ambiguous Rows */}
              <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#f59e0b]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Row #5:</strong> Extracted stylized font <code className="bg-black/40 px-1 py-0.5 rounded text-white">𝕾𝖍𝖆𝖉𝖔𝖜</code> normalized to <code className="bg-black/40 px-1 py-0.5 rounded text-white">shadow</code>. 2 registered players share this normalized handle. Click "Resolve Ambiguities" to manually assign the slot.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REQUIRES MANUAL ENTRY TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'manual' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <h2 className="font-headline text-sm font-extrabold text-[#ff4655] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Manual Identity Disambiguation Queue
                </h2>
                <p className="text-xs text-[#849495]">
                  Scoreboard extractions where OCR confidence fell below threshold or identical IGN candidates collided.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-[#ff4655]/10 border border-[#ff4655]/30 text-[#ff4655] text-xs font-bold rounded">
                1 Unresolved Item
              </span>
            </div>

            {/* Disambiguation Resolution Card */}
            <div className="p-4 bg-[#07090c] rounded-xl border border-[#ff4655]/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-3">
                <div>
                  <span className="font-mono font-bold text-white text-xs">COLLISION EVENT #COL-091</span>
                  <p className="text-xs text-[#849495]">Batch BATCH-FF-082 • Row #5 (Rank #4, Kills: 6)</p>
                </div>
                <span className="text-[10px] text-[#f59e0b] font-bold uppercase bg-[#f59e0b]/10 px-2 py-0.5 rounded border border-[#f59e0b]/30">
                  Multiple Candidate Collision
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-[#141416] rounded-lg border border-[#27272a] space-y-2">
                  <span className="text-[11px] font-bold text-[#849495] uppercase block">Extracted Text</span>
                  <div className="p-2.5 bg-[#07090c] rounded border border-[#27272a] font-mono text-sm font-bold text-white">
                    𝕾𝖍𝖆𝖉𝖔𝖜
                  </div>
                  <span className="text-[10px] text-[#849495] block">Normalized Key: <code className="text-[#00f2ff]">shadow</code></span>
                </div>

                <div className="p-3 bg-[#141416] rounded-lg border border-[#27272a] space-y-2">
                  <span className="text-[11px] font-bold text-[#849495] uppercase block">Select Intended Registered Player</span>
                  <select
                    className="w-full bg-[#07090c] border border-[#27272a] focus:border-[#00f2ff] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="518920416">Player A — Shadow_King (UID: 518920416, Team: SHADOW CLAN)</option>
                    <option value="518920499">Player B — Shadow_Striker (UID: 518920499, Team: DARK OPS)</option>
                  </select>
                  <span className="text-[10px] text-[#10b981] block">Suggested: Team SHADOW CLAN (Squadmates matched in same row)</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272a]">
                <button
                  onClick={() => showSuccess('Identity collision resolved. Candidate assigned to Shadow_King.', 'Collision Cleared')}
                  className="px-4 py-2 bg-[#00f2ff] text-[#00363a] rounded text-xs font-headline font-extrabold uppercase tracking-wider hover:bg-[#00f2ff]/90 transition-all cursor-pointer"
                >
                  Confirm Candidate Assignment
                </button>
              </div>
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
                  OCR Job History & Staging Audit Trail
                </h2>
                <p className="text-xs text-[#849495]">
                  Historical scoreboard intake records, reviewer actions, and extraction dispositions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] text-[#849495] font-headline font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Batch ID</th>
                    <th className="py-2.5 px-3">Tournament</th>
                    <th className="py-2.5 px-3">Match</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Reviewer</th>
                    <th className="py-2.5 px-3">Disposition</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {stagedBatches.map((b) => (
                    <tr key={`hist-row-${b.id}`} className="hover:bg-[#1c1b1c] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">{b.id}</td>
                      <td className="py-3 px-3 text-white font-bold">{b.tournamentName}</td>
                      <td className="py-3 px-3 font-bold text-[#b9cacb]">{b.matchId} ({b.map})</td>
                      <td className="py-3 px-3 text-[#849495] font-mono">{b.uploadedAt}</td>
                      <td className="py-3 px-3 text-[#b9cacb] font-bold">{b.reviewer}</td>
                      <td className="py-3 px-3 text-[#849495] text-[11px]">{b.disposition}</td>
                      <td className="py-3 px-3 text-right">
                        <AdminStatusBadge status={b.status} />
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
  )
}
