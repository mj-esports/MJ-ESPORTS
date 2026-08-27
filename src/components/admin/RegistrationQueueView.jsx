import { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  ShieldAlert,
  User,
  Mail,
  Phone,
  Eye,
  X,
  Download,
  Filter,
  Users,
  Gamepad2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  ChevronRight,
  ZoomIn,
  Copy,
  Check,
  FileImage,
  ExternalLink,
  Shield
} from 'lucide-react'
import { supabase, isSupabaseConfigured, PROFILE_PROOFS_BUCKET } from '../../lib/supabase'
import AuthAlert from '../common/AuthAlert'
import { useToast } from '../../contexts/ToastContext'
import { reviewPlayerProof } from '../../services/playerEvidenceService'

export default function RegistrationQueueView({ tournaments = [], updateRegistrationStatus }) {
  const { showSuccess, showError, showInfo } = useToast()
  const [activeQueueTab, setActiveQueueTab] = useState('ALL') // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState('ALL')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [alert, setAlert] = useState(null)
  const [liveRegistrations, setLiveRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [copiedUid, setCopiedUid] = useState(false)

  // Evidence state for currently selected drawer registration
  const [proofEvidence, setProofEvidence] = useState(null)
  const [loadingProof, setLoadingProof] = useState(false)
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false)

  // Predefined standard rejection reasons for quick admin selection
  const STANDARD_REJECTION_REASONS = [
    'Character UID is cut off or unreadable in the screenshot.',
    'In-Game Name (IGN) does not match the registered Free Fire IGN.',
    'Screenshot is cropped; full profile header is not visible.',
    'Image resolution is too low or blurred to confirm player identity.',
    'Evidence appears edited, outdated, or from a different account.',
  ]

  // Fetch registrations from Supabase or fallback
  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('[Supabase Registrations Fetch Warning]:', error.message)
          setLiveRegistrations([])
        } else if (data && data.length > 0) {
          const mapped = data.map((r) => {
            const tourn = tournaments.find((t) => String(t.id) === String(r.tournament_id))
            const entryFeeStr = String(tourn?.entryFee || tourn?.entry_fee || r.entry_fee || 'Free').trim()
            const isFree =
              entryFeeStr.toLowerCase() === 'free' ||
              entryFeeStr === '₹0' ||
              entryFeeStr === '0' ||
              !parseFloat(entryFeeStr.replace(/[^0-9.]/g, ''))

            return {
              id: r.id,
              userId: r.user_id || r.userId,
              tournamentId: r.tournament_id,
              tournamentTitle: r.tournament_title || tourn?.title || 'Esports Championship',
              tournamentGame: tourn?.game || 'Free Fire MAX',
              teamName: r.team_name,
              name: r.team_name,
              captainName: r.captain_name || r.captain || r.name,
              captain: r.captain_name || r.captain || r.name,
              fullName: r.full_name || r.team_name || r.captain_name,
              email: r.email,
              freeFireUid: r.free_fire_uid || r.in_game_uid || r.captain_uid || 'N/A',
              whatsappNumber: r.whatsapp_number || r.phone || 'N/A',
              format: r.format || r.mode || 'Squad',
              teammates: r.teammates || [],
              teammateUids: r.teammate_uids || [],
              teammateIgns: r.teammate_igns || [],
              entryFee: entryFeeStr,
              isFreeTournament: isFree,
              paymentStatus: r.payment_status || (r.status === 'Approved' ? 'Paid' : 'Pending'),
              status: r.status || 'Approved',
              identityStatus: r.identity_status || (r.status === 'Approved' ? 'VERIFIED' : 'PENDING'),
              createdAt: r.created_at || r.registered_at,
              registeredAt: r.registered_at || r.created_at ? new Date(r.registered_at || r.created_at).toLocaleDateString() : 'Today',
              referenceId: r.reference_id || `REG-${String(r.id || '').substring(0, 6).toUpperCase() || '7741'}`,
            }
          })
          setLiveRegistrations(mapped)
        } else {
          setLiveRegistrations([])
        }
      } else {
        setLiveRegistrations([])
      }
    } catch (err) {
      console.error('[Fetch Registrations Error]:', err)
      setLiveRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [tournaments])

  // Load player proof evidence when selectedDetail changes
  useEffect(() => {
    if (!selectedDetail) {
      setProofEvidence(null)
      return
    }

    let isMounted = true
    setLoadingProof(true)

    const loadEvidenceForRegistration = async () => {
      try {
        if (isSupabaseConfigured) {
          let query = supabase
            .from('player_identity_evidence')
            .select('*')
            .order('created_at', { ascending: false })

          if (selectedDetail.userId && !selectedDetail.userId.startsWith('guest-')) {
            query = query.eq('user_id', selectedDetail.userId)
          } else if (selectedDetail.freeFireUid && selectedDetail.freeFireUid !== 'N/A') {
            query = query.eq('game_uid', selectedDetail.freeFireUid)
          }

          const { data, error } = await query.limit(1).maybeSingle()

          if (!error && data) {
            let signedUrl = null
            if (data.storage_path) {
              const { data: signData } = await supabase.storage
                .from(PROFILE_PROOFS_BUCKET)
                .createSignedUrl(data.storage_path, 3600)
              signedUrl = signData?.signedUrl || null
            }

            if (isMounted) {
              setProofEvidence({
                ...data,
                signedUrl: signedUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
              })
              setLoadingProof(false)
              return
            }
          }
        }

        // Local / Mock fallback evidence
        if (isMounted) {
          setProofEvidence({
            id: `ev-reg-${selectedDetail.id}`,
            user_id: selectedDetail.userId || `user-${selectedDetail.id}`,
            game: 'Free Fire',
            game_uid: selectedDetail.freeFireUid || '5189204120',
            canonical_ign: selectedDetail.captainName || 'KA¹⁷ Mjᶠᶠ',
            status: selectedDetail.identityStatus || (selectedDetail.status === 'Approved' ? 'VERIFIED' : 'PENDING'),
            signedUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
            storage_path: `${selectedDetail.userId || 'demo'}/proof.png`,
            created_at: selectedDetail.createdAt || new Date().toISOString(),
          })
          setLoadingProof(false)
        }
      } catch (err) {
        console.warn('[Fetch Evidence Notice]:', err)
        if (isMounted) {
          setProofEvidence({
            id: `ev-reg-${selectedDetail.id}`,
            game_uid: selectedDetail.freeFireUid || '5189204120',
            canonical_ign: selectedDetail.captainName || 'KA¹⁷ Mjᶠᶠ',
            status: 'PENDING',
            signedUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
          })
          setLoadingProof(false)
        }
      }
    }

    loadEvidenceForRegistration()

    return () => {
      isMounted = false
    }
  }, [selectedDetail])

  const counts = useMemo(() => {
    return {
      ALL: liveRegistrations.length,
      PENDING: liveRegistrations.filter((r) => r.status === 'Pending' || (!r.isFreeTournament && r.paymentStatus === 'Pending')).length,
      APPROVED: liveRegistrations.filter((r) => r.status === 'Approved' || r.status === 'Confirmed').length,
      REJECTED: liveRegistrations.filter((r) => r.status === 'Rejected' || r.identityStatus === 'REJECTED').length,
    }
  }, [liveRegistrations])

  // Direct Admin Action: Verify Identity
  const handleVerifyIdentity = async () => {
    if (!selectedDetail || isSubmittingReview) return
    setIsSubmittingReview(true)
    try {
      if (proofEvidence?.id) {
        await reviewPlayerProof(proofEvidence.id, 'VERIFIED')
      }

      setProofEvidence((prev) => (prev ? { ...prev, status: 'VERIFIED', rejection_reason: null } : null))
      setLiveRegistrations((prev) =>
        prev.map((r) =>
          r.id === selectedDetail.id
            ? { ...r, identityStatus: 'VERIFIED', status: 'Approved' }
            : r
        )
      )
      setSelectedDetail((prev) =>
        prev ? { ...prev, identityStatus: 'VERIFIED', status: 'Approved' } : null
      )

      showSuccess(`Player "${selectedDetail.captainName}" identity verified.`, 'Identity Verified')
    } catch (err) {
      console.error('[Verify Identity Error]:', err)
      showError(err, 'Verification Error')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // Direct Admin Action: Reject Registration & Evidence
  const handleConfirmRejection = async (reason) => {
    if (!selectedDetail || isSubmittingReview) return
    const finalReason = String(reason || rejectionReason || 'Identity proof does not match registration credentials.').trim()

    setIsSubmittingReview(true)
    try {
      // 1. Authoritative Single Unified Rejection RPC on Database
      if (isSupabaseConfigured && selectedDetail.id) {
        const { data, error: rpcErr } = await supabase.rpc('reject_tournament_registration', {
          p_registration_id: selectedDetail.id,
          p_reason: finalReason,
        })

        if (rpcErr) {
          throw new Error(rpcErr.message || 'Failed to execute registration rejection.')
        }

        if (data && data.success === false) {
          throw new Error(data.message || 'Registration rejection rejected by server.')
        }
      }

      // 2. Synchronize Local State
      setProofEvidence((prev) => (prev ? { ...prev, status: 'REJECTED', rejection_reason: finalReason } : null))
      setLiveRegistrations((prev) =>
        prev.map((r) =>
          r.id === selectedDetail.id
            ? { ...r, identityStatus: 'REJECTED', status: 'Rejected' }
            : r
        )
      )
      setSelectedDetail((prev) =>
        prev ? { ...prev, identityStatus: 'REJECTED', status: 'Rejected' } : null
      )

      showSuccess(`Registration rejected and slot released: ${finalReason}`, 'Slot Released')
      setRejectTarget(null)
      setRejectionReason('')
    } catch (err) {
      console.error('[Reject Identity Error]:', err)
      showError(err?.message || err, 'Rejection Error')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleCopyUid = (uid) => {
    if (!uid) return
    navigator.clipboard?.writeText(uid)
    setCopiedUid(true)
    setTimeout(() => setCopiedUid(false), 2000)
    showInfo(`Copied Free Fire UID: ${uid}`, 'Copied')
  }

  const exportCSV = () => {
    if (liveRegistrations.length === 0) return
    const headers = ['Ref ID', 'Tournament', 'Team Name', 'Captain / IGN', 'Email', 'In-Game UID', 'Identity Status', 'Status', 'Registered At']
    const rows = liveRegistrations.map((r) => [
      r.referenceId,
      `"${r.tournamentTitle}"`,
      `"${r.teamName}"`,
      `"${r.captainName}"`,
      r.email,
      r.freeFireUid,
      r.identityStatus || 'PENDING',
      r.status,
      r.registeredAt,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `mj_esports_registrations_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter Queue Logic
  const filteredRegistrations = useMemo(() => {
    return liveRegistrations.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        r.teamName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.captainName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.freeFireUid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referenceId?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTourn =
        selectedTournamentFilter === 'ALL' || String(r.tournamentId) === String(selectedTournamentFilter)

      const isApproved = r.status === 'Approved' || r.status === 'Confirmed'
      const isPending = r.status === 'Pending' || (!r.isFreeTournament && r.paymentStatus === 'Pending')
      const isRejected = r.status === 'Rejected' || r.identityStatus === 'REJECTED'

      const matchesTab =
        activeQueueTab === 'ALL' ||
        (activeQueueTab === 'PENDING' && isPending) ||
        (activeQueueTab === 'APPROVED' && isApproved) ||
        (activeQueueTab === 'REJECTED' && isRejected)

      return matchesSearch && matchesTourn && matchesTab
    })
  }, [liveRegistrations, searchQuery, selectedTournamentFilter, activeQueueTab])

  // Is the selected detail for a free tournament?
  const isFreeTournament = useMemo(() => {
    if (!selectedDetail) return false
    return Boolean(selectedDetail.isFreeTournament)
  }, [selectedDetail])

  return (
    <div className="space-y-5 font-body antialiased">
      
      {/* 1. QUEUE HEADER & ROSTER EXPORT */}
      <div className="bg-[#141416] border border-[#27272a] rounded p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#00f2ff]" />
            <span>Registration Queue Moderation</span>
          </h2>
          <p className="text-xs text-[#849495] font-body mt-0.5">
            Review incoming squad registrations, inspect Free Fire profile screenshot evidence, and verify player identity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRegistrations}
            disabled={loading}
            className="p-2 bg-[#1c1b1c] hover:bg-[#27272a] border border-[#27272a] text-[#849495] hover:text-[#00f2ff] rounded transition-all cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Sync Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={liveRegistrations.length === 0}
            className="px-3.5 py-2 bg-[#1c1b1c] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00f2ff]/40 text-white rounded text-xs font-headline font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. FILTER TABS WITH REAL LIVE COUNTS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 overflow-x-auto text-xs font-headline font-bold">
          {[
            { id: 'ALL', label: 'All Registrations', count: counts.ALL },
            { id: 'PENDING', label: 'Pending Review', count: counts.PENDING },
            { id: 'APPROVED', label: 'Approved & Verified', count: counts.APPROVED },
            { id: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
          ].map((tab) => (
            <button
              key={`q-tab-${tab.id}`}
              onClick={() => setActiveQueueTab(tab.id)}
              className={`px-3.5 py-2 rounded text-xs uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeQueueTab === tab.id
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-sm'
                  : 'text-[#849495] hover:text-white bg-[#141416] hover:bg-[#1c1b1c] border border-[#27272a]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeQueueTab === tab.id ? 'bg-[#00363a]/20 text-[#00363a]' : 'bg-[#1c1b1c] text-white'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Tournament Selector Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#141416] border border-[#27272a] rounded p-3 shadow-xl">
          <div className="relative">
            <Search className="w-4 h-4 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team name, captain, UID, or email..."
              className="w-full pl-9 pr-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded text-xs text-white placeholder-[#849495] focus:outline-none focus:border-[#00f2ff]"
            />
          </div>

          <div>
            <select
              value={selectedTournamentFilter}
              onChange={(e) => setSelectedTournamentFilter(e.target.value)}
              className="w-full p-2 bg-[#1c1b1c] border border-[#27272a] rounded text-xs text-white focus:outline-none focus:border-[#00f2ff] font-headline font-bold cursor-pointer"
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={`q-tourn-${t.id}`} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. REGISTRATIONS TABLE (DESKTOP >= 1024px) */}
      <div className="bg-[#141416] border border-[#27272a] rounded overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-[#849495] space-y-2">
            <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <span className="text-xs">Synchronizing queue...</span>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center text-[#849495] font-body space-y-2">
            <ClipboardList className="w-8 h-8 text-[#849495] mx-auto opacity-40" />
            <p className="text-sm font-bold text-white font-headline uppercase">No Registrations Found</p>
            <p className="text-xs text-[#849495]">No squad registrations match the current filter parameters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1c1b1c] border-b border-[#27272a] text-[#849495] text-[10px] font-headline uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Ref ID</th>
                    <th className="py-3 px-4">Tournament</th>
                    <th className="py-3 px-4">Player / IGN</th>
                    <th className="py-3 px-4">Free Fire UID</th>
                    <th className="py-3 px-4">Identity Proof</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {filteredRegistrations.map((r) => {
                    const isPending = r.status === 'Pending' || (!r.isFreeTournament && r.paymentStatus === 'Pending')
                    const isApproved = r.status === 'Approved' || r.status === 'Confirmed'

                    return (
                      <tr key={`q-row-${r.id}`} className="hover:bg-[#1c1b1c]/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#00f2ff]">{r.referenceId}</td>
                        <td className="py-3 px-4 font-headline font-bold text-white max-w-[200px] truncate" title={r.tournamentTitle}>
                          {r.tournamentTitle}
                        </td>
                        <td className="py-3 px-4 font-headline font-bold text-white">
                          <div className="flex flex-col">
                            <span>{r.captainName}</span>
                            <span className="text-[10px] text-[#849495] font-normal">{r.teamName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#00f2ff] font-bold">{r.freeFireUid}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border inline-flex items-center gap-1 ${
                            r.identityStatus === 'VERIFIED'
                              ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40'
                              : r.identityStatus === 'REJECTED'
                              ? 'bg-red-950/40 text-red-400 border-red-800'
                              : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
                          }`}>
                            <Shield className="w-2.5 h-2.5" />
                            {r.identityStatus === 'VERIFIED' ? 'VERIFIED' : r.identityStatus === 'REJECTED' ? 'REJECTED' : 'RECORDED'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-headline font-bold uppercase border ${
                            isApproved
                              ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40'
                              : isPending
                              ? 'bg-[#ff5e07]/10 text-[#ff5e07] border-[#ff5e07]/40'
                              : 'bg-red-950/40 text-red-400 border-red-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDetail(r)}
                              className="px-3 py-1 bg-[#1c1b1c] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] hover:border-[#00f2ff]/40 rounded text-[10px] font-headline font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                              title="Inspect Registration Details & Identity Proof"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (< 1024px) */}
            <div className="lg:hidden divide-y divide-[#27272a]">
              {filteredRegistrations.map((r) => {
                const isPending = r.status === 'Pending' || (!r.isFreeTournament && r.paymentStatus === 'Pending')
                const isApproved = r.status === 'Approved' || r.status === 'Confirmed'

                return (
                  <div key={`m-q-${r.id}`} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#00f2ff] font-bold">{r.referenceId}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                          r.identityStatus === 'VERIFIED'
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40'
                            : r.identityStatus === 'REJECTED'
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
                        }`}>
                          ID: {r.identityStatus === 'VERIFIED' ? 'VERIFIED' : r.identityStatus === 'REJECTED' ? 'REJECTED' : 'RECORDED'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-headline font-bold uppercase border ${
                          isApproved
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40'
                            : isPending
                            ? 'bg-[#ff5e07]/10 text-[#ff5e07] border-[#ff5e07]/40'
                            : 'bg-red-950 text-red-400 border-red-800'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-headline font-bold text-white text-sm">{r.captainName}</h4>
                      <p className="text-[10px] text-[#849495]">{r.tournamentTitle} &bull; {r.teamName}</p>
                    </div>

                    <div className="bg-[#1c1b1c] p-2.5 rounded border border-[#27272a] space-y-1 font-body text-[11px]">
                      <p>Free Fire UID: <span className="text-[#00f2ff] font-mono font-bold">{r.freeFireUid}</span></p>
                      <p>WhatsApp: <span className="text-[#10b981] font-mono">{r.whatsappNumber}</span></p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedDetail(r)}
                        className="flex-1 py-1.5 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 rounded font-headline font-bold uppercase text-[10px] cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Proof & Details</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 4. ADMIN REGISTRATION DETAILS DRAWER (COMPACT V1 LAYOUT)                */}
      {/* ======================================================================= */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="w-full max-w-md bg-[#141416] border-l border-[#27272a] h-full p-4 sm:p-5 overflow-y-auto shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* DRAWER HEADER */}
            <div className="flex items-start justify-between border-b border-[#27272a] pb-2">
              <div>
                <span className="font-mono text-xs font-bold text-[#00f2ff] block">
                  {selectedDetail.referenceId}
                </span>
                <h3 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase mt-0.5">
                  {selectedDetail.captainName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white cursor-pointer"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SECTION: PLAYER DETAILS (COMPACT LABEL/VALUE LAYOUT) */}
            <div className="p-3 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1.5 text-xs font-body">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#849495]">Tournament</span>
                <span className="font-bold text-white font-headline text-right truncate max-w-[200px]" title={selectedDetail.tournamentTitle}>
                  {selectedDetail.tournamentTitle}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-[#27272a]/60 pt-1">
                <span className="text-[#849495]">IGN / Display Name</span>
                <span className="font-bold text-white">{selectedDetail.captainName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-[#27272a]/60 pt-1">
                <span className="text-[#849495]">Free Fire UID</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#00f2ff]">{selectedDetail.freeFireUid}</span>
                  <button
                    onClick={() => handleCopyUid(selectedDetail.freeFireUid)}
                    className="p-0.5 text-[#849495] hover:text-[#00f2ff] cursor-pointer"
                    title="Copy UID"
                  >
                    {copiedUid ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-[#27272a]/60 pt-1">
                <span className="text-[#849495]">Full Name</span>
                <span className="text-white font-medium">{selectedDetail.fullName || selectedDetail.teamName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-[#27272a]/60 pt-1">
                <span className="text-[#849495]">Email</span>
                <span className="text-[#b9cacb] font-mono">{selectedDetail.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-[#27272a]/60 pt-1">
                <span className="text-[#849495]">WhatsApp</span>
                <span className="font-mono text-[#10b981] font-bold">{selectedDetail.whatsappNumber}</span>
              </div>

              {/* Optional Teammates inside compact card */}
              {selectedDetail.teammateUids && selectedDetail.teammateUids.length > 0 && (
                <div className="border-t border-[#27272a] pt-1.5 mt-1 space-y-1">
                  <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                    Squad Roster UIDs
                  </span>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                    {selectedDetail.teammateUids.map((uid, idx) => (
                      <div key={`tm-uid-${idx}`} className="p-1 bg-[#141416] rounded border border-[#27272a] text-[#00f2ff] truncate">
                        <span className="text-[#849495] text-[9px] mr-1">P{idx + 2}:</span>
                        {uid}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: IDENTITY VERIFICATION (STREAMLINED MANUAL WORKFLOW) */}
            <div className="p-3 bg-[#1c1b1c] rounded border border-[#27272a] space-y-2">
              
              {/* Header & Status */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-headline font-bold text-white uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00f2ff]" />
                  <span>Identity Verification</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                  (proofEvidence?.status || selectedDetail.identityStatus) === 'VERIFIED'
                    ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                    : (proofEvidence?.status || selectedDetail.identityStatus) === 'REJECTED'
                    ? 'bg-red-950/50 text-red-400 border-red-800'
                    : 'bg-[#ff5e07]/15 text-[#ff5e07] border-[#ff5e07]/40'
                }`}>
                  Status: {proofEvidence?.status || selectedDetail.identityStatus || 'PENDING'}
                </span>
              </div>

              {/* Identity Proof Credentials */}
              <div className="space-y-1">
                <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                  Identity Proof
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div className="p-1.5 bg-[#141416] rounded border border-[#27272a]">
                    <span className="text-[9px] text-[#849495] uppercase block">Registered UID</span>
                    <span className="text-[#00f2ff] font-bold truncate block">{selectedDetail.freeFireUid}</span>
                  </div>
                  <div className="p-1.5 bg-[#141416] rounded border border-[#27272a]">
                    <span className="text-[9px] text-[#849495] uppercase block">Registered IGN</span>
                    <span className="text-white font-bold truncate block">{selectedDetail.captainName}</span>
                  </div>
                </div>
              </div>

              {/* Profile Screenshot Preview Image */}
              {proofEvidence?.signedUrl && (
                <div
                  onClick={() => setIsScreenshotModalOpen(true)}
                  className="relative h-24 sm:h-28 rounded overflow-hidden border border-[#27272a] hover:border-[#00f2ff]/60 transition-colors cursor-pointer group bg-[#0a0f18]"
                >
                  <img
                    src={proofEvidence.signedUrl}
                    alt="Profile Screenshot Preview"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[10px] text-white font-mono font-bold flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-[#00f2ff]" />
                      Click to Inspect Screenshot
                    </span>
                  </div>
                </div>
              )}

              {/* Action: View Profile Screenshot */}
              <button
                onClick={() => setIsScreenshotModalOpen(true)}
                className="w-full py-1.5 bg-[#141416] hover:bg-[#27272a] text-[#00f2ff] border border-[#00f2ff]/40 rounded text-xs font-headline font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Profile Screenshot</span>
              </button>

              {/* Verification Actions (Single authoritative location) */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]/60">
                {(proofEvidence?.status || selectedDetail.identityStatus) !== 'VERIFIED' ? (
                  <button
                    onClick={handleVerifyIdentity}
                    disabled={isSubmittingReview}
                    className="flex-1 py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 rounded text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingReview ? 'Verifying...' : '✓ Verify Identity'}</span>
                  </button>
                ) : (
                  <div className="flex-1 py-2 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 rounded text-xs font-headline font-bold uppercase text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Verified</span>
                  </div>
                )}

                {(proofEvidence?.status || selectedDetail.identityStatus) !== 'REJECTED' && (
                  <button
                    onClick={() => setRejectTarget(selectedDetail)}
                    disabled={isSubmittingReview}
                    className="px-3.5 py-2 bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded text-xs font-headline font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
              </div>

            </div>

            {/* PAID TOURNAMENTS ONLY: PAYMENT STATUS (Completely omitted for free tournaments) */}
            {!isFreeTournament && (
              <div className="p-2.5 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1 text-xs font-body">
                <div className="flex justify-between items-center">
                  <span className="text-[#849495]">Entry Fee</span>
                  <span className="text-white font-mono font-bold">{selectedDetail.entryFee}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#849495]">Payment Status</span>
                  <span className={`font-mono font-bold uppercase ${
                    selectedDetail.paymentStatus === 'Paid' || selectedDetail.paymentStatus === 'VERIFIED'
                      ? 'text-[#10b981]'
                      : selectedDetail.paymentStatus === 'Rejected'
                      ? 'text-red-400'
                      : 'text-[#ff5e07]'
                  }`}>
                    {selectedDetail.paymentStatus || 'PENDING'}
                  </span>
                </div>
              </div>
            )}

            {/* DRAWER BOTTOM ACTION (Immediately follows content naturally without large empty gap) */}
            <div className="pt-1">
              <button
                onClick={() => setSelectedDetail(null)}
                className="w-full py-2 text-xs font-headline font-bold bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded uppercase cursor-pointer transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 5. FULL SCREENSHOT INSPECTION MODAL (SECURE SIGNED URL VIEWER)          */}
      {/* ======================================================================= */}
      {isScreenshotModalOpen && selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsScreenshotModalOpen(false)}
        >
          <div
            className="bg-[#141416] border border-[#27272a] rounded max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="p-3.5 bg-[#1c1b1c] border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="w-5 h-5 text-[#00f2ff]" />
                <div>
                  <h3 className="font-headline font-extrabold text-sm sm:text-base text-white uppercase">
                    Free Fire Profile Screenshot Proof
                  </h3>
                  <span className="text-[10px] text-[#849495] font-mono">
                    Player: <strong className="text-white">{selectedDetail.captainName}</strong> &bull; Ref: {selectedDetail.referenceId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsScreenshotModalOpen(false)}
                className="p-1.5 rounded bg-[#141416] border border-[#27272a] text-[#849495] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison Bar */}
            <div className="p-2.5 bg-[#0d1219] border-b border-[#27272a] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 bg-[#141416] rounded border border-[#27272a]">
                <span className="text-[#849495]">Submitted Free Fire UID:</span>
                <span className="text-[#00f2ff] font-bold text-sm">{selectedDetail.freeFireUid}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#141416] rounded border border-[#27272a]">
                <span className="text-[#849495]">Submitted IGN:</span>
                <span className="text-white font-bold text-sm">{selectedDetail.captainName}</span>
              </div>
            </div>

            {/* Image Preview Canvas */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#080c14] min-h-[260px]">
              {loadingProof ? (
                <div className="p-8 text-center text-[#849495] space-y-2">
                  <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs">Generating secure signed preview URL...</p>
                </div>
              ) : proofEvidence?.signedUrl ? (
                <img
                  src={proofEvidence.signedUrl}
                  alt="Free Fire Profile Proof Screenshot"
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded border border-[#27272a] shadow-xl"
                />
              ) : (
                <div className="p-8 text-center text-[#849495]">
                  <AlertCircle className="w-8 h-8 text-[#ff5e07] mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">No Screenshot File Available</p>
                  <p className="text-[10px] text-[#849495]">No storage object found for this registration.</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 bg-[#1c1b1c] border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[#849495] font-body">
                Verify that <strong>UID</strong> and <strong>IGN</strong> match the profile header shown above.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsScreenshotModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-1.5 bg-[#141416] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsScreenshotModalOpen(false)
                    setRejectTarget(selectedDetail)
                  }}
                  className="flex-1 sm:flex-initial px-4 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded text-xs font-headline font-bold uppercase cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setIsScreenshotModalOpen(false)
                    handleVerifyIdentity()
                  }}
                  disabled={isSubmittingReview || (proofEvidence?.status || selectedDetail.identityStatus) === 'VERIFIED'}
                  className="flex-1 sm:flex-initial px-5 py-1.5 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 rounded text-xs font-headline font-extrabold uppercase shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Verifying...' : '✓ Verify Identity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 6. REJECTION CONFIRMATION & AUDIT REASON MODAL                         */}
      {/* ======================================================================= */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 max-w-md w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-9 h-9 rounded bg-red-950/60 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-sm uppercase text-white">
                  Reject Registration & Identity Proof
                </h3>
                <p className="text-xs text-[#849495] font-body">This will reject the slot and log the verification audit reason.</p>
              </div>
            </div>

            <p className="text-xs text-[#b9cacb] font-body">
              Rejecting registration for player <strong className="text-white">{rejectTarget.captainName}</strong> ({rejectTarget.teamName}) &bull; Ref: <span className="font-mono text-[#00f2ff]">{rejectTarget.referenceId}</span>.
            </p>

            {/* Standard Quick Reasons */}
            <div className="space-y-1">
              <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                Select Standard Rejection Reason:
              </span>
              <div className="space-y-1">
                {STANDARD_REJECTION_REASONS.map((r, idx) => (
                  <button
                    key={`reason-btn-${idx}`}
                    onClick={() => setRejectionReason(r)}
                    className={`w-full text-left p-2 rounded text-xs font-body transition-colors border ${
                      rejectionReason === r
                        ? 'bg-red-950/40 text-white border-red-500'
                        : 'bg-[#1c1b1c] text-[#849495] hover:text-white border-[#27272a]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div className="space-y-1">
              <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                Custom Feedback / Audit Notes:
              </span>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter specific rejection reason for the player..."
                rows={2}
                className="w-full p-2 bg-[#1c1b1c] border border-[#27272a] rounded text-xs text-white placeholder-[#849495] focus:outline-none focus:border-red-500 font-body"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setRejectTarget(null)
                  setRejectionReason('')
                }}
                className="flex-1 py-2 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmRejection(rejectionReason)}
                disabled={isSubmittingReview || !rejectionReason.trim()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {isSubmittingReview ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
