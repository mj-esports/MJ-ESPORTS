import { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Ban,
  Clock,
  Eye,
  X,
  AlertCircle,
  Gamepad2,
  User,
  Mail
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'

export default function IdentityVerificationQueue({ users = [], onUpdateStatus, updatingUserId }) {
  const { showSuccess, showError } = useToast()
  const [selectedEvidence, setSelectedEvidence] = useState(null)

  const pendingUsers = users.filter(
    (u) =>
      u.verificationStatus === 'Pending' ||
      u.verificationStatus === 'PENDING' ||
      u.verificationStatus === 'UNVERIFIED'
  )

  const handleAction = async (user, newStatus) => {
    try {
      await onUpdateStatus(user.userId || user.id, newStatus)
      showSuccess(`Player ${user.username} set to "${newStatus}"`, 'Identity Verification')
    } catch {
      showError(`Failed to set verification status for ${user.username}`, 'Verification Error')
    }
  }

  return (
    <div className="space-y-4 font-mono">

      {/* Header Banner */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#fe6b00]" />
            <span>GAME IDENTITY VERIFICATION QUEUE</span>
          </h3>
          <p className="text-xs text-[#8e9dae] mt-0.5">
            Review player Game UID & IGN claim evidence before tournament eligibility approval.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30 uppercase">
          {pendingUsers.length} PENDING SUBMISSION(S)
        </span>
      </div>

      {/* Verification Cards List */}
      {pendingUsers.length === 0 ? (
        <div className="p-8 bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#00ff9d] mx-auto" />
          <p className="text-xs text-[#8e9dae]">All submitted game identities have been verified.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingUsers.map((u) => (
            <div
              key={u.id}
              className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff]/40 rounded-xl p-4 space-y-3 shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span className="font-bold text-white text-xs">{u.username}</span>
                  </div>
                  <span className="text-[10px] text-[#8e9dae]">{u.createdAt || 'Recent'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[#07090c] rounded border border-[#3a494b]">
                    <span className="text-[9px] text-[#8e9dae] uppercase block">GAME ARENA</span>
                    <span className="font-bold text-[#00f2ff]">{u.game || 'Free Fire MAX'}</span>
                  </div>

                  <div className="p-2 bg-[#07090c] rounded border border-[#3a494b]">
                    <span className="text-[9px] text-[#8e9dae] uppercase block">GAME UID</span>
                    <span className="font-bold text-[#00ff9d]">{u.gameUid || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-2 bg-[#07090c] rounded border border-[#3a494b] text-xs">
                  <span className="text-[9px] text-[#8e9dae] uppercase block">CLAIMED GAME IGN</span>
                  <span className="font-bold text-white">{u.gameIgn || u.username}</span>
                </div>
              </div>

              {/* Action Control Buttons */}
              <div className="pt-2 border-t border-[#3a494b]/60 space-y-2">
                <button
                  onClick={() => setSelectedEvidence(u)}
                  className="w-full py-1.5 bg-[#07090c] hover:bg-[#1d232c] text-[#8e9dae] hover:text-white border border-[#3a494b] rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3 text-[#00f2ff]" />
                  <span>VIEW EVIDENCE DETAILS</span>
                </button>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    onClick={() => handleAction(u, 'Verified')}
                    disabled={updatingUserId === u.userId}
                    className="py-1.5 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30 rounded text-[10px] font-bold uppercase transition-colors"
                  >
                    VERIFY
                  </button>

                  <button
                    onClick={() => handleAction(u, 'Rejected')}
                    disabled={updatingUserId === u.userId}
                    className="py-1.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold uppercase transition-colors"
                  >
                    REJECT
                  </button>

                  <button
                    onClick={() => handleAction(u, 'Suspended')}
                    disabled={updatingUserId === u.userId}
                    className="py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase transition-colors"
                  >
                    SUSPEND
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Modal Dialog */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedEvidence(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 border-b border-[#3a494b]/60 pb-2">
              <h4 className="font-headline text-sm font-bold text-white uppercase">
                IDENTITY EVIDENCE SUMMARY
              </h4>
              <p className="text-xs text-[#8e9dae]">{selectedEvidence.username} • {selectedEvidence.email}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[10px] text-[#8e9dae] uppercase block">Target Game</span>
                <span className="font-bold text-[#00f2ff]">{selectedEvidence.game || 'Free Fire MAX'}</span>
              </div>
              <div className="p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[10px] text-[#8e9dae] uppercase block">Game UID</span>
                <span className="font-bold text-[#00ff9d]">{selectedEvidence.gameUid || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-[#07090c] rounded border border-[#3a494b]">
                <span className="text-[10px] text-[#8e9dae] uppercase block">OCR IGN Match Target</span>
                <span className="font-bold text-white">{selectedEvidence.gameIgn || selectedEvidence.username}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedEvidence(null)}
              className="w-full py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-white rounded text-xs font-bold uppercase"
            >
              CLOSE EVIDENCE INSPECTOR
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
