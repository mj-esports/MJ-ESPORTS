import { useState, useEffect } from 'react'
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
  Mail,
  FileImage,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertTriangle,
  ZoomIn,
  RotateCcw
} from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import { listPendingProofs, reviewPlayerProof } from '../../../services/playerEvidenceService'

export default function IdentityVerificationQueue({ users = [], onUpdateStatus, updatingUserId }) {
  const { showSuccess, showError, showInfo } = useToast()
  
  const [evidenceList, setEvidenceList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('PENDING') // 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  const [selectedProof, setSelectedProof] = useState(null)
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionTarget, setRejectionTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionActionType, setRejectionActionType] = useState('REJECTED') // 'REJECTED' | 'REQUIRES_REUPLOAD'
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Predefined standard rejection reasons
  const STANDARD_REASONS = [
    'Character UID is cut off or unreadable in the screenshot.',
    'In-Game Name (IGN) does not match the registered canonical IGN.',
    'Screenshot is cropped; full profile header is not visible.',
    'Image resolution is too low / blurred to confirm player identity.',
    'Evidence appears edited, outdated, or from a different account.',
  ]

  const fetchEvidence = async () => {
    setLoading(true)
    try {
      const liveProofs = await listPendingProofs()
      if (liveProofs && liveProofs.length > 0) {
        setEvidenceList(liveProofs)
      } else {
        setEvidenceList([])
      }
    } catch (err) {
      console.error('[Fetch Evidence Error]:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvidence()
  }, [users])

  const filteredEvidence = evidenceList.filter((item) => {
    if (filterStatus === 'ALL') return true
    return item.status === filterStatus
  })

  // Handle Approve / Verify Action
  const handleVerify = async (item) => {
    setIsSubmitting(true)
    try {
      await reviewPlayerProof(item.id, 'VERIFIED')
      
      // Update local evidence state
      setEvidenceList((prev) =>
        prev.map((ev) => (ev.id === item.id ? { ...ev, status: 'VERIFIED', rejection_reason: null } : ev))
      )
      
      if (onUpdateStatus) {
        await onUpdateStatus(item.user_id, 'Verified')
      }

      showSuccess(`Player ${item.canonical_ign || item.username} verified successfully.`, 'Identity Proof Approved')
      if (selectedProof?.id === item.id) {
        setSelectedProof(null)
      }
    } catch (err) {
      showError(err.message || 'Failed to verify evidence.', 'Verification Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Rejection Modal
  const handleOpenReject = (item, actionType = 'REJECTED') => {
    setRejectionTarget(item)
    setRejectionActionType(actionType)
    setRejectionReason(STANDARD_REASONS[0])
    setIsRejectModalOpen(true)
  }

  // Confirm Rejection / Require Re-upload
  const handleConfirmRejection = async () => {
    if (!rejectionTarget) return
    if (!rejectionReason.trim()) {
      showError('Please provide a reason for rejecting the evidence.', 'Reason Required')
      return
    }

    setIsSubmitting(true)
    try {
      await reviewPlayerProof(rejectionTarget.id, rejectionActionType, rejectionReason.trim())

      setEvidenceList((prev) =>
        prev.map((ev) =>
          ev.id === rejectionTarget.id
            ? { ...ev, status: rejectionActionType, rejection_reason: rejectionReason.trim() }
            : ev
        )
      )

      if (onUpdateStatus) {
        await onUpdateStatus(rejectionTarget.user_id, rejectionActionType === 'REQUIRES_REUPLOAD' ? 'Pending' : 'Rejected')
      }

      showSuccess(
        `Player ${rejectionTarget.canonical_ign || rejectionTarget.username} marked as "${rejectionActionType}".`,
        'Evidence Decision Saved'
      )
      setIsRejectModalOpen(false)
      setRejectionTarget(null)
      if (selectedProof?.id === rejectionTarget.id) {
        setSelectedProof(null)
      }
    } catch (err) {
      showError(err.message || 'Failed to save rejection decision.', 'Decision Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 font-mono">

      {/* Header Banner & Filters */}
      <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FFB900]" />
            <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide">
              PLAYER IDENTITY EVIDENCE AUDIT CONSOLE
            </h3>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Audit player Free Fire profile screenshot proofs linking UID and exact IGN before tournament participation.
          </p>
        </div>

        {/* Filter Pills & Sync Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#000000] p-1 rounded-none border border-[#27272A]">
            {[
              { id: 'PENDING', label: 'Pending Review', count: evidenceList.filter((e) => e.status === 'PENDING').length },
              { id: 'VERIFIED', label: 'Verified', count: evidenceList.filter((e) => e.status === 'VERIFIED').length },
              { id: 'REJECTED', label: 'Rejected', count: evidenceList.filter((e) => e.status === 'REJECTED' || e.status === 'REQUIRES_REUPLOAD').length },
              { id: 'ALL', label: 'All Proofs', count: evidenceList.length },
            ].map((f) => (
              <button
                key={`proof-filt-${f.id}`}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-none text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === f.id
                    ? 'bg-[#FFB900] text-black shadow-md'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1 py-0.2 rounded-none text-[9px] ${filterStatus === f.id ? 'bg-black text-[#FFB900]' : 'bg-[#111215] text-[#A1A1AA]'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={fetchEvidence}
            className="p-2 bg-[#000000] hover:bg-[#18181B] text-[#FFB900] border border-[#27272A] rounded-none transition-all cursor-pointer"
            title="Refresh Evidence Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Evidence Grid */}
      {filteredEvidence.length === 0 ? (
        <div className="p-12 bg-[#111215] border border-[#27272A]/60 rounded-none text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto opacity-80" />
          <h4 className="font-headline text-sm font-bold text-white uppercase">No Evidence Records in this Category</h4>
          <p className="text-xs text-[#A1A1AA]">All player profile evidence in "{filterStatus}" state has been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredEvidence.map((item) => (
            <div
              key={`ev-card-${item.id}`}
              className="bg-[#111215] border border-[#27272A]/60 hover:border-[#FFB900]/50 rounded-none p-5 shadow-xl transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                {/* Header: Player Info + Status Badge */}
                <div className="flex items-center justify-between border-b border-[#27272A]/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-none bg-[#000000] border border-[#FFB900]/40 flex items-center justify-center text-[#FFB900] font-bold text-xs">
                      {(item.canonical_ign || item.username || 'P')[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">{item.canonical_ign || item.username}</span>
                      <span className="text-[10px] text-[#A1A1AA]">{item.email || 'Registered User'}</span>
                    </div>
                  </div>

                  <div>
                    {item.status === 'VERIFIED' && (
                      <span className="px-2.5 py-1 rounded-none text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                    {item.status === 'PENDING' && (
                      <span className="px-2.5 py-1 rounded-none text-[10px] font-bold bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Audit
                      </span>
                    )}
                    {(item.status === 'REJECTED' || item.status === 'REQUIRES_REUPLOAD') && (
                      <span className="px-2.5 py-1 rounded-none text-[10px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {item.status === 'REQUIRES_REUPLOAD' ? 'Re-upload' : 'Rejected'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-Way Identity Verification Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  
                  {/* 1. Registered Database Identity (4 Cols) */}
                  {/* 1. Registered Player Data (6 Cols) */}
                  <div className="md:col-span-6 bg-[#000000] p-3.5 rounded-none border border-[#27272A] space-y-2.5">
                    <span className="text-[9px] text-[#FFB900] font-bold uppercase block tracking-wider">
                      PLAYER IDENTITY DETAILS
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#A1A1AA] uppercase block">Game UID</span>
                        <span className="font-bold text-[#10B981] font-mono text-sm block">{item.game_uid}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#A1A1AA] uppercase block">Platform Username</span>
                        <span className="font-bold text-white text-sm block truncate">{item.username || 'Player'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#A1A1AA] uppercase block">Exact Canonical IGN</span>
                      <span className="font-bold text-white font-mono block break-all">{item.canonical_ign || item.username}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#A1A1AA] uppercase block">Normalized Key</span>
                      <span className="text-[10px] text-[#A1A1AA] font-mono block">{item.normalized_ign || (item.canonical_ign || '').toLowerCase()}</span>
                    </div>
                  </div>

                  {/* 2. Original Uploaded Screenshot Proof (6 Cols) */}
                  <div className="md:col-span-6 bg-[#000000] p-2.5 rounded-none border border-[#27272A] flex flex-col justify-between relative group">
                    <div className="aspect-video w-full rounded-none overflow-hidden bg-black flex items-center justify-center relative">
                      {item.signedUrl ? (
                        <img
                          src={item.signedUrl}
                          alt="Free Fire Profile Proof Screenshot"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center p-2 text-[#A1A1AA]">
                          <FileImage className="w-5 h-5 mx-auto opacity-60" />
                          <span className="text-[9px] block">No image</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedProof(item)
                          setIsZoomOpen(true)
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-bold uppercase cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4 text-[#FFB900]" />
                        <span>Inspect Full Screenshot</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 px-1 text-[9px] text-[#A1A1AA]">
                      <span>Uploaded {new Date(item.created_at).toLocaleDateString()}</span>
                      <span className="text-[#FFB900] font-bold">Screenshot Evidence</span>
                    </div>
                  </div>

                </div>

                {/* Display Rejection Reason if any */}
                {item.rejection_reason && (
                  <div className="p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-none text-[11px] text-[#EF4444]">
                    <strong>Rejection Reason:</strong> {item.rejection_reason}
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#27272A]/60 flex items-center gap-2">
                <button
                  onClick={() => handleVerify(item)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-[#10B981] hover:bg-[#10B981]/90 text-black text-xs font-black uppercase tracking-wider rounded-none transition-all  flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verify Evidence</span>
                </button>

                <button
                  onClick={() => handleOpenReject(item, 'REJECTED')}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 rounded-none text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Reject
                </button>

                <button
                  onClick={() => handleOpenReject(item, 'REQUIRES_REUPLOAD')}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-[#FF8C00]/10 hover:bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/30 rounded-none text-xs font-bold uppercase transition-all cursor-pointer"
                  title="Require Player to Re-upload Proof"
                >
                  Re-upload
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* FULL SCREENSHOT INSPECTION MODAL (ZOOM) */}
      {isZoomOpen && selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111215] border border-[#27272A] rounded-none max-w-4xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setIsZoomOpen(false)
                setSelectedProof(null)
              }}
              className="absolute top-4 right-4 p-2 rounded-none bg-[#000000] border border-[#27272A] text-[#A1A1AA] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-[#27272A]/60 pb-3">
              <div>
                <h4 className="font-headline text-base font-bold text-white uppercase flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FFB900]" />
                  <span>Evidence Inspection: {selectedProof.canonical_ign || selectedProof.username}</span>
                </h4>
                <p className="text-xs text-[#A1A1AA]">Registered Game UID: {selectedProof.game_uid}</p>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-none border border-[#27272A] bg-black p-2 flex items-center justify-center">
              <img
                src={selectedProof.signedUrl}
                alt="Full Free Fire Profile Proof Screenshot"
                className="max-w-full h-auto object-contain rounded-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#A1A1AA]">Inspect UID and IGN matches against registered profile.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleVerify(selectedProof)
                    setIsZoomOpen(false)
                  }}
                  className="px-4 py-2 bg-[#10B981] text-black rounded-none text-xs font-black uppercase hover:bg-[#10B981]/90 cursor-pointer"
                >
                  Verify Now
                </button>
                <button
                  onClick={() => {
                    setIsZoomOpen(false)
                    handleOpenReject(selectedProof, 'REJECTED')
                  }}
                  className="px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-none text-xs font-bold uppercase hover:bg-[#EF4444]/20 cursor-pointer"
                >
                  Reject Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {isRejectModalOpen && rejectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111215] border border-[#EF4444]/40 rounded-none max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setIsRejectModalOpen(false)
                setRejectionTarget(null)
              }}
              className="absolute top-4 right-4 p-2 rounded-none bg-[#000000] border border-[#27272A] text-[#A1A1AA] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-[#27272A]/60 pb-3 space-y-1">
              <h4 className="font-headline text-base font-bold text-[#EF4444] uppercase flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>{rejectionActionType === 'REQUIRES_REUPLOAD' ? 'Request Re-upload' : 'Reject Profile Evidence'}</span>
              </h4>
              <p className="text-xs text-[#A1A1AA]">
                Player: <strong className="text-white">{rejectionTarget.canonical_ign || rejectionTarget.username}</strong> (UID: {rejectionTarget.game_uid})
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">Select Rejection / Feedback Reason</label>
              
              <div className="space-y-1.5">
                {STANDARD_REASONS.map((reason, idx) => (
                  <label
                    key={`std-rsn-${idx}`}
                    className="flex items-start gap-2.5 p-2.5 rounded-none bg-[#000000] border border-[#27272A] hover:border-[#FFB900]/40 cursor-pointer text-[#A1A1AA] hover:text-white"
                  >
                    <input
                      type="radio"
                      name="rejection_preset"
                      checked={rejectionReason === reason}
                      onChange={() => setRejectionReason(reason)}
                      className="mt-0.5"
                    />
                    <span className="leading-snug">{reason}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-[#A1A1AA] uppercase block">Custom Note to Player</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full bg-[#000000] border border-[#27272A] focus:border-[#EF4444] rounded-none p-2.5 text-xs text-white focus:outline-none"
                  placeholder="Provide specific feedback..."
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]/60">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false)
                  setRejectionTarget(null)
                }}
                className="px-4 py-2 bg-[#000000] border border-[#27272A] text-[#A1A1AA] hover:text-white rounded-none text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#EF4444] text-white rounded-none text-xs font-extrabold uppercase hover:bg-[#EF4444]/90 transition-all  cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
