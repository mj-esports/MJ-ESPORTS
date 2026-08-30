import { generateUUID } from './uuid.js'
import { normalizeLifecycleStatus } from '../constants/tournamentLifecycle.js'

export const VALID_TOURNAMENT_STATUSES = [
  'Draft',
  'Published',
  'Registration Open',
  'Registration Closed',
  'Check-in Open',
  'Check-in Closed',
  'Room Released',
  'Live',
  'Live Now',
  'Results Pending',
  'Completed',
  'Prize Distributed',
  'Bracket Locked',
  'Cancelled',
  'Archived',
]

/**
 * Normalizes a database row from public.tournaments back into a frontend tournament object.
 */
export function mapTournamentFromDb(row) {
  if (!row) return null

  let rulesArray = []
  if (Array.isArray(row.rules)) {
    rulesArray = row.rules
  } else if (typeof row.rules === 'string' && row.rules.trim()) {
    rulesArray = row.rules.split('\n').map((r) => r.trim()).filter(Boolean)
  }

  const formatStr = row.format || row.match_format || 'SQUAD (4P)'
  const statusStr = normalizeLifecycleStatus(row.status)

  return {
    id: String(row.id),
    title: row.title || '',
    game: row.game || 'Free Fire',
    format: formatStr,
    match_format: formatStr,
    prize_pool: row.prize_pool || '₹0',
    prizePool: row.prize_pool || '₹0',
    entry_fee: row.entry_fee || 'Free',
    entryFee: row.entry_fee || 'Free',
    max_teams: Number(row.max_teams || 12),
    maxTeams: Number(row.max_teams || 12),
    registered_teams: Number(row.registered_teams || 0),
    registeredTeams: Number(row.registered_teams || 0),
    start_date: row.start_date || '',
    startDate: row.start_date || '',
    start_time: row.start_time || '',
    startTime: row.start_time || '',
    status: statusStr,
    organizer: row.organizer || 'MJ ESPORTS Official',
    description: row.description || '',
    rules: rulesArray,
    teams_list: Array.isArray(row.teams_list) ? row.teams_list : [],
    teamsList: Array.isArray(row.teams_list) ? row.teams_list : [],
    roomId: row.room_id || null,
    roomPassword: row.room_password || null,
    roomStatus: row.room_status || 'Draft',
    roomLastUpdated: row.room_last_updated || null,
    roomPublishedBy: row.room_published_by || null,
    winnerTeam: row.winner_team || null,
    winnerCaptain: row.winner_captain || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }
}

/**
 * Normalizes frontend tournament data into the allowed public.tournaments database columns.
 * Constructs a clean, whitelist-only payload matching the exact database schema and constraints.
 */
export function mapTournamentToDb(t) {
  if (!t || typeof t !== 'object') return {}

  // 1. Title (Required string)
  const title = String(t.title || '').trim() || 'MJ Tournament'

  // 2. Game (Required string)
  const game = String(t.game || 'Free Fire MAX').trim()

  // 3. Format (Required string: SOLO (1P), DUO (2P), SQUAD (4P))
  const format = String(t.format || t.match_format || t.matchFormat || 'SQUAD (4P)').trim()

  // 4. Prize Pool (Required string: Per Kill, Placement, Winner Takes All)
  const prizePool = String(t.prize_pool || t.prizePool || '₹0').trim()

  // 5. Entry Fee (Required string: Free or ₹XX)
  const entryFee = String(t.entry_fee || t.entryFee || 'Free').trim()

  // 6. Max Teams / Slots (Required integer > 0)
  const rawMaxTeams = Number(t.max_teams ?? t.maxTeams ?? 12)
  const maxTeams = !isNaN(rawMaxTeams) && rawMaxTeams > 0 ? Math.floor(rawMaxTeams) : 12

  // 7. Registered Teams (Required integer >= 0)
  const rawRegistered = Number(t.registered_teams ?? t.registeredTeams ?? 0)
  const registeredTeams = !isNaN(rawRegistered) && rawRegistered >= 0 ? Math.floor(rawRegistered) : 0

  // 8. Start Date (Required string: YYYY-MM-DD or date string)
  const startDate = String(t.start_date || t.startDate || new Date().toISOString().split('T')[0]).trim()

  // 9. Start Time (Required/Optional string: 06:00 PM IST)
  const startTime = String(t.start_time || t.startTime || '06:00 PM IST').trim()

  // 10. Status (Canonical lifecycle stage status)
  let rawStatus = String(t.status || '').trim()
  if (rawStatus === 'Live') rawStatus = 'Live Now'
  const status = VALID_TOURNAMENT_STATUSES.includes(rawStatus) ? rawStatus : 'Registration Open'

  // 11. Organizer (Optional string)
  const organizer = String(t.organizer || 'MJ ESPORTS Official').trim()

  // 12. Description (Optional string)
  const description = String(t.description || 'Official high-stakes esports tournament.').trim()

  // 13. Rules (TEXT[] in Postgres: clean array of strings)
  let rulesArray = []
  if (Array.isArray(t.rules)) {
    rulesArray = t.rules.map((r) => (typeof r === 'string' ? r.trim() : String(r || '').trim())).filter(Boolean)
  } else if (typeof t.rules === 'string' && t.rules.trim()) {
    rulesArray = t.rules.split('\n').map((r) => r.trim()).filter(Boolean)
  }
  if (rulesArray.length === 0) {
    rulesArray = ['No emulators allowed.', 'Screen recording is mandatory.', 'Tournament admin decisions are final.']
  }

  // 14. Teams List (JSONB in Postgres: clean array)
  const teamsListVal = Array.isArray(t.teams_list)
    ? t.teams_list
    : Array.isArray(t.teamsList)
    ? t.teamsList
    : []

  // 15. ID (TEXT primary key)
  const idVal = t.id && !String(t.id).startsWith('t-') ? String(t.id).trim() : generateUUID()

  // Whitelist-only base payload matching public.tournaments columns
  const payload = {
    id: idVal,
    title,
    game,
    format,
    prize_pool: prizePool,
    entry_fee: entryFee,
    max_teams: maxTeams,
    registered_teams: registeredTeams,
    start_date: startDate,
    start_time: startTime,
    status,
    organizer,
    description,
    rules: rulesArray,
    teams_list: teamsListVal,
  }

  // Optional room & match lifecycle columns (attached only when present)
  if (t.roomId !== undefined || t.room_id !== undefined) {
    const rId = t.room_id ?? t.roomId
    payload.room_id = rId ? String(rId).trim() : null
  }
  if (t.roomPassword !== undefined || t.room_password !== undefined) {
    const rPass = t.room_password ?? t.roomPassword
    payload.room_password = rPass ? String(rPass).trim() : null
  }
  if (t.roomStatus !== undefined || t.room_status !== undefined) {
    payload.room_status = String(t.room_status ?? t.roomStatus ?? 'Draft').trim()
  }
  if (t.roomLastUpdated !== undefined || t.room_last_updated !== undefined) {
    payload.room_last_updated = t.room_last_updated ?? t.roomLastUpdated ?? null
  }
  if (t.roomPublishedBy !== undefined || t.room_published_by !== undefined) {
    const rPub = t.room_published_by ?? t.roomPublishedBy
    payload.room_published_by = rPub ? String(rPub).trim() : null
  }
  if (t.winnerTeam !== undefined || t.winner_team !== undefined) {
    const wTeam = t.winner_team ?? t.winnerTeam
    payload.winner_team = wTeam ? String(wTeam).trim() : null
  }
  if (t.winnerCaptain !== undefined || t.winner_captain !== undefined) {
    const wCap = t.winner_captain ?? t.winnerCaptain
    payload.winner_captain = wCap ? String(wCap).trim() : null
  }

  return payload
}

/**
 * Maps only the provided partial frontend fields to allowed database columns for targeted UPDATE queries.
 */
export function mapPartialTournamentToDb(fields) {
  if (!fields || typeof fields !== 'object') return {}

  const payload = {}

  if (fields.title !== undefined) payload.title = String(fields.title || '').trim()
  if (fields.game !== undefined) payload.game = String(fields.game || 'Free Fire MAX').trim()

  if (fields.format !== undefined || fields.match_format !== undefined || fields.matchFormat !== undefined) {
    payload.format = String(fields.format || fields.match_format || fields.matchFormat || 'SQUAD (4P)').trim()
  }

  if (fields.prizePool !== undefined || fields.prize_pool !== undefined) {
    payload.prize_pool = String(fields.prize_pool || fields.prizePool || '₹0').trim()
  }

  if (fields.entryFee !== undefined || fields.entry_fee !== undefined) {
    payload.entry_fee = String(fields.entry_fee || fields.entryFee || 'Free').trim()
  }

  if (fields.maxTeams !== undefined || fields.max_teams !== undefined) {
    const rawMax = Number(fields.max_teams ?? fields.maxTeams ?? 12)
    payload.max_teams = !isNaN(rawMax) && rawMax > 0 ? Math.floor(rawMax) : 12
  }

  if (fields.registeredTeams !== undefined || fields.registered_teams !== undefined) {
    const rawReg = Number(fields.registered_teams ?? fields.registeredTeams ?? 0)
    payload.registered_teams = !isNaN(rawReg) && rawReg >= 0 ? Math.floor(rawReg) : 0
  }

  if (fields.startDate !== undefined || fields.start_date !== undefined) {
    payload.start_date = String(fields.start_date || fields.startDate || '').trim()
  }

  if (fields.startTime !== undefined || fields.start_time !== undefined) {
    payload.start_time = String(fields.start_time || fields.startTime || '').trim()
  }

  if (fields.status !== undefined) {
    let s = String(fields.status || '').trim()
    if (s === 'Live') s = 'Live Now'
    if (VALID_TOURNAMENT_STATUSES.includes(s)) {
      payload.status = s
    }
  }

  if (fields.organizer !== undefined) payload.organizer = String(fields.organizer || 'MJ ESPORTS Official').trim()
  if (fields.description !== undefined) payload.description = String(fields.description || '').trim()

  if (fields.rules !== undefined) {
    if (Array.isArray(fields.rules)) {
      payload.rules = fields.rules.map((r) => (typeof r === 'string' ? r.trim() : String(r || '').trim())).filter(Boolean)
    } else if (typeof fields.rules === 'string' && fields.rules.trim()) {
      payload.rules = fields.rules.split('\n').map((r) => r.trim()).filter(Boolean)
    } else {
      payload.rules = []
    }
  }

  if (fields.teamsList !== undefined || fields.teams_list !== undefined) {
    payload.teams_list = Array.isArray(fields.teams_list)
      ? fields.teams_list
      : Array.isArray(fields.teamsList)
      ? fields.teamsList
      : []
  }

  if (fields.roomId !== undefined || fields.room_id !== undefined) {
    const rId = fields.room_id ?? fields.roomId
    payload.room_id = rId ? String(rId).trim() : null
  }

  if (fields.roomPassword !== undefined || fields.room_password !== undefined) {
    const rPass = fields.room_password ?? fields.roomPassword
    payload.room_password = rPass ? String(rPass).trim() : null
  }

  if (fields.roomStatus !== undefined || fields.room_status !== undefined) {
    payload.room_status = String(fields.room_status ?? fields.roomStatus ?? 'Draft').trim()
  }

  if (fields.roomLastUpdated !== undefined || fields.room_last_updated !== undefined) {
    payload.room_last_updated = fields.room_last_updated ?? fields.roomLastUpdated ?? null
  }

  if (fields.roomPublishedBy !== undefined || fields.room_published_by !== undefined) {
    const rPub = fields.room_published_by ?? fields.roomPublishedBy
    payload.room_published_by = rPub ? String(rPub).trim() : null
  }

  if (fields.winnerTeam !== undefined || fields.winner_team !== undefined) {
    const wTeam = fields.winner_team ?? fields.winnerTeam
    payload.winner_team = wTeam ? String(wTeam).trim() : null
  }

  if (fields.winnerCaptain !== undefined || fields.winner_captain !== undefined) {
    const wCap = fields.winner_captain ?? fields.winnerCaptain
    payload.winner_captain = wCap ? String(wCap).trim() : null
  }

  if (fields.updatedAt !== undefined || fields.updated_at !== undefined) {
    payload.updated_at = fields.updated_at ?? fields.updatedAt ?? new Date().toISOString()
  }

  return payload
}
