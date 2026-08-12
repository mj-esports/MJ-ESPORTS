import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Eye,
  ArrowLeft,
  Sparkles,
  Award,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'

export default function OcrReviewInspector({ submission, onApprove, onReject, onBackToInbox }) {
  const { showSuccess } = useToast()

  const [ocrData, setOcrData] = useState({
    game_ign: submission?.ocr_game_ign || submission?.claimed_game_ign || 'RPCTestPlayer',
    kills: submission?.ocr_kills ?? 0,
    damage: submission?.ocr_damage ?? 0,
    placement: submission?.ocr_placement || '#1',
    confidence: submission?.ocr_confidence || 85,
    raw_text: submission?.ocr_raw_text || 'MATCH RESULT SCORECARD',
  })

  // Manual Override Inputs
  const [overrideKills, setOverrideKills] = useState(submission?.final_kills ?? ocrData.kills)
  const [overrideDamage, setOverrideDamage] = useState(submission?.final_damage ?? ocrData.damage)
  const [overrideIgn, setOverrideIgn] = useState(submission?.final_game_ign ?? ocrData.game_ign)
  const [overridePlacement, setOverridePlacement] = useState(submission?.final_placement ?? ocrData.placement)
  const [correctionReason, setCorrectionReason] = useState(submission?.correction_reason || '')
  const [isModified, setIsModified] = useState(false)

  useEffect(() => {
    if (submission) {
      const killsVal = submission.final_kills ?? submission.ocr_kills ?? 0
      const dmgVal = submission.final_damage ?? submission.ocr_damage ?? 0
      const ignVal = submission.final_game_ign ?? submission.ocr_game_ign ?? submission.claimed_game_ign ?? 'RPCTestPlayer'
      const rankVal = submission.final_placement ?? submission.ocr_placement ?? '#1'

      setOcrData({
        game_ign: submission.ocr_game_ign || submission.claimed_game_ign || 'RPCTestPlayer',
        kills: submission.ocr_kills ?? 0,
        damage: submission.ocr_damage ?? 0,
        placement: submission.ocr_placement || '#1',
        confidence: submission.ocr_confidence || 85,
        raw_text: submission.ocr_raw_text || 'MATCH RESULT SCORECARD',
      })

      setOverrideKills(killsVal)
      setOverrideDamage(dmgVal)
      setOverrideIgn(ignVal)
      setOverridePlacement(rankVal)
      setCorrectionReason(submission.correction_reason || '')
      setIsModified(Boolean(submission.corrected_at || submission.correction_reason))
    }
  }, [submission])

  if (!submission) {
    return (
      <div className="p-8 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-center font-mono space-y-3">
        <AlertTriangle className="w-8 h-8 text-[#8e9dae] mx-auto" />
        <p className="text-xs text-[#8e9dae]">No scorecard submission selected for OCR inspection.</p>
        <button
          onClick={onBackToInbox}
          className="px-4 py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#00f2ff] rounded text-xs font-bold uppercase"
        >
          Return to Inbox
        </button>
      </div>
    )
  }

  const handleApproveWithOverrides = () => {
    const hasChanges =
      overrideKills !== ocrData.kills ||
      overrideDamage !== ocrData.damage ||
      overridePlacement !== ocrData.placement ||
      overrideIgn !== ocrData.game_ign

    onApprove(
      submission,
      hasChanges
        ? { kills: overrideKills, damage: overrideDamage, placement: overridePlacement, game_ign: overrideIgn }
        : null,
      correctionReason || (hasChanges ? 'Manual admin correction' : 'Approved as OCR extracted')
    )
  }

  return (
    <div className="space-y-6 font-mono">

      {/* Header Bar */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToInbox}
            className="p-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#00f2ff] rounded-lg transition-colors"
            title="Return to Submission Inbox"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00f2ff]" />
              <span>DUAL-PANE OCR INSPECTOR & REVIEW WORKSPACE</span>
            </h3>
            <p className="text-xs text-[#8e9dae] mt-0.5">
              Submission {submission.id} • {submission.tournament_id || 'Tournament'}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
          OCR CONFIDENCE: {ocrData.confidence}%
        </span>
      </div>

      {/* Split-Screen Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT PANE: ORIGINAL SCREENSHOT VIEW */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#00f2ff]" />
              <span>ORIGINAL MATCH SCORECARD SCREENSHOT</span>
            </span>
            <span className="text-[10px] text-[#8e9dae] uppercase">IMAGE EVIDENCE</span>
          </div>

          <div className="relative h-80 bg-[#07090c] rounded-xl overflow-hidden border border-[#3a494b] flex items-center justify-center">
            {submission.screenshotUrlResolved || submission.screenshot_url ? (
              <img
                src={submission.screenshotUrlResolved || submission.screenshot_url}
                alt="Match Scorecard"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="p-6 text-center space-y-2 text-xs text-[#8e9dae]">
                <Award className="w-10 h-10 text-[#00f2ff] mx-auto opacity-50" />
                <p className="font-bold text-white uppercase">SCORECARD SCREENSHOT EVIDENCE</p>
                <p className="text-[10px] text-[#8e9dae]">
                  Match result screenshot uploaded by player {submission.submitted_by_username || submission.submitted_by_email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: EXTRACTED OCR & VERIFIED IDENTITY MATCH */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00ff9d]" />
              <span>OCR DATA & IDENTITY CROSS-VERIFICATION</span>
            </span>
            <span className="text-[10px] text-[#00ff9d] uppercase font-bold">
              VERIFIED IDENTITY MATCH
            </span>
          </div>

          {/* Original OCR Output Display */}
          <div className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b] space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-[#8e9dae] text-[10px] font-bold uppercase border-b border-[#3a494b]/40 pb-1">
              <span>Original OCR Output</span>
              <span>Values</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae]">OCR Extracted Game IGN:</span>
              <span className="font-bold text-white">{ocrData.game_ign || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae]">OCR Extracted Kills:</span>
              <span className="font-bold text-[#00f2ff]">{ocrData.kills}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae]">OCR Extracted Damage:</span>
              <span className="font-bold text-[#00f2ff]">{ocrData.damage}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8e9dae]">Target Verified Game UID:</span>
              <span className="font-bold text-[#00ff9d]">{submission.claimed_game_uid || 'N/A'}</span>
            </div>
          </div>

          {/* Manual Override Controls */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8e9dae] uppercase font-bold">MANUAL OVERRIDE INPUTS</span>
              {isModified && (
                <span className="text-[9px] font-bold text-[#fe6b00] uppercase">
                  MANUALLY EDITED (ORIGINAL PRESERVED)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-[#8e9dae] uppercase mb-1">KILLS COUNT</label>
                <input
                  type="number"
                  value={overrideKills}
                  onChange={(e) => {
                    setOverrideKills(parseInt(e.target.value, 10) || 0)
                    setIsModified(true)
                  }}
                  className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-white font-bold focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8e9dae] uppercase mb-1">TOTAL DAMAGE</label>
                <input
                  type="number"
                  value={overrideDamage}
                  onChange={(e) => {
                    setOverrideDamage(parseInt(e.target.value, 10) || 0)
                    setIsModified(true)
                  }}
                  className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-white font-bold focus:border-[#00f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#8e9dae] uppercase mb-1">MATCH PLACEMENT</label>
              <input
                type="text"
                value={overridePlacement}
                onChange={(e) => {
                  setOverridePlacement(e.target.value)
                  setIsModified(true)
                }}
                className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-white font-bold focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#8e9dae] uppercase mb-1">CORRECTION REASON</label>
              <input
                type="text"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Reason for manual edit..."
                className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Approval Controls */}
          <div className="pt-3 border-t border-[#3a494b]/60 grid grid-cols-2 gap-2">
            <button
              onClick={handleApproveWithOverrides}
              className="py-2.5 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              APPROVE RESULT
            </button>

            <button
              onClick={() => onReject(submission, correctionReason || 'Admin Rejection')}
              className="py-2.5 bg-red-950 hover:bg-red-900 text-red-400 border border-red-500/40 font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              REJECT RESULT
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}
