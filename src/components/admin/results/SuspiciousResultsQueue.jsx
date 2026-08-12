import {
  ShieldAlert,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function SuspiciousResultsQueue({ suspiciousSubmissions = [], onInspectSubmission }) {
  return (
    <div className="space-y-4 font-mono">

      {/* Header */}
      <div className="bg-[#151a21] border border-[#fe6b00]/30 rounded-xl p-4 shadow-xl flex items-center justify-between border-l-4 border-l-[#fe6b00]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#fe6b00]/10 border border-[#fe6b00]/30 flex items-center justify-center text-[#fe6b00]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide">
              SUSPICIOUS RESULTS & ANOMALY QUEUE
            </h3>
            <p className="text-xs text-[#8e9dae] mt-0.5">
              Anti-fraud flags for duplicate screenshots, IGN mismatches, and scorecard anomalies.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#fe6b00]/20 text-[#fe6b00] border border-[#fe6b00]/40 uppercase">
          {suspiciousSubmissions.length} FLAGGED ANOMALIES
        </span>
      </div>

      {/* Flagged Submissions List */}
      {suspiciousSubmissions.length === 0 ? (
        <div className="p-8 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#00ff9d] mx-auto" />
          <p className="text-xs text-[#8e9dae]">No suspicious scorecard submissions flagged in database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suspiciousSubmissions.map((s) => (
            <div
              key={s.id}
              className="bg-[#151a21] border border-[#fe6b00]/30 hover:border-[#fe6b00] rounded-xl p-4 space-y-3 shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
                  <span className="font-bold text-white text-xs">{s.tournament_id || s.tournamentTitle}</span>
                  <span className="px-2 py-0.5 bg-[#fe6b00]/20 text-[#fe6b00] border border-[#fe6b00]/40 text-[9px] font-bold rounded uppercase">
                    {s.verification_status || 'REVIEW_REQUIRED'}
                  </span>
                </div>

                <div className="p-2.5 bg-[#07090c] rounded border border-[#3a494b] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#8e9dae]">Submitting Player:</span>
                    <span className="font-bold text-white">{s.submitted_by_username || s.submitted_by_email || s.submittedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9dae]">Extracted IGN:</span>
                    <span className="font-bold text-[#fe6b00]">{s.ocr_game_ign || s.claimed_game_ign || 'Unknown'}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#ff3366]/10 border border-[#ff3366]/30 rounded text-[11px] text-[#ff3366] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{s.flag_reason || s.flagDetail || 'Potentially suspicious — manual review required.'}</span>
                </div>
              </div>

              <button
                onClick={() => onInspectSubmission(s)}
                className="w-full mt-2 py-2 bg-[#07090c] hover:bg-[#fe6b00] text-[#fe6b00] hover:text-black border border-[#fe6b00]/40 rounded text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>INSPECT ANOMALY</span>
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
