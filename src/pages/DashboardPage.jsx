import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { User, Mail, ShieldCheck, Phone, Trophy, Edit3, Trash2, Calendar, Gamepad2, ArrowRight, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import FormInput from '../components/common/FormInput'
import AuthAlert from '../components/common/AuthAlert'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const { tournaments, withdrawTeam } = useTournaments()

  const [profileData, setProfileData] = useState({
    username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Esports Player',
    freeFireUid: user?.user_metadata?.freeFireUid || '518920412',
    whatsappNumber: user?.user_metadata?.whatsappNumber || '+91 9876543210',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [withdrawAlert, setWithdrawAlert] = useState(null)

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setAlert(null)
    setIsSaving(true)

    try {
      if (isSupabaseConfigured && user) {
        await supabase.auth.updateUser({
          data: {
            username: profileData.username,
            freeFireUid: profileData.freeFireUid,
            whatsappNumber: profileData.whatsappNumber,
          },
        })
      }

      // Update mock storage if offline/mock
      const storedMockUser = localStorage.getItem('mj_esports_mock_user')
      if (storedMockUser) {
        try {
          const parsed = JSON.parse(storedMockUser)
          parsed.user_metadata = { ...parsed.user_metadata, ...profileData }
          localStorage.setItem('mj_esports_mock_user', JSON.stringify(parsed))
        } catch (e) {
          console.error(e)
        }
      }

      setAlert({ type: 'success', message: 'Profile updated successfully!' })
      setIsEditing(false)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update profile' })
    } finally {
      setIsSaving(false)
    }
  }

  // Filter My Registered Tournaments
  const userIdentifier = user?.email?.toLowerCase() || ''
  const userId = user?.id || ''

  const myTournaments = tournaments.filter((t) => {
    return t.teamsList?.some(
      (team) =>
        (team.email && userIdentifier && team.email.toLowerCase() === userIdentifier) ||
        (team.userId && userId && team.userId === userId) ||
        (team.captain && team.captain.toLowerCase() === profileData.username.toLowerCase())
    )
  })

  const handleWithdraw = async (tournamentId, tournamentTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your registration from "${tournamentTitle}"?`)) {
      return
    }

    setWithdrawAlert(null)
    try {
      await withdrawTeam(tournamentId, user?.email || profileData.username)
      setWithdrawAlert({ type: 'success', message: `Successfully withdrew registration from ${tournamentTitle}.` })
    } catch (err) {
      setWithdrawAlert({ type: 'error', message: err.message || 'Withdrawal failed.' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-600 p-[2px] shadow-xl shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-extrabold text-white">{profileData.username}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                PRO PLAYER DASHBOARD
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              <span>{user?.email || 'player@example.com'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-purple-300 rounded-xl transition-colors flex items-center gap-2 min-h-[44px]"
        >
          <Edit3 className="w-4 h-4" />
          <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Inline Profile Editing Form */}
      {isEditing && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-purple-400" />
            <span>Update Player Information</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Player Handle / Username"
              name="username"
              value={profileData.username}
              onChange={handleProfileChange}
              required
              icon={User}
            />

            <FormInput
              label="Free Fire UID"
              name="freeFireUid"
              value={profileData.freeFireUid}
              onChange={handleProfileChange}
              required
              icon={ShieldCheck}
            />

            <FormInput
              label="WhatsApp Number"
              name="whatsappNumber"
              value={profileData.whatsappNumber}
              onChange={handleProfileChange}
              required
              icon={Phone}
            />

            <div className="sm:col-span-3 text-right">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 ml-auto shadow-lg min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile Details Cards */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Game Handle</span>
            <div className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span>{profileData.username}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Free Fire Character UID</span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{profileData.freeFireUid}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">WhatsApp Contact</span>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{profileData.whatsappNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* My Registered Tournaments Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-amber-400" />
              <span>MY REGISTERED TOURNAMENTS</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage your active tournament slot bookings, view upcoming match details, and check your standings.
            </p>
          </div>

          <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold w-fit">
            {myTournaments.length} Active Bookings
          </span>
        </div>

        {withdrawAlert && <AuthAlert type={withdrawAlert.type} message={withdrawAlert.message} />}

        {/* Tournament Cards or Friendly Empty State */}
        {myTournaments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-950 border border-purple-800 flex items-center justify-center mx-auto text-purple-400">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-white">No Tournaments Registered Yet</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                You haven't booked a slot in any active Free Fire tournaments. Explore available competitions and enter your squad today!
              </p>
            </div>
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all min-h-[44px]"
            >
              <span>Browse Open Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myTournaments.map((t) => {
              const canWithdraw = t.status === 'Registration Open'
              return (
                <div
                  key={`my-tourney-${t.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-950 text-cyan-300 border border-cyan-500/30">
                        {t.game}
                      </span>
                      
                      {/* Registration Status Indicator */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Registration Confirmed</span>
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white">{t.title}</h3>
                    <p className="text-xs text-slate-400">{t.format} &bull; Organized by {t.organizer || 'MJ ESPORTS'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Start Date</span>
                      <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        {t.startDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Prize Pool</span>
                      <span className="text-emerald-400 font-extrabold">{t.prizePool}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-colors flex items-center gap-1.5 min-h-[38px]"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {canWithdraw ? (
                      <button
                        onClick={() => handleWithdraw(t.id, t.title)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-xs font-semibold text-slate-400 hover:text-red-300 transition-colors flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Withdraw</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Withdraw Closed
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
