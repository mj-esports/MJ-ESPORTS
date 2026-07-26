export const SUPPORTED_GAMES = ['Free Fire', 'BGMI']

export const INITIAL_TOURNAMENTS = [
  {
    id: 't-1',
    title: 'Free Fire India Championship (FFIC) 2026',
    game: 'Free Fire',
    format: 'Squad Battle Royale',
    prizePool: '₹5,000,000',
    entryFee: 'Free',
    registeredTeams: 0,
    maxTeams: 64,
    status: 'Registration Open',
    bannerGradient: 'from-amber-600/30 to-purple-900/40',
    startDate: '2026-08-01',
    startTime: '06:00 PM IST',
    organizer: 'MJ ESPORTS Official',
    description: 'The flagship Free Fire tournament of the year. 64 elite squads compete across Bermuda, Purgatory, and Kalahari for the national championship and prize pool.',
    rules: [
      'Squad of 4 players + 1 optional sub.',
      'Kill Points: 1 point per finish.',
      'Placement Points: 1st Booyah = 12 pts, 2nd = 9 pts, 3rd = 8 pts, 4th = 7 pts, 5th = 6 pts.',
      'Mobile devices only (Emulators and hacks strictly prohibited).',
      'Players must check in 30 minutes before match start time.',
    ],
    teamsList: [],
    bracketData: {
      quarterFinals: [],
      semiFinals: [],
      finals: [],
    },
  },
  {
    id: 't-2',
    title: 'BGMI Pro Invitational Championship 2026',
    game: 'BGMI',
    format: 'Squad Battle Royale',
    prizePool: '₹2,50,000',
    entryFee: 'Free',
    registeredTeams: 0,
    maxTeams: 32,
    status: 'Registration Open',
    bannerGradient: 'from-cyan-600/30 to-slate-900/40',
    startDate: '2026-08-05',
    startTime: '07:00 PM IST',
    organizer: 'MJ ESPORTS Official',
    description: 'Official BGMI tournament series for verified rosters across Erangel, Miramar, and Sanhok.',
    rules: [
      'Official BGMI Esports Tournament Ruleset.',
      'Map Rotation: Erangel, Miramar, Sanhok.',
      'Fair play verification and in-app referee monitoring enforced.',
    ],
    teamsList: [],
    bracketData: {
      quarterFinals: [],
      semiFinals: [],
      finals: [],
    },
  },
]

export const MOCK_LEADERBOARD = []

export const MOCK_MVP_PLAYERS = []
