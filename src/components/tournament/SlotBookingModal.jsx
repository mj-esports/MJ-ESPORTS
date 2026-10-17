import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  X,
  Users,
  Mail,
  User,
  ShieldCheck,
  Phone,
  CheckCircle2,
  Copy,
  Shield,
  Trophy,
  Sparkles,
  Smartphone,
  Upload,
  FileImage,
  Wallet,
  AlertTriangle
} from 'lucide-react'
import { useTournaments } from '../../contexts/TournamentContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { uploadProfileProof } from '../../services/playerEvidenceService'
import {
  fetchUserWallet,
  generateWalletRegistrationIdempotencyKey
} from '../../services/walletService'
import {
  createTournamentOrder,
  verifyTournamentPayment,
  launchRazorpayCheckout,
} from '../../services/tournamentPaymentService'
import { getMyTeamPortalData } from '../../services/teamService'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import TurnstileWidget from '../common/TurnstileWidget'
import { isTurnstileEnabled, verifyTurnstileToken } from '../../services/turnstileService'
import { OFFICIAL_MJ_RULES } from '../common/OfficialRulebook'
import {
  toCanonicalIgn,
  normalizeIgn,
  isValidIgn,
} from '../../utils/playerIdentityUtils'
import {
  isValidEmail,
  isValidGameUid,
  isValidPhoneNumber,
  isValidTeamName,
  sanitizeString,
  sanitizeDigitsOnly,
} from '../../utils/validationUtils'
import {
  getTournamentMode,
} from '../../utils/tournamentUtils'

export { getTournamentMode }

export default function SlotBookingModal({ tournament, onClose, onRegistered }) {
  const { registerTeam, registerTeamWithWallet } = useTournaments()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  // Profile Proof Attachment State
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState('')
  const [showRulebook, setShowRulebook] = useState(false)

  // Phase 9.3: Wallet Payment State
  const [walletData, setWalletData] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletIdempotencyKey, setWalletIdempotencyKey] = useState(null)

  // Lock body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const modeConfig = getTournamentMode(tournament)

  // Authoritative Mode Resolution:
  // Normalizes tournament.format, tournament.mode, tournament.match_format, tournament.matchFormat,
  // team_size, and modeConfig to guarantee robust format detection across all data representations.
  const rawModeString = (
    tournament?.mode ||
    tournament?.format ||
    tournament?.match_format ||
    tournament?.matchFormat ||
    modeConfig?.mode ||
    ''
  ).toLowerCase().trim()

  const rawTeamSize = Number(tournament?.team_size ?? tournament?.teamSize ?? 0)

  let registrationMode = 'SQUAD'
  if (
    rawModeString.includes('solo') ||
    rawModeString.includes('(1p)') ||
    rawTeamSize === 1 ||
    modeConfig?.mode === 'Solo'
  ) {
    registrationMode = 'SOLO'
  } else if (
    rawModeString.includes('duo') ||
    rawModeString.includes('(2p)') ||
    rawTeamSize === 2 ||
    modeConfig?.mode === 'Duo'
  ) {
    registrationMode = 'DUO'
  }

  const isSolo = registrationMode === 'SOLO'
  const isDuo = registrationMode === 'DUO'
  const isSquad = registrationMode === 'SQUAD'

  const mode = isSolo ? 'Solo' : isDuo ? 'Duo' : 'Squad'

  const [formData, setFormData] = useState({
    teamName: '',
    playerIgn: user?.user_metadata?.username || '',
    captainName: user?.user_metadata?.fullName || user?.user_metadata?.username || '',
    email: user?.email || '',
    freeFireUid: user?.user_metadata?.freeFireUid || '',
    whatsappNumber: '',
    availabilityDate: tournament?.startDate || '2026-08-06',
    acceptRules: false,
    teammates: ['', '', ''],
    teammateIgns: ['', '', ''],
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [registrationSummary, setRegistrationSummary] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingStep, setSubmittingStep] = useState('')
  const [copied, setCopied] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  // N3.5: Team Auto-Fill State
  const [isTeamLoading, setIsTeamLoading] = useState(false)
  const [pendingTeamToApply, setPendingTeamToApply] = useState(null)
  const [showNoTeamModal, setShowNoTeamModal] = useState(false)
  const [populatedTeamInfo, setPopulatedTeamInfo] = useState(null)

  /**
   * N3.5: Executes client-side form state auto-population from authoritative team portal data.
   * Strictly populates React form state without mutating the database or creating registrations.
   */
  const executeApplyTeamData = (portalData) => {
    if (!portalData?.team) return

    const team = portalData.team
    const members = Array.isArray(portalData.members) ? portalData.members : []

    // Identify current player or captain in the squad
    const currentMember =
      members.find((m) => m.user_id === user?.id) ||
      members.find((m) => m.role === 'Captain') ||
      members[0]

    const captainIgn = currentMember?.player_name || user?.user_metadata?.username || formData.captainName
    const captainUid = currentMember?.game_uid || user?.user_metadata?.freeFireUid || formData.freeFireUid

    // Other members for Duo / Squad slots
    const otherMembers = members.filter((m) => m.user_id !== (currentMember?.user_id || user?.id))
    const regularMembers = otherMembers.filter((m) => m.role === 'Member')
    const substituteMembers = otherMembers.filter((m) => m.role === 'Substitute')
    const prioritizedTeammates = [...regularMembers, ...substituteMembers]

    if (mode === 'Solo') {
      setFormData((prev) => ({
        ...prev,
        teamName: team.name || prev.teamName,
        captainName: captainIgn,
        freeFireUid: captainUid,
        teammates: ['', '', ''],
        teammateIgns: ['', '', ''],
      }))

      setPopulatedTeamInfo({
        name: team.name,
        tag: team.tag,
        captain: captainIgn,
        captainUid,
        members: [],
      })

      showSuccess('Selected your active player profile for Solo mode.')
    } else if (mode === 'Duo') {
      if (prioritizedTeammates.length === 0) {
        showError(
          'Active squad has no teammate for Duo mode (1 teammate required). Add members in Team Management or enter teammate details manually.',
          'Insufficient Teammates'
        )
        return
      }

      const teammate = prioritizedTeammates[0]
      setFormData((prev) => ({
        ...prev,
        teamName: team.name || prev.teamName,
        captainName: captainIgn,
        freeFireUid: captainUid,
        teammates: [teammate.game_uid || '', '', ''],
        teammateIgns: [teammate.player_name || '', '', ''],
      }))

      setPopulatedTeamInfo({
        name: team.name,
        tag: team.tag,
        captain: captainIgn,
        captainUid,
        members: [
          {
            name: teammate.player_name,
            uid: teammate.game_uid,
            role: teammate.role,
          },
        ],
      })

      showSuccess(`Active squad roster applied for Duo mode (${team.name}).`)
    } else if (mode === 'Squad') {
      const mappedTeammates = ['', '', '']
      const mappedTeammateIgns = ['', '', '']
      const maxSlots = 3

      const selected = prioritizedTeammates.slice(0, maxSlots)
      selected.forEach((m, idx) => {
        mappedTeammates[idx] = m.game_uid || ''
        mappedTeammateIgns[idx] = m.player_name || ''
      })

      setFormData((prev) => ({
        ...prev,
        teamName: team.name || prev.teamName,
        captainName: captainIgn,
        freeFireUid: captainUid,
        teammates: mappedTeammates,
        teammateIgns: mappedTeammateIgns,
      }))

      setPopulatedTeamInfo({
        name: team.name,
        tag: team.tag,
        captain: captainIgn,
        captainUid,
        members: selected.map((m) => ({
          name: m.player_name,
          uid: m.game_uid,
          role: m.role,
        })),
      })

      if (selected.length < 3) {
        showSuccess(
          `Squad roster populated with ${selected.length} teammate(s). Please fill remaining ${3 - selected.length} slot(s).`
        )
      } else {
        showSuccess(`Full squad roster populated from ${team.name}.`)
      }
    }

    // Clear validation errors on newly populated fields
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.teamName
      delete next.captainName
      delete next.freeFireUid
      delete next.teammates
      delete next.teammate_0
      delete next.teammate_1
      delete next.teammate_2
      delete next.teammate_ign_0
      delete next.teammate_ign_1
      delete next.teammate_ign_2
      return next
    })
  }

  /**
   * N3.5: Handler for "Use My Team" button click.
   * Fetches fresh portal data via teamService.getMyTeamPortalData() and guards existing manual input.
   */
  const handleUseMyTeamClick = async () => {
    if (!user?.id) {
      showError('Please sign in to access your squad roster.', 'Authentication Required')
      return
    }

    setIsTeamLoading(true)
    try {
      const res = await getMyTeamPortalData()
      if (!res?.success) {
        showError(res?.error || 'Unable to fetch squad details. Please try again.', 'Squad Fetch Failed')
        return
      }

      if (!res.has_team || !res.team) {
        setShowNoTeamModal(true)
        return
      }

      // Check if registration form already contains manually entered player data
      const hasExistingRosterData = Boolean(
        (formData.teamName && formData.teamName.trim().length > 0 && formData.teamName !== res.team.name) ||
        formData.teammates.some((t) => t && t.trim().length > 0) ||
        formData.teammateIgns.some((ign) => ign && ign.trim().length > 0)
      )

      if (hasExistingRosterData) {
        setPendingTeamToApply(res)
      } else {
        executeApplyTeamData(res)
      }
    } catch (err) {
      console.error('[SlotBookingModal] handleUseMyTeamClick error:', err)
      showError('Failed to load squad data. Please try again.', 'Team Service Error')
    } finally {
      setIsTeamLoading(false)
    }
  }

  const entryFeeStr = String(tournament?.entryFee || tournament?.entry_fee || 'Free').trim()
  const rawFeeDigits = entryFeeStr.replace(/[^0-9.]/g, '')
  const numericEntryFee = entryFeeStr.toLowerCase() === 'free' || !rawFeeDigits ? 0 : parseFloat(rawFeeDigits)
  const isFreeTournament = numericEntryFee <= 0

  // Reset idempotency key when target tournament changes (preserves key across retries for the same tournament)
  useEffect(() => {
    setWalletIdempotencyKey(null)
  }, [tournament?.id])

  // Fetch Authoritative Wallet Balance for Paid Tournaments
  useEffect(() => {
    let isMounted = true
    if (user?.id && !isFreeTournament) {
      setWalletLoading(true)
      fetchUserWallet()
        .then((res) => {
          if (isMounted && res && res.success !== false) {
            setWalletData(res)
          }
        })
        .catch((err) => {
          console.warn('[SlotBookingModal] fetchUserWallet error:', err)
        })
        .finally(() => {
          if (isMounted) setWalletLoading(false)
        })
    }
    return () => {
      isMounted = false
    }
  }, [user?.id, isFreeTournament])

  const userWalletBalance = Number(
    walletData?.wallet?.balance ?? walletData?.balance ?? 0
  )
  const hasSufficientWalletBalance = userWalletBalance >= numericEntryFee
  const walletShortfall = Math.max(0, numericEntryFee - userWalletBalance)

  const isFormValid = useMemo(() => {
    if (!user?.id) return false
    if (!formData.acceptRules) return false
    if (!proofFile && !proofPreview) return false
    if (isTurnstileEnabled() && !turnstileToken) return false

    const cleanTeamName = sanitizeString(formData.teamName)
    const cleanCaptainName = sanitizeString(formData.captainName)
    const cleanEmail = sanitizeString(formData.email)
    const cleanCaptainUid = sanitizeString(formData.freeFireUid)
    const cleanPhone = sanitizeString(formData.whatsappNumber)

    if (isSolo) {
      const cleanIgn = sanitizeString(formData.playerIgn || formData.teamName)
      if (!cleanIgn || !isValidIgn(cleanIgn)) return false
    } else {
      if (!cleanTeamName || !isValidTeamName(cleanTeamName)) return false
    }
    if (!cleanCaptainName) return false
    if (!cleanEmail || !isValidEmail(cleanEmail)) return false
    if (!cleanCaptainUid || !isValidGameUid(cleanCaptainUid)) return false
    if (!cleanPhone || !isValidPhoneNumber(cleanPhone)) return false

    const requiredTeammatesCount = isDuo ? 1 : isSquad ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = sanitizeString(formData.teammates[i])
      const ign = sanitizeString(formData.teammateIgns[i])
      if (!uid || !isValidGameUid(uid) || uid === cleanCaptainUid) return false
      if (!ign || !isValidIgn(ign)) return false
    }

    if (requiredTeammatesCount > 1) {
      const activeTeammateUids = formData.teammates.slice(0, requiredTeammatesCount).map((t) => sanitizeString(t)).filter(Boolean)
      if (new Set(activeTeammateUids).size !== activeTeammateUids.length) return false
    }

    return true
  }, [formData, proofFile, proofPreview, isSolo, isDuo, isSquad, turnstileToken, user?.id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let newValue = type === 'checkbox' ? checked : value

    if (name === 'freeFireUid' || name === 'whatsappNumber') {
      newValue = sanitizeDigitsOnly(value, 10)
    }

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      }
      if (name === 'playerIgn') {
        updated.teamName = newValue
      }
      return updated
    })
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleTeammateChange = (index, field, value) => {
    if (field === 'uid') {
      const sanitized = sanitizeDigitsOnly(value, 10)
      const updatedUids = [...formData.teammates]
      updatedUids[index] = sanitized
      setFormData((prev) => ({ ...prev, teammates: updatedUids }))
      const fieldKey = `teammate_${index}`
      if (fieldErrors[fieldKey]) {
        setFieldErrors((prev) => ({ ...prev, [fieldKey]: null }))
      }
    } else if (field === 'ign') {
      const updatedIgns = [...formData.teammateIgns]
      updatedIgns[index] = value
      setFormData((prev) => ({ ...prev, teammateIgns: updatedIgns }))
      const fieldKey = `teammate_ign_${index}`
      if (fieldErrors[fieldKey]) {
        setFieldErrors((prev) => ({ ...prev, [fieldKey]: null }))
      }
    }
    if (fieldErrors.teammates) {
      setFieldErrors((prev) => ({ ...prev, teammates: null }))
    }
  }

  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      showError('Please upload a PNG, JPG, or WEBP screenshot.', 'Invalid File Type')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Screenshot file size exceeds 10 MB limit.', 'File Too Large')
      return
    }

    setProofFile(file)
    if (fieldErrors.proofFile) {
      setFieldErrors((prev) => ({ ...prev, proofFile: null }))
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setProofPreview(event.target?.result || '')
    }
    reader.readAsDataURL(file)
  }

  const validateForm = () => {
    const newFieldErrors = {}

    // SEC-05: Authenticated user required
    if (!user?.id) {
      return 'You must be logged in to register for a tournament.'
    }

    if (tournament.status !== 'Registration Open') {
      return 'Registration for this tournament is currently closed.'
    }

    if ((tournament.registeredTeams || 0) >= (tournament.maxTeams || tournament.max_teams || 12)) {
      return 'All registration slots for this tournament are full.'
    }

    const cleanTeamName = sanitizeString(formData.teamName)
    const cleanCaptainName = sanitizeString(formData.captainName)
    const cleanEmail = sanitizeString(formData.email)
    const cleanCaptainUid = sanitizeString(formData.freeFireUid)
    const cleanPhone = sanitizeString(formData.whatsappNumber)

    // Identity Validation (Solo vs Duo/Squad)
    if (isSolo) {
      const cleanIgn = sanitizeString(formData.playerIgn || formData.teamName)
      if (!cleanIgn) {
        newFieldErrors.playerIgn = 'Player IGN / Display Name is required'
      } else if (!isValidIgn(cleanIgn)) {
        newFieldErrors.playerIgn = 'Player IGN must be between 1 and 30 characters'
      }

      if (!cleanCaptainName) {
        newFieldErrors.captainName = 'Player Full Name is required'
      }
    } else {
      // Team Name Validation (Duo & Squad only)
      if (!isSolo) {
        if (!cleanTeamName) {
          newFieldErrors.teamName = 'Team Name is required'
        } else if (!isValidTeamName(cleanTeamName)) {
          newFieldErrors.teamName = 'Name must be between 3 and 30 characters'
        }
      }

      // Captain Name Validation
      if (!cleanCaptainName) {
        newFieldErrors.captainName = 'Captain Full Name is required'
      }
    }

    // Email Validation
    if (!cleanEmail) {
      newFieldErrors.email = 'Email address is required'
    } else if (!isValidEmail(cleanEmail)) {
      newFieldErrors.email = 'Please enter a valid email address'
    }

    // Game UID Validation (Strictly 10 digits)
    if (!cleanCaptainUid) {
      newFieldErrors.freeFireUid = 'Game Character UID is required'
    } else if (!isValidGameUid(cleanCaptainUid)) {
      newFieldErrors.freeFireUid = 'Game UID must be exactly 10 numeric digits (0-9)'
    }

    // Contact Number Validation (Strictly 10 digits)
    if (!cleanPhone) {
      newFieldErrors.whatsappNumber = 'WhatsApp Contact Number is required'
    } else if (!isValidPhoneNumber(cleanPhone)) {
      newFieldErrors.whatsappNumber = 'WhatsApp number must be exactly 10 numeric digits (0-9)'
    }

    // Dynamic Teammate UIDs & IGNs Validation
    const requiredTeammatesCount = isDuo ? 1 : isSquad ? 3 : 0
    for (let i = 0; i < requiredTeammatesCount; i++) {
      const uid = sanitizeString(formData.teammates[i])
      const ign = sanitizeString(formData.teammateIgns[i])
      const uidFieldKey = `teammate_${i}`
      const ignFieldKey = `teammate_ign_${i}`

      // Validate Teammate UID (Strictly 10 digits)
      if (!uid) {
        newFieldErrors[uidFieldKey] = `Game UID for Teammate ${i + 1} is required for ${mode} mode`
      } else if (!isValidGameUid(uid)) {
        newFieldErrors[uidFieldKey] = `Teammate ${i + 1} Game UID must be exactly 10 digits (0-9)`
      } else if (uid === cleanCaptainUid) {
        newFieldErrors[uidFieldKey] = `Teammate ${i + 1} Game UID cannot be identical to Captain's UID`
      }

      // Validate Teammate In-Game Name (IGN)
      if (!ign) {
        newFieldErrors[ignFieldKey] = `In-Game Name (IGN) for Teammate ${i + 1} is required`
      } else if (!isValidIgn(ign)) {
        newFieldErrors[ignFieldKey] = `Teammate ${i + 1} IGN must be 1-30 characters`
      }
    }

    if (requiredTeammatesCount > 1) {
      const activeTeammateUids = formData.teammates
        .slice(0, requiredTeammatesCount)
        .map((t) => sanitizeString(t))
        .filter(Boolean)

      const uniqueUids = new Set(activeTeammateUids)
      if (uniqueUids.size !== activeTeammateUids.length) {
        newFieldErrors.teammates = 'All Teammate Game UIDs must be unique'
      }
    }

    // Mandatory Profile Screenshot Validation
    if (!proofFile && !proofPreview) {
      newFieldErrors.proofFile = 'Free Fire profile screenshot is required for identity verification'
    }

    // Rules & Fair Play Validation
    if (!formData.acceptRules) {
      newFieldErrors.acceptRules = 'You must accept the tournament rules and code of conduct to confirm registration'
    }

    setFieldErrors(newFieldErrors)
    if (Object.keys(newFieldErrors).length > 0) {
      return 'Please correct highlighted errors in the form before submitting.'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // SEC-05: Guard authentication before registration submission proceeds
    if (!user?.id) {
      const authError = 'You must be logged in to register for a tournament.'
      setError(authError)
      showError(authError, 'Authentication Required')
      navigate('/login')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      showError(validationError, 'Validation Error')
      return
    }

    // Turnstile bot protection check
    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        const msg = 'Please complete the security check (Cloudflare Turnstile) before submitting.'
        setError(msg)
        showError(msg, 'Security Check Required')
        return
      }

      setIsSubmitting(true)
      setSubmittingStep('Verifying Security Challenge...')
      const verifyRes = await verifyTurnstileToken(turnstileToken, { action: 'slot_booking' })
      if (!verifyRes?.success) {
        setIsSubmitting(false)
        setTurnstileToken(null)
        setTurnstileKey((k) => k + 1)
        const errorMsg = verifyRes?.message || 'Security verification failed. Please try again.'
        setError(errorMsg)
        showError(errorMsg, 'Security Check Failed')
        return
      }
    } else {
      setIsSubmitting(true)
    }

    const requiredTeammatesCount = isDuo ? 1 : isSquad ? 3 : 0
    const activeTeammates = formData.teammates
      .slice(0, requiredTeammatesCount)
      .map((t) => sanitizeString(t))
    const activeTeammateIgns = formData.teammateIgns
      .slice(0, requiredTeammatesCount)
      .map((t) => toCanonicalIgn(t))

    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    try {
      // If proof screenshot is attached, record profile evidence in background
      if (proofFile && user?.id) {
        uploadProfileProof(proofFile, {
          userId: user.id,
          gameUid: sanitizeString(formData.freeFireUid),
          gameIgn: toCanonicalIgn(formData.captainName),
          tournamentId: tournament.id,
          fallbackDataUrl: proofPreview,
        }).catch((proofErr) => {
          console.warn('[Profile Proof Upload Notice]:', proofErr)
        })
      }

      if (isFreeTournament) {
        setSubmittingStep('Registering...')
        let registeredRecord = null
        if (registerTeam) {
          registeredRecord = await registerTeam(tournament.id, {
            refId,
            name: isSolo ? (toCanonicalIgn(formData.teamName || formData.captainName) || 'Solo Player') : sanitizeString(formData.teamName),
            captain: toCanonicalIgn(formData.captainName),
            email: sanitizeString(formData.email),
            freeFireUid: sanitizeString(formData.freeFireUid),
            whatsappNumber: sanitizeString(formData.whatsappNumber),
            mode,
            teammates: activeTeammates,
            teammateIgns: activeTeammateIgns,
            userId: user.id,
            status: 'Approved',
            paymentStatus: 'Free',
          })
        }

        showSuccess('Tournament Registered', 'Slot Registration Confirmed')

        if (onRegistered) {
          onRegistered(registeredRecord)
        }

        setRegistrationSummary({
          refId,
          teamName: isSolo ? '' : sanitizeString(formData.teamName),
          captain: toCanonicalIgn(formData.captainName),
          mode,
          freeFireUid: sanitizeString(formData.freeFireUid),
          teammates: activeTeammates,
          teammateIgns: activeTeammateIgns,
          status: 'Approved',
          paymentStatus: 'Free',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          registeredRecord,
        })
      } else {
        // PAID TOURNAMENT FLOW
        if (!user?.id) {
          throw new Error('You must be logged in to register for a paid tournament.')
        }

        setSubmittingStep('Creating Payment Order...')
        const registrationPayload = {
          refId,
          name: isSolo ? (toCanonicalIgn(formData.teamName || formData.captainName) || 'Solo Player') : sanitizeString(formData.teamName),
          captain: toCanonicalIgn(formData.captainName),
          email: sanitizeString(formData.email),
          freeFireUid: sanitizeString(formData.freeFireUid),
          whatsappNumber: sanitizeString(formData.whatsappNumber),
          mode,
          teammates: activeTeammates,
          teammateIgns: activeTeammateIgns,
        }
        const orderRes = await createTournamentOrder(tournament.id, registrationPayload)
        if (!orderRes?.order_id) {
          throw new Error(orderRes?.error || 'Failed to create payment order with server.')
        }

        setSubmittingStep('Awaiting Payment...')
        await new Promise((resolve, reject) => {
          launchRazorpayCheckout({
            orderData: orderRes,
            tournament,
            userInfo: {
              name: sanitizeString(formData.captainName),
              email: sanitizeString(formData.email),
              contact: sanitizeString(formData.whatsappNumber),
            },
            onSuccess: async (payResponse) => {
              try {
                setSubmittingStep('Verifying Payment...')
                const verifyRes = await verifyTournamentPayment({
                  orderId: payResponse.orderId,
                  paymentId: payResponse.paymentId,
                  signature: payResponse.signature,
                  tournamentId: tournament.id,
                })

                if (!verifyRes?.success) {
                  throw new Error(verifyRes?.error || 'Server signature verification failed.')
                }

                let registeredRecord = null
                if (verifyRes.already_consumed) {
                  console.info('[SlotBookingModal] Payment was already processed by webhook background recovery.')
                  registeredRecord = {
                    id: verifyRes.registration_id,
                    team_name: sanitizeString(formData.teamName),
                    captain_ign: toCanonicalIgn(formData.captainName),
                    captain_uid: sanitizeString(formData.freeFireUid),
                    captain_phone: sanitizeString(formData.whatsappNumber),
                    email: sanitizeString(formData.email),
                    mode,
                    registration_ref: refId,
                  }
                } else {
                  setSubmittingStep('Confirming Registration...')
                  registeredRecord = await registerTeam(tournament.id, {
                    refId,
                    name: sanitizeString(formData.teamName),
                    captain: toCanonicalIgn(formData.captainName),
                    email: sanitizeString(formData.email),
                    freeFireUid: sanitizeString(formData.freeFireUid),
                    whatsappNumber: sanitizeString(formData.whatsappNumber),
                    mode,
                    teammates: activeTeammates,
                    teammateIgns: activeTeammateIgns,
                    userId: user.id,
                    paymentId: verifyRes.payment_id,
                    razorpayPaymentId: verifyRes.razorpay_payment_id || payResponse.paymentId,
                    status: 'Approved',
                    paymentStatus: 'Paid',
                  })
                }

                showSuccess('Payment & Registration Confirmed', `Slot Confirmed • ID: ${payResponse.paymentId}`)

                if (onRegistered) {
                  onRegistered(registeredRecord)
                }

                setRegistrationSummary({
                  refId,
                  teamName: isSolo ? '' : sanitizeString(formData.teamName),
                  captain: toCanonicalIgn(formData.captainName),
                  mode,
                  freeFireUid: sanitizeString(formData.freeFireUid),
                  teammates: activeTeammates,
                  teammateIgns: activeTeammateIgns,
                  status: 'Approved',
                  paymentStatus: 'Paid',
                  paymentId: payResponse.paymentId,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  registeredRecord,
                })

                resolve()
              } catch (verifyErr) {
                reject(verifyErr)
              }
            },
            onDismiss: () => {
              reject(new Error('Payment window was closed. Registration was not booked.'))
            },
            onError: (payErr) => {
              reject(payErr)
            },
          }).catch(reject)
        })
      }
    } catch (err) {
      console.error('[Registration Submission Error]:', err)
      if (isTurnstileEnabled()) {
        setTurnstileToken(null)
        setTurnstileKey((k) => k + 1)
      }
      const errorMsg = err?.message || 'Registration failed. Please check your inputs and try again.'
      setError(errorMsg)
      showError(errorMsg, 'Registration Failed')
    } finally {
      setIsSubmitting(false)
      setSubmittingStep('')
    }
  }

  // Phase 9.3: Dedicated Wallet Payment Submission Handler
  const handleWalletPaymentSubmit = async (e) => {
    if (e) e.preventDefault()
    setError(null)

    // SEC-05: Guard authentication before registration submission proceeds
    if (!user?.id) {
      const authError = 'You must be logged in to register for a tournament.'
      setError(authError)
      showError(authError, 'Authentication Required')
      navigate('/login')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      showError(validationError, 'Validation Error')
      return
    }

    // Turnstile bot protection check
    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        const msg = 'Please complete the security check (Cloudflare Turnstile) before submitting.'
        setError(msg)
        showError(msg, 'Security Check Required')
        return
      }

      setIsSubmitting(true)
      setSubmittingStep('Verifying Security Challenge...')
      const verifyRes = await verifyTurnstileToken(turnstileToken, { action: 'slot_booking' })
      if (!verifyRes?.success) {
        setIsSubmitting(false)
        setTurnstileToken(null)
        setTurnstileKey((k) => k + 1)
        const errorMsg = verifyRes?.message || 'Security verification failed. Please try again.'
        setError(errorMsg)
        showError(errorMsg, 'Security Check Failed')
        return
      }
    } else {
      setIsSubmitting(true)
    }

    // Preserve one UUID v4 per attempt across retries
    let currentKey = walletIdempotencyKey
    if (!currentKey) {
      currentKey = generateWalletRegistrationIdempotencyKey()
      setWalletIdempotencyKey(currentKey)
    }

    setSubmittingStep('Debiting Wallet & Registering...')

    const requiredTeammatesCount = isDuo ? 1 : isSquad ? 3 : 0
    const activeTeammates = formData.teammates
      .slice(0, requiredTeammatesCount)
      .map((t) => sanitizeString(t))
    const activeTeammateIgns = formData.teammateIgns
      .slice(0, requiredTeammatesCount)
      .map((t) => toCanonicalIgn(t))

    const refId = `REG-MJ-${Date.now().toString(36).toUpperCase()}`

    try {
      if (proofFile && user?.id) {
        uploadProfileProof(proofFile, {
          userId: user.id,
          gameUid: sanitizeString(formData.freeFireUid),
          gameIgn: toCanonicalIgn(formData.captainName),
          tournamentId: tournament.id,
          fallbackDataUrl: proofPreview,
        }).catch((proofErr) => {
          console.warn('[Profile Proof Upload Notice]:', proofErr)
        })
      }

      const res = await registerTeamWithWallet(
        tournament.id,
        {
          refId,
          name: isSolo ? (toCanonicalIgn(formData.teamName || formData.captainName) || 'Solo Player') : sanitizeString(formData.teamName),
          captain: toCanonicalIgn(formData.captainName),
          email: sanitizeString(formData.email),
          freeFireUid: sanitizeString(formData.freeFireUid),
          whatsappNumber: sanitizeString(formData.whatsappNumber),
          mode,
          teammates: activeTeammates,
          teammateIgns: activeTeammateIgns,
        },
        currentKey
      )

      // Refresh authoritative wallet balance after settlement
      const updatedWallet = await fetchUserWallet()
      if (updatedWallet && updatedWallet.success !== false) {
        setWalletData(updatedWallet)
      }

      showSuccess(
        'Payment & Registration Confirmed',
        res?.idempotent_replay
          ? `Slot already processed (idempotent replay) • Ref: ${res.refId || refId}`
          : `Paid ₹${numericEntryFee.toFixed(2)} from Wallet • Ref: ${res.refId || refId}`
      )

      if (onRegistered) {
        onRegistered(res.teamRecord || {
          refId: res.refId || refId,
          name: isSolo ? (toCanonicalIgn(formData.teamName || formData.captainName) || 'Solo Player') : sanitizeString(formData.teamName),
          captain: toCanonicalIgn(formData.captainName),
          mode,
          freeFireUid: sanitizeString(formData.freeFireUid),
          status: 'Approved',
          paymentStatus: 'Paid',
          paymentId: res.payment_id,
        })
      }

      onClose()
    } catch (err) {
      console.error('[handleWalletPaymentSubmit error]:', err)
      if (isTurnstileEnabled()) {
        setTurnstileToken(null)
        setTurnstileKey((k) => k + 1)
      }
      setError(err.message || 'Failed to complete wallet registration.')
      showError(err.message || 'Failed to complete wallet registration.', 'Registration Failed')
    } finally {
      setIsSubmitting(false)
      setSubmittingStep('')
    }
  }

  const handleCopyRef = () => {
    if (registrationSummary?.refId) {
      navigator.clipboard.writeText(registrationSummary.refId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-booking-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#131315] border border-[#2A2A30] rounded-lg max-w-[620px] w-full shadow-2xl relative max-h-[90vh] flex flex-col my-auto overflow-hidden text-white"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A30] bg-[#0E0E10] shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-wider font-mono uppercase text-[#00f2ff] font-bold leading-none">
              {tournament.game || 'Free Fire MAX'}
            </span>
            <h2 id="slot-booking-modal-title" className="text-base font-bold tracking-tight text-white leading-tight">
              {tournament.game || 'Free Fire MAX'} • {mode || modeConfig.mode}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[#8E8E98] hover:text-white hover:bg-[#18181B] transition-colors cursor-pointer"
            aria-label="Close Registration Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container with vertical scroll */}
        <div className="overflow-y-auto max-h-[82vh]">
          {error && (
            <div className="px-5 pt-4">
              <AuthAlert type="error" message={error} />
            </div>
          )}

          {/* SEC-05: Guest Authentication Notification Banner */}
          {!user?.id && (
            <div className="m-5 p-3.5 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-4 h-4 text-[#00f2ff] shrink-0" />
                <span>You must be logged in to register for a tournament.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose?.()
                  navigate('/login')
                }}
                className="h-8 px-4 text-xs font-bold uppercase tracking-wider text-black bg-[#00f2ff] hover:bg-white rounded transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                Sign In to Register
              </button>
            </div>
          )}

          {/* SUCCESS CONFIRMATION DIALOG */}
          {registrationSummary ? (
            <div className="p-6 space-y-6">
              {/* Headline with subtle status icon */}
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <h3 className="text-sm font-bold tracking-wider uppercase text-white font-mono">
                  Registration Confirmed
                </h3>
              </div>

              {/* Essential Info Grid */}
              <div className="p-4 bg-[#0E0E10] border border-[#2A2A30] rounded space-y-3 font-mono text-xs text-left">
                <div className="flex items-center justify-between py-1 border-b border-[#222228]">
                  <span className="text-[#8E8E98] font-sans text-xs">Reference ID</span>
                  <div className="flex items-center gap-1.5 text-white font-bold tracking-wide">
                    <span>{registrationSummary.refId}</span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="p-1 rounded hover:bg-[#18181B] text-[#8E8E98] hover:text-[#00f2ff] transition-colors cursor-pointer"
                      title="Copy Reference ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-[#10B981] font-sans font-bold">Copied!</span>}
                  </div>
                </div>

                {!isSolo && registrationSummary.teamName && (
                  <div className="flex items-center justify-between py-1 border-b border-[#222228]">
                    <span className="text-[#8E8E98] font-sans text-xs">Team Name</span>
                    <span className="text-white font-bold">{registrationSummary.teamName}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-[#222228]">
                  <span className="text-[#8E8E98] font-sans text-xs">Format</span>
                  <span className="text-[#00f2ff] font-bold uppercase">{mode.toUpperCase()}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#222228]">
                  <span className="text-[#8E8E98] font-sans text-xs">{isSolo ? 'Player UID' : 'Captain UID'}</span>
                  <span className="text-white">{registrationSummary.freeFireUid}</span>
                </div>

                {registrationSummary.paymentId && (
                  <div className="flex items-center justify-between py-1 border-b border-[#222228]">
                    <span className="text-[#8E8E98] font-sans text-xs">Payment ID</span>
                    <span className="font-mono text-[11px] text-[#10B981]">{registrationSummary.paymentId}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#8E8E98] font-sans text-xs">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-[#10B981] font-bold uppercase tracking-wider text-[11px] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    {registrationSummary.status || 'APPROVED'}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-10 px-6 text-xs font-bold uppercase tracking-wider text-black bg-[#00f2ff] hover:bg-white transition-colors rounded shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  Done & Return
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-4">
              {/* N3.5: POPULATED ROSTER REVIEW CARD (Duo/Squad only) */}
              {populatedTeamInfo && !isSolo && (
                <div className="p-3 bg-[#0E0E10] border border-[#10B981]/40 rounded space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2A2A30] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30 uppercase tracking-wider">
                        YOUR TEAM
                      </span>
                      <span className="font-bold text-white text-xs">{populatedTeamInfo.name}</span>
                      {populatedTeamInfo.tag && (
                        <span className="text-[10px] font-mono text-[#8E8E98]">[{populatedTeamInfo.tag}]</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPopulatedTeamInfo(null)}
                      className="text-[10px] text-[#8E8E98] hover:text-white uppercase transition-colors cursor-pointer"
                    >
                      Dismiss Review
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-[#18181B] border border-[#2A2A30] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#fed83a] block font-bold uppercase">Captain</span>
                        <span className="text-white font-bold">{populatedTeamInfo.captain}</span>
                      </div>
                      <span className="text-[#8E8E98] text-[11px]">UID: {populatedTeamInfo.captainUid || 'N/A'}</span>
                    </div>
                    {populatedTeamInfo.members.map((m, idx) => (
                      <div key={`pop-member-${idx}`} className="p-2 rounded bg-[#18181B] border border-[#2A2A30] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#00f2ff] block font-bold uppercase">{m.role || 'Member'}</span>
                          <span className="text-white font-bold">{m.name}</span>
                        </div>
                        <span className="text-[#8E8E98] text-[11px]">UID: {m.uid || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOLO FIELDS */}
              {isSolo ? (
                <>
                  <FormInput
                    label="Player IGN / Display Name"
                    name="playerIgn"
                    value={formData.playerIgn || formData.teamName || ''}
                    onChange={handleChange}
                    placeholder="e.g. ShadowNinja"
                    required
                    error={fieldErrors.playerIgn}
                    icon={User}
                  />

                  <FormInput
                    label="Player Full Name"
                    name="captainName"
                    value={formData.captainName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    required
                    error={fieldErrors.captainName}
                    icon={User}
                  />

                  <FormInput
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="user@example.com"
                    required
                    error={fieldErrors.email}
                    icon={Mail}
                  />

                  <FormInput
                    label="WhatsApp Contact Number"
                    name="whatsappNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    showCount
                    prefix="+91"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="9876543210"
                    required
                    error={fieldErrors.whatsappNumber}
                    icon={Phone}
                  />

                  <FormInput
                    label="Game Character UID"
                    name="freeFireUid"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    showCount
                    value={formData.freeFireUid}
                    onChange={handleChange}
                    placeholder="0123456789"
                    required
                    error={fieldErrors.freeFireUid}
                    icon={ShieldCheck}
                  />
                </>
              ) : (
                /* DUO & SQUAD FIELDS */
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-white/90 font-sans">
                        Team Name <span className="text-[#00f2ff]">*</span>
                      </label>
                      {user?.id && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleUseMyTeamClick}
                            disabled={isTeamLoading}
                            className="text-[11px] font-mono uppercase font-bold text-[#00f2ff] hover:text-white bg-[#18181B] border border-[#2A2A30] hover:border-[#00f2ff] px-2.5 py-1 rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isTeamLoading ? 'Loading Squad...' : 'Use My Team'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <FormInput
                      name="teamName"
                      value={formData.teamName}
                      onChange={handleChange}
                      placeholder={isDuo ? 'e.g. Phoenix Duo' : 'e.g. Phoenix Squad'}
                      required
                      error={fieldErrors.teamName}
                      icon={Users}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Captain Full Name"
                      name="captainName"
                      value={formData.captainName}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      required
                      error={fieldErrors.captainName}
                      icon={User}
                    />

                    <FormInput
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="user@example.com"
                      required
                      error={fieldErrors.email}
                      icon={Mail}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="WhatsApp Contact Number"
                      name="whatsappNumber"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      showCount
                      prefix="+91"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      placeholder="9876543210"
                      required
                      error={fieldErrors.whatsappNumber}
                      icon={Phone}
                    />

                    <FormInput
                      label="Captain Game Character UID"
                      name="freeFireUid"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      showCount
                      value={formData.freeFireUid}
                      onChange={handleChange}
                      placeholder="0123456789"
                      required
                      error={fieldErrors.freeFireUid}
                      icon={ShieldCheck}
                    />
                  </div>
                </>
              )}

              {/* Profile Screenshot Upload */}
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5 font-sans">
                  FREE FIRE PROFILE SCREENSHOT <span className="text-[#00f2ff]">*</span>
                </label>
                <div className={`flex items-center gap-3 p-3 bg-[#1F1F23] border border-dashed rounded transition-colors ${
                  fieldErrors.proofFile
                    ? 'border-[#ef4444]'
                    : proofFile || proofPreview
                    ? 'border-[#10B981]/60'
                    : 'border-[#2A2A30] hover:border-[#00f2ff]/60'
                }`}>
                  <label className="h-9 px-4 text-xs font-semibold uppercase tracking-wider bg-[#18181B] border border-[#2A2A30] rounded text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black hover:border-[#00f2ff] transition-all flex items-center gap-2 cursor-pointer shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>ATTACH PROFILE SCREENSHOT</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleProofFileSelect}
                      className="hidden"
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    {proofFile ? (
                      <span className="text-xs text-[#8E8E98] font-mono truncate block">
                        {proofFile.name}
                      </span>
                    ) : proofPreview ? (
                      <span className="text-xs text-[#8E8E98] font-mono truncate block">
                        screenshot_attached.png
                      </span>
                    ) : null}
                  </div>
                  {(proofFile || proofPreview) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null)
                          setProofPreview('')
                        }}
                        className="text-[11px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                {fieldErrors.proofFile && (
                  <p className="text-[11px] text-[#ef4444] font-medium mt-1" role="alert">
                    {fieldErrors.proofFile}
                  </p>
                )}
              </div>

              {/* Duo: Exactly 1 Teammate */}
              {isDuo && (
                <div className="pt-3 border-t border-[#2A2A30] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#00f2ff] font-sans">
                      TEAMMATE
                    </span>
                    <span className="text-[11px] font-mono text-[#8E8E98]">2/2</span>
                  </div>

                  <div className="p-3 bg-[#0E0E10] border border-[#2A2A30] rounded space-y-2">
                    <div className="text-[11px] font-bold text-white/80 uppercase font-mono">
                      TEAMMATE #1
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput
                        label="Game UID"
                        name="teammate_0"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        showCount
                        value={formData.teammates[0]}
                        onChange={(e) => handleTeammateChange(0, 'uid', e.target.value)}
                        placeholder="Teammate UID"
                        required
                        error={fieldErrors.teammate_0}
                        icon={ShieldCheck}
                      />
                      <FormInput
                        label="IGN"
                        name="teammate_ign_0"
                        value={formData.teammateIgns[0]}
                        onChange={(e) => handleTeammateChange(0, 'ign', e.target.value)}
                        placeholder="In-Game Name"
                        required
                        error={fieldErrors.teammate_ign_0}
                        icon={User}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Squad: Exactly 3 Teammates */}
              {isSquad && (
                <div className="pt-3 border-t border-[#2A2A30] space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#00f2ff] font-sans">
                    TEAMMATES
                  </div>

                  {[0, 1, 2].map((idx) => (
                    <div
                      key={`squad-teammate-${idx}`}
                      className="p-3 bg-[#0E0E10] border border-[#2A2A30] rounded space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/80 uppercase font-mono">
                          TEAMMATE #{idx + 1}
                        </span>
                        <span className="text-[11px] font-mono text-[#8E8E98] font-medium">
                          {idx + 2}/4
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormInput
                          label="Game UID"
                          name={`teammate_${idx}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          showCount
                          value={formData.teammates[idx]}
                          onChange={(e) => handleTeammateChange(idx, 'uid', e.target.value)}
                          placeholder="Game UID"
                          required
                          error={fieldErrors[`teammate_${idx}`]}
                          icon={ShieldCheck}
                        />
                        <FormInput
                          label="IGN"
                          name={`teammate_ign_${idx}`}
                          value={formData.teammateIgns[idx]}
                          onChange={(e) => handleTeammateChange(idx, 'ign', e.target.value)}
                          placeholder={idx === 0 ? "e.g. KA¹⁷ Mjᶠᶠ" : idx === 1 ? "e.g. ꧁༺NINJA༻꧂" : "e.g. V² | ᴀ ᴋ ᴀ ʏ"}
                          required
                          error={fieldErrors[`teammate_ign_${idx}`]}
                          icon={User}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    name="acceptRules"
                    id="acceptRules"
                    checked={formData.acceptRules}
                    onChange={handleChange}
                    required
                    className="mt-0.5 w-4 h-4 rounded border-[#2A2A30] bg-[#1F1F23] text-[#00F2FF] focus:ring-0 focus:outline-none accent-[#00F2FF] cursor-pointer"
                  />
                  <span className="text-xs text-[#8E8E98] group-hover:text-white transition-colors leading-snug">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowRulebook(true)
                      }}
                      className="text-[#00F2FF] hover:underline font-medium inline cursor-pointer"
                    >
                      Tournament Rules & Code of Conduct
                    </button>{' '}
                    <span className="text-[#00F2FF]">*</span>
                  </span>
                </label>
                {fieldErrors.acceptRules && (
                  <p className="text-[11px] text-[#ef4444] font-medium pl-6 pt-1" role="alert">
                    {fieldErrors.acceptRules}
                  </p>
                )}
              </div>

              {/* Phase 9.3: Wallet Entry Fee & Balance Card for Paid Tournaments */}
              {!isFreeTournament && (
                <div className="p-3 bg-[#0E0E10] rounded border border-[#2A2A30] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#00f2ff]" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Tournament Entry Fee & Payment
                      </span>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-[#10B981]">
                      Fee: ₹{numericEntryFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-[#18181B] rounded border border-[#2A2A30]">
                    <span className="text-xs text-[#8E8E98] font-medium">Available MJ Wallet Balance:</span>
                    <span className="font-mono text-xs font-bold text-white">
                      {walletLoading ? 'Checking...' : `₹${userWalletBalance.toFixed(2)}`}
                    </span>
                  </div>

                  {hasSufficientWalletBalance ? (
                    <div className="flex items-center gap-2 p-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded text-[11px] text-[#10B981]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Wallet balance is sufficient. You can pay directly from your wallet with zero gateway charges.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 p-2 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded">
                      <div className="flex items-center justify-between text-[11px] text-[#ef4444] font-semibold">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Wallet Shortfall:</span>
                        </div>
                        <span className="font-mono font-bold">₹{walletShortfall.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-[#8E8E98]">
                        Your wallet has ₹{userWalletBalance.toFixed(2)}. Pay ₹{numericEntryFee.toFixed(2)} via Razorpay (UPI, Cards, NetBanking) or top up your wallet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Turnstile Bot Protection */}
              {isTurnstileEnabled() && (
                <TurnstileWidget
                  key={turnstileKey}
                  action="slot_booking"
                  onVerify={(tok) => setTurnstileToken(tok)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              )}

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#2A2A30] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-10 px-5 text-xs font-bold uppercase tracking-wider text-[#8E8E98] bg-transparent hover:text-white hover:bg-[#18181B] border border-[#2A2A30] rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                {!user?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.()
                      navigate('/login')
                    }}
                    className="h-10 px-6 text-xs font-bold uppercase tracking-wider text-black bg-[#00f2ff] hover:bg-white transition-colors rounded shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    Sign In to Register
                  </button>
                ) : isFreeTournament ? (
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting}
                    loadingText={submittingStep || 'Registering...'}
                    disabled={!isFormValid || isSubmitting}
                    className="h-10 px-6 text-xs font-bold uppercase tracking-wider text-black bg-[#00f2ff] hover:bg-white transition-colors rounded shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    Complete Registration
                  </LoadingButton>
                ) : hasSufficientWalletBalance ? (
                  <>
                    <LoadingButton
                      type="button"
                      onClick={handleWalletPaymentSubmit}
                      loading={isSubmitting && submittingStep.includes('Wallet')}
                      loadingText={submittingStep || 'Debiting Wallet...'}
                      disabled={!isFormValid || isSubmitting}
                      className="h-10 px-5 text-xs font-bold uppercase tracking-wider text-black bg-[#00f2ff] hover:bg-white transition-colors rounded shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {`Pay ₹${numericEntryFee.toFixed(2)} from Wallet`}
                    </LoadingButton>

                    <LoadingButton
                      type="submit"
                      loading={isSubmitting && !submittingStep.includes('Wallet')}
                      loadingText={submittingStep || 'Opening Razorpay...'}
                      disabled={!isFormValid || isSubmitting}
                      className="h-10 px-4 text-xs font-bold uppercase tracking-wider text-[#8E8E98] hover:text-white bg-transparent hover:bg-[#18181B] border border-[#2A2A30] rounded transition-colors cursor-pointer"
                    >
                      Pay via Razorpay
                    </LoadingButton>
                  </>
                ) : (
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting}
                    loadingText={submittingStep || 'Processing Payment...'}
                    disabled={!isFormValid || isSubmitting}
                    className="h-10 px-6 text-xs font-bold uppercase tracking-wider text-black bg-[#00f2ff] hover:bg-white transition-colors rounded shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {`Pay ₹${numericEntryFee.toFixed(2)} via Razorpay`}
                  </LoadingButton>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* N3.5: NO ACTIVE TEAM DIALOG */}
      {showNoTeamModal && (
        <div
          onClick={() => setShowNoTeamModal(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-headline text-base font-bold text-white uppercase tracking-wide">
                No Active Team Found
              </h3>
            </div>
            <p className="text-xs text-[#8e9dae] leading-relaxed">
              You are not part of an active team.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3a494b]/40">
              <button
                type="button"
                onClick={() => setShowNoTeamModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-[#8e9dae] hover:text-white rounded-xl bg-[#07090c] border border-[#3a494b] transition-colors cursor-pointer uppercase"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoTeamModal(false)
                  onClose?.()
                  navigate('/profile/team')
                }}
                className="btn-cyber-primary px-4 py-2 text-xs font-bold cursor-pointer uppercase"
              >
                Create / Manage My Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* N3.5: ROSTER OVERWRITE CONFIRMATION MODAL */}
      {pendingTeamToApply && (
        <div
          onClick={() => setPendingTeamToApply(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#151a21] border border-[#00f2ff]/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-[0_0_30px_rgba(0,242,255,0.2)]"
          >
            <div className="flex items-center gap-3 text-[#00f2ff]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-headline text-base font-bold text-white uppercase tracking-wide">
                Replace Current Roster
              </h3>
            </div>
            <p className="text-xs text-white leading-relaxed">
              Replace current roster with your active team?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3a494b]/40">
              <button
                type="button"
                onClick={() => setPendingTeamToApply(null)}
                className="px-3.5 py-2 text-xs font-bold text-[#8e9dae] hover:text-white rounded-xl bg-[#07090c] border border-[#3a494b] transition-colors cursor-pointer uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const teamData = pendingTeamToApply
                  setPendingTeamToApply(null)
                  executeApplyTeamData(teamData)
                }}
                className="btn-cyber-primary px-4 py-2 text-xs font-bold cursor-pointer uppercase"
              >
                Use My Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY FULL RULEBOOK IN-MODAL OVERLAY */}
      {showRulebook && (
        <div
          onClick={() => setShowRulebook(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#151a21] border border-[#00f2ff]/40 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(0,242,255,0.2)] relative max-h-[85vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setShowRulebook(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] cursor-pointer transition-colors"
              aria-label="Close Rulebook"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 border-b border-[#3a494b]/50 pb-3">
              <div className="flex items-center gap-2 text-[#00f2ff]">
                <Shield className="w-4.5 h-4.5 text-[#00f2ff]" />
                <h3 className="font-headline text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Tournament Rules & Code of Conduct
                </h3>
              </div>
              <p className="text-[11px] text-[#8e9dae]">
                Official match rules and fair play guidelines enforced for all participants.
              </p>
            </div>

            <div className="space-y-2">
              {OFFICIAL_MJ_RULES.map((ruleText, idx) => (
                <div
                  key={`rule-${idx}`}
                  className="flex items-start gap-2.5 p-2.5 bg-[#07090c] border border-[#3a494b]/60 rounded-xl"
                >
                  <span className="w-5 h-5 rounded-lg bg-[#151a21] border border-[#00f2ff]/40 flex items-center justify-center font-mono font-bold text-[10px] text-[#00f2ff] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-white font-medium leading-relaxed">
                    {ruleText}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#3a494b]/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#00ff9d] text-[11px] font-bold uppercase">
                <CheckCircle2 className="w-4 h-4 text-[#00ff9d]" />
                <span>Fair Play Policy Enforced</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRulebook(false)}
                className="px-4 py-2 bg-[#00f2ff] hover:bg-[#00d0dd] text-black font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
