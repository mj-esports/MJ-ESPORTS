/**
 * Centralized Tournament Slot & Format Utilities
 * Resolves player capacity, filled player slots, and team capacity without semantic confusion.
 */

/**
 * Resolves the number of starting players per team based on tournament format / mode.
 * Solo = 1, Duo = 2, Squad = 4 (default).
 * 
 * @param {Object} tournament 
 * @returns {number} 1 | 2 | 4
 */
export function getPlayersPerTeam(tournament) {
  if (!tournament) return 4

  const teamSize = Number(tournament.team_size ?? tournament.teamSize ?? 0)
  if (teamSize === 1) return 1
  if (teamSize === 2) return 2
  if (teamSize > 2) return teamSize

  const rawFormat = (
    tournament.match_format ||
    tournament.matchFormat ||
    tournament.format ||
    tournament.mode ||
    ''
  ).toLowerCase().trim()

  if (rawFormat.includes('solo')) return 1
  if (rawFormat.includes('duo')) return 2
  return 4
}

/**
 * Resolves formatted mode configuration for tournament registration & display.
 * 
 * @param {Object} tournament 
 * @returns {{ mode: string, requiredPlayers: number, formatTitle: string, slotUnit: string }}
 */
export function getTournamentMode(tournament) {
  const playersPerTeam = getPlayersPerTeam(tournament)

  const rawFormat = (
    tournament?.match_format ||
    tournament?.matchFormat ||
    tournament?.format ||
    tournament?.mode ||
    ''
  ).trim()

  if (playersPerTeam === 1) {
    return {
      mode: 'Solo',
      requiredPlayers: 1,
      formatTitle: rawFormat || 'Solo Battle Royale',
      slotUnit: 'Players',
      teamUnit: 'Players',
    }
  }

  if (playersPerTeam === 2) {
    return {
      mode: 'Duo',
      requiredPlayers: 2,
      formatTitle: rawFormat || 'Duo Battle Royale',
      slotUnit: 'Players',
      teamUnit: 'Duos',
    }
  }

  return {
    mode: 'Squad',
    requiredPlayers: 4,
    formatTitle: rawFormat || 'Squad Battle Royale',
    slotUnit: 'Players',
    teamUnit: 'Squads',
  }
}

/**
 * Calculates total filled player slots.
 * 1. Accurately counts valid player UIDs across teamsList if roster data is available.
 * 2. Does NOT count bench substitutes toward starting player slots.
 * 3. Falls back to (registeredTeams * playersPerTeam) if teamsList is unavailable.
 * 
 * @param {Object} tournament 
 * @returns {number} Total starting player slots filled
 */
export function calculateFilledPlayerSlots(tournament) {
  if (!tournament) return 0

  const teamsList = tournament.teamsList || tournament.teams_list

  if (Array.isArray(teamsList) && teamsList.length > 0) {
    let totalPlayers = 0

    teamsList.forEach((team) => {
      if (!team) return

      // 1. Check captain UID
      const hasCaptain = Boolean(
        (team.freeFireUid && String(team.freeFireUid).trim() !== '') ||
        (team.captain_uid && String(team.captain_uid).trim() !== '') ||
        (team.captainUid && String(team.captainUid).trim() !== '') ||
        (team.captain && String(team.captain).trim() !== '')
      )

      // 2. Count valid non-empty teammate UIDs (excluding bench substitutes)
      let teammateCount = 0
      if (Array.isArray(team.teammates)) {
        teammateCount = team.teammates.filter(
          (uid) => uid && String(uid).trim() !== ''
        ).length
      }

      const teamPlayerCount = (hasCaptain ? 1 : 0) + teammateCount

      // If a team entry has a captain or teammates, add the count; otherwise fallback to format team size
      if (teamPlayerCount > 0) {
        totalPlayers += teamPlayerCount
      } else {
        totalPlayers += getPlayersPerTeam(tournament)
      }
    })

    return totalPlayers
  }

  // Safe fallback if roster array is not loaded: registeredTeams * playersPerTeam
  const registeredTeams = Number(tournament.registeredTeams ?? tournament.registered_teams ?? 0)
  return Math.max(0, registeredTeams * getPlayersPerTeam(tournament))
}

/**
 * Calculates total player slot capacity: maxTeams * playersPerTeam
 * 
 * @param {Object} tournament 
 * @returns {number}
 */
export function calculateTotalPlayerSlots(tournament) {
  if (!tournament) return 12 * 4
  const maxTeams = Number(tournament.maxTeams ?? tournament.max_teams ?? 12)
  return Math.max(0, maxTeams * getPlayersPerTeam(tournament))
}

/**
 * Authoritative default game and mode capacity configuration.
 * Free Fire MAX: 50 room capacity (Squad: 12 squads = 48 players, Duo: 25 duos = 50 players, Solo: 50 players)
 * BGMI: 100 room capacity (Squad: 25 squads = 100 players, Duo: 50 duos = 100 players, Solo: 100 players)
 * 
 * @param {string} game 
 * @param {string} mode 
 * @returns {{ maxTeams: number, maxPlayers: number, roomCap: number, teamSize: number, teamUnit: string }}
 */
export function getDefaultGameCapacity(game, mode) {
  const cleanGame = String(game || '').toLowerCase().trim()
  const cleanMode = String(mode || '').toLowerCase().trim()

  const isBgmi = cleanGame.includes('bgmi') || cleanGame.includes('battlegrounds')
  const roomCap = isBgmi ? 100 : 50

  let teamSize = 4
  let teamUnit = 'Squads'
  if (cleanMode.includes('solo') || cleanMode === '1' || cleanMode === '1p') {
    teamSize = 1
    teamUnit = 'Players'
  } else if (cleanMode.includes('duo') || cleanMode === '2' || cleanMode === '2p') {
    teamSize = 2
    teamUnit = 'Duos'
  }

  const maxTeams = Math.floor(roomCap / teamSize)
  const maxPlayers = maxTeams * teamSize

  return {
    maxTeams,
    maxPlayers,
    roomCap,
    teamSize,
    teamUnit,
  }
}

/**
 * Resolves team size (number of starting active players) from mode string.
 * 
 * @param {string} mode 
 * @returns {number} 1 | 2 | 4
 */
export function getTeamSize(mode) {
  const clean = String(mode || '').toLowerCase().trim()
  if (clean.includes('solo') || clean === '1') return 1
  if (clean.includes('duo') || clean === '2') return 2
  return 4
}

/**
 * Returns total player capacity.
 * 
 * @param {Object} tournament 
 * @returns {number}
 */
export function getPlayerCapacity(tournament) {
  return calculateTotalPlayerSlots(tournament)
}

/**
 * Returns total team capacity.
 * 
 * @param {Object} tournament 
 * @returns {number}
 */
export function getTeamCapacity(tournament) {
  if (!tournament) return 12
  return Number(tournament.maxTeams ?? tournament.max_teams ?? 12)
}

/**
 * Returns unified human-readable capacity label (e.g. "4 / 48 Players (1 / 12 Squads)").
 * 
 * @param {Object} tournament 
 * @returns {string}
 */
export function getCapacityLabel(tournament) {
  if (!tournament) return ''
  const filledPlayers = calculateFilledPlayerSlots(tournament)
  const totalPlayers = calculateTotalPlayerSlots(tournament)
  const regTeams = Number(tournament.registeredTeams ?? tournament.registered_teams ?? 0)
  const maxTeams = getTeamCapacity(tournament)
  const modeInfo = getTournamentMode(tournament)

  if (modeInfo.mode === 'Solo') {
    return `${filledPlayers} / ${totalPlayers} Players`
  }
  return `${filledPlayers} / ${totalPlayers} Players (${regTeams} / ${maxTeams} ${modeInfo.teamUnit})`
}

/**
 * Calculates remaining available player slots.
 * 
 * @param {Object} tournament 
 * @returns {number}
 */
export function calculateRemainingPlayerSlots(tournament) {
  const total = calculateTotalPlayerSlots(tournament)
  const filled = calculateFilledPlayerSlots(tournament)
  return Math.max(0, total - filled)
}

/**
 * Calculates percentage of player slots filled (0 - 100).
 * 
 * @param {Object} tournament 
 * @returns {number}
 */
export function calculateSlotFillPercentage(tournament) {
  const total = calculateTotalPlayerSlots(tournament)
  const filled = calculateFilledPlayerSlots(tournament)
  if (total <= 0) return 0
  return Math.min(100, Math.round((filled / total) * 100))
}
