export type GameType = 'Free Fire' | 'BGMI' | 'ALL'

export interface TournamentItem {
  id: string
  title: string
  game: string
  format: string
  prizePool: string
  entryFee: string
  registeredTeams: number
  maxTeams: number
  status: 'Live Now' | 'Registration Open' | 'Registration Closed' | 'Confirmed' | 'URGENT' | string
  badgeText?: string
  startDate?: string
  startTime?: string
  fillPercentage?: number
}

export interface MatchScheduleItem {
  id: string
  time: string
  team1: string
  team2: string
  team1Short: string
  team2Short: string
  isLive?: boolean
}

export interface LeaderboardPlayerItem {
  rank: number | string
  player: string
  kills: number
  earned: string
  game?: string
}

export interface UserProfileInfo {
  username: string
  rank: string
  walletBalance: string
  avatarUrl?: string
}
