import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Inbox,
  Sparkles,
  ShieldAlert,
  Award,
  Clock,
  RefreshCw,
  Trophy,
  Upload
} from 'lucide-react'
import ResultSubmissionInbox from './results/ResultSubmissionInbox'
import OcrReviewInspector from './results/OcrReviewInspector'
import SuspiciousResultsQueue from './results/SuspiciousResultsQueue'
import {
  fetchScorecards,
  runOcrOnScorecard,
  persistManualOverride,
  approveScorecard,
  rejectScorecard,
  uploadScorecardScreenshot
} from '../../services/scorecardService'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

export default function ResultVerificationView({ tournaments = [] }) {
  const { showSuccess, showError } = useToast()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('INBOX')
  const [processingId, setProcessingId] = useState(null)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [scorecards, setScorecards] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch scorecards from Supabase database
  const loadScorecards = async () => {
    setLoading(true)
    const res = await fetchScorecards()
    if (res.success) {
      setScorecards(res.data || [])
    } else {
      showError('Failed to fetch scorecards from database.', 'Database Notice')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadScorecards()
  }, [])

  const pendingSubmissions = scorecards.filter((s) => s.verification_status !== 'VERIFIED' && s.verification_status !== 'REJECTED')
  const suspiciousList = scorecards.filter((s) => s.is_flagged || s.verification_status === 'REVIEW_REQUIRED')
  const verifiedResults = scorecards.filter((s) => s.verification_status === 'VERIFIED')

  const handleProcessOcr = async (sub) => {
    setProcessingId(sub.id)
    try {
      const res = await runOcrOnScorecard(sub.id, sub.screenshotUrlResolved || sub.screenshot_url, sub.game || 'Free Fire MAX')
      if (res.success) {
        showSuccess(`Real OCR processed for ${sub.submitted_by_username || sub.submitted_by_email}`, 'OCR Complete')
        await loadScorecards()
      } else {
        showError('OCR processing failed.', 'OCR Error')
      }
    } catch {
      showError('OCR exception occurred.', 'OCR Exception')
    } finally {
      setProcessingId(null)
    }
  }

  const handleInspect = (sub) => {
    setSelectedSubmission(sub)
    setActiveTab('OCR_INSPECTOR')
  }

  const handleApproveResult = async (sub, overrideData, reason = '') => {
    if (overrideData) {
      await persistManualOverride(sub.id, overrideData, reason, user?.id)
    }
    const res = await approveScorecard(sub.id, user?.id)
    if (res.success) {
      showSuccess(`Scorecard approved and persisted to database for ${sub.submitted_by_username || sub.submitted_by_email}`, 'Result Approved')
      await loadScorecards()
      setSelectedSubmission(null)
      setActiveTab('VERIFIED')
    } else {
      showError('Failed to approve scorecard.', 'Database Error')
    }
  }

  const handleRejectResult = async (sub, reason = 'Administrative Rejection') => {
    const res = await rejectScorecard(sub.id, user?.id, reason)
    if (res.success) {
      showSuccess(`Scorecard rejection persisted to database.`, 'Result Rejected')
      await loadScorecards()
      setSelectedSubmission(null)
      setActiveTab('INBOX')
    } else {
      showError('Failed to reject scorecard.', 'Database Error')
    }
  }

  const handleFileUploadDemo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const res = await uploadScorecardScreenshot({
      file,
      tournamentId: tournaments[0]?.id || 'tourn-1',
      userId: user?.id,
      userEmail: user?.email || 'admin@mjesports.com',
      username: user?.user_metadata?.username || 'AdminUser',
      claimedIgn: 'RPCTestPlayer',
      claimedUid: 'f60d887c-b696-4faf-a108-f7197af8283f',
    })

    if (res.success) {
      showSuccess('Scorecard uploaded to private match-scorecards bucket and database.', 'Upload Success')
      await loadScorecards()
    } else {
      showError('Scorecard upload failed.', 'Upload Error')
    }
  }

  return (
    <div className="space-y-6 antialiased font-mono">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-bold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>MJ ESPORTS V2</span>
          </div>
          <h2 className="font-headline text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            RESULT VERIFICATION & OCR CONTROL HUB
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-4 py-2.5 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Screenshot</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUploadDemo}
              className="hidden"
            />
          </label>

          <button
            onClick={loadScorecards}
            className="px-4 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] hover:border-[#00f2ff] text-[#00f2ff] rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </button>
        </div>
      </div>

      {/* IA Navigation Tabs */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 shadow-xl flex items-center gap-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'INBOX', label: 'SUBMISSION INBOX' },
          { id: 'OCR_INSPECTOR', label: 'OCR REVIEW & INSPECTOR' },
          { id: 'SUSPICIOUS', label: 'SUSPICIOUS RESULTS' },
          { id: 'VERIFIED', label: 'VERIFIED RESULTS' },
          { id: 'STANDINGS', label: 'PUBLISHED STANDINGS' },
          { id: 'HISTORY', label: 'MATCH HISTORY' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'bg-[#07090c] text-[#8e9dae] hover:text-white border border-[#3a494b]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View Switching */}
      {activeTab === 'INBOX' && (
        <ResultSubmissionInbox
          submissions={pendingSubmissions}
          onProcessOcr={handleProcessOcr}
          onInspectSubmission={handleInspect}
          processingId={processingId}
          loading={loading}
        />
      )}

      {activeTab === 'OCR_INSPECTOR' && (
        <OcrReviewInspector
          submission={selectedSubmission || scorecards[0]}
          onApprove={handleApproveResult}
          onReject={handleRejectResult}
          onBackToInbox={() => setActiveTab('INBOX')}
        />
      )}

      {activeTab === 'SUSPICIOUS' && (
        <SuspiciousResultsQueue
          suspiciousSubmissions={suspiciousList}
          onInspectSubmission={handleInspect}
        />
      )}

      {activeTab === 'VERIFIED' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl font-mono text-xs">
          <h3 className="font-headline text-xs font-bold text-white uppercase border-b border-[#3a494b]/60 pb-2">
            DATABASE-PERSISTED VERIFIED MATCH SCORECARDS
          </h3>
          <div className="space-y-2">
            {verifiedResults.length === 0 ? (
              <p className="text-[#8e9dae] text-center p-4">No match results verified in database.</p>
            ) : (
              verifiedResults.map((v) => (
                <div key={v.id} className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{v.submitted_by_username || v.submitted_by_email}</span>
                    <span className="text-[10px] text-[#8e9dae]">
                      Kills: {v.final_kills ?? v.ocr_kills} • Damage: {v.final_damage ?? v.ocr_damage} • Rank: {v.final_placement ?? v.ocr_placement}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 text-[10px] font-bold rounded uppercase">
                    VERIFIED ✓
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'STANDINGS' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 text-center space-y-3 font-mono">
          <Trophy className="w-8 h-8 text-[#00ff9d] mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">OFFICIAL PUBLISHED STANDINGS CONSUMER</h3>
          <p className="text-xs text-[#8e9dae] max-w-md mx-auto">
            Verified official match results flow directly into public tournament leaderboard views.
          </p>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl font-mono text-xs">
          <h3 className="font-headline text-xs font-bold text-white uppercase border-b border-[#3a494b]/60 pb-2">
            DATABASE SCORECARD HISTORICAL AUDIT LOG
          </h3>
          <div className="space-y-2">
            {scorecards.length === 0 ? (
              <p className="text-[#8e9dae] text-center p-4">No historical scorecards in database.</p>
            ) : (
              scorecards.map((s) => (
                <div key={s.id} className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{s.submitted_by_username || s.submitted_by_email}</span>
                    <span className="text-[10px] text-[#8e9dae]">
                      Status: {s.verification_status} • Game: {s.game} • Submitted: {new Date(s.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#00f2ff] font-mono">{s.id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  )
}
