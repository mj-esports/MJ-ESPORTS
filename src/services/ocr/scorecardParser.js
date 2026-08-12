/**
 * MJ ESPORTS Multi-Layout Scorecard Parser for Free Fire & BGMI
 * 
 * Supports:
 * - Single-Player BR Result
 * - Multi-Player Squad Scoreboard Row Extraction
 * - K/D/A Ratio Column Parsing (e.g. 7/1/4 -> 7 kills)
 * - Header UI Noise Filtering (e.g. BR-CLASSEMENT, KALAHARI)
 */

// Noise words in UI headers and table column titles to ignore when looking for player IGN
const UI_HEADER_NOISE = [
  'BR-CLASSEMENT',
  'CLASSEMENT',
  'KALAHARI',
  'BERMUDA',
  'PURGATORY',
  'ALPINE',
  'NEXTERRA',
  'ERANGEL',
  'MIRAMAR',
  'SANHOK',
  'VIKENDI',
  'LIVIK',
  'MATCH RESULT',
  'SCORECARD',
  'VICTORY',
  'BOOYAH',
  'WINNER WINNER',
  'CHICKEN DINNER',
  'TEMPS DE SURVIE',
  'TEMPS',
  'SURVIE',
  'GUÉRIR',
  'HEAL',
  'HEALING',
  'NOTE',
  'NOM',
  'PLAYER',
  'PLAYERS',
  'KILLS',
  'KILL',
  'ELIMS',
  'DAMAGE',
  'DMG',
  'RANK',
  'PLACEMENT',
  'POSITION',
  'TOTAL',
  'MODE',
  'SQUAD',
  'SOLO',
  'DUO',
  'K/D/A',
  'KDA',
  'ASSISTS',
]

/**
 * Parses all valid player rows in a multi-player squad scorecard table
 */
export function parseMultiPlayerRows(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return []

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)
  const rows = []

  lines.forEach((line) => {
    // Check line for Player Row format with K/D/A ratio: [IGN] [K/D/A] [DAMAGE]
    const kdaRowMatch = line.match(/^([A-Za-z0-9_\-\.]{3,20})\s+[|\:\s]*(\d{1,2})\s*[\/\\]\s*\d{1,2}\s*[\/\\]\s*\d{1,2}\s+[|\:\s]*([\d,]{3,6})/i)
    if (kdaRowMatch) {
      const candidateIgn = kdaRowMatch[1].trim()
      const isNoise = UI_HEADER_NOISE.some((n) => candidateIgn.toUpperCase().includes(n))
      if (!isNoise) {
        rows.push({
          game_ign: candidateIgn,
          kills: parseInt(kdaRowMatch[2], 10),
          damage: parseInt(kdaRowMatch[3].replace(/,/g, ''), 10),
        })
        return
      }
    }

    // Check line for Standard Player Row format: [IGN] [KILLS] [DAMAGE]
    const stdRowMatch = line.match(/^([A-Za-z0-9_\-\.]{3,20})\s+[|\:\s]*(\d{1,2})\s+[|\:\s]*([\d,]{3,6})/i)
    if (stdRowMatch) {
      const candidateIgn = stdRowMatch[1].trim()
      const isNoise = UI_HEADER_NOISE.some((n) => candidateIgn.toUpperCase().includes(n))
      if (!isNoise) {
        rows.push({
          game_ign: candidateIgn,
          kills: parseInt(stdRowMatch[2], 10),
          damage: parseInt(stdRowMatch[3].replace(/,/g, ''), 10),
        })
      }
    }
  })

  return rows
}

/**
 * Main Scorecard Text Parser
 */
export function parseScorecardText(rawText = '', game = 'Free Fire MAX') {
  if (!rawText || typeof rawText !== 'string') {
    return {
      game_ign: null,
      kills: 0,
      damage: 0,
      placement: null,
      extracted_fields_count: 0,
      all_player_rows: [],
    }
  }

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)

  let game_ign = null
  let kills = undefined
  let damage = undefined
  let placement = null

  // 1. EXTRACT PLACEMENT RANK (e.g. "#1 / 48" or "#1/48" or "RANK #1")
  for (const line of lines) {
    const matchRank = line.match(/#\s*(\d{1,2})\s*(?:[\/\\]\s*\d+)?/i)
    if (matchRank && matchRank[1]) {
      placement = `#${matchRank[1]}`
      break
    }
  }

  if (!placement) {
    for (const line of lines) {
      const altRank = line.match(/(?:PLACEMENT|RANK|POSITION)\s*[:\-]?\s*#?\s*(\d{1,2})/i)
      if (altRank && altRank[1]) {
        placement = `#${altRank[1]}`
        break
      }
    }
  }

  // 2. PARSE MULTI-PLAYER SQUAD ROWS
  const multiRows = parseMultiPlayerRows(rawText)
  if (multiRows.length > 0) {
    game_ign = multiRows[0].game_ign
    kills = multiRows[0].kills
    damage = multiRows[0].damage
  }

  // 3. FALLBACK K/D/A COLUMN PARSING (e.g. "K/D/A: 7/1/4" or "AKAY_YT  7/1/4  1547")
  if (kills === undefined) {
    for (const line of lines) {
      const kdaMatch = line.match(/(?:K\/D\/A|KDA)\s*[:\-]?\s*(\d{1,2})\s*[\/\\]\s*\d{1,2}\s*[\/\\]\s*\d{1,2}/i)
      if (kdaMatch && kdaMatch[1]) {
        kills = parseInt(kdaMatch[1], 10)
        break
      }
    }
  }

  // 4. FALLBACK KEY-VALUE LABEL SCANNING (e.g. "IGN: AKAY_YT", "KILLS: 7", "DMG: 1547")
  if (!game_ign || kills === undefined || damage === undefined) {
    lines.forEach((line) => {
      // Key-Value IGN Match
      if (!game_ign) {
        const ignMatch = line.match(/(?:IGN|PLAYER|NAME|PLAYER NAME|NAME:)\s*[:\-]?\s*([A-Za-z0-9_\- ]{3,20})/i)
        if (ignMatch && ignMatch[1]) {
          const candidate = ignMatch[1].trim()
          const isNoise = UI_HEADER_NOISE.some((n) => candidate.toUpperCase().includes(n))
          if (!isNoise) {
            game_ign = candidate
          }
        }
      }

      // Key-Value Kills Match
      if (kills === undefined) {
        const killMatch = line.match(/(?:KILLS|KILL|ELIMINATIONS|ELIMS)\s*[:\-]?\s*(\d+)/i)
        if (killMatch && killMatch[1]) {
          kills = parseInt(killMatch[1], 10)
        }
      }

      // Key-Value Damage Match
      if (damage === undefined) {
        const dmgMatch = line.match(/(?:DAMAGE|DMG|TOTAL DAMAGE)\s*[:\-]?\s*([\d,]+)/i)
        if (dmgMatch && dmgMatch[1]) {
          damage = parseInt(dmgMatch[1].replace(/,/g, ''), 10)
        }
      }
    })
  }

  // 5. HEURISTIC NON-NOISE PLAYER NAME FALLBACK
  if (!game_ign) {
    for (const line of lines) {
      const upper = line.toUpperCase()
      const isNoise = UI_HEADER_NOISE.some((n) => upper.includes(n))
      const hasNumberOnly = /^\d+$/.test(line)
      if (!isNoise && !hasNumberOnly && line.length >= 3 && line.length <= 20) {
        game_ign = line.trim()
        break
      }
    }
  }

  let extractedCount = 0
  if (game_ign) extractedCount++
  if (kills !== undefined) extractedCount++
  if (damage !== undefined) extractedCount++
  if (placement) extractedCount++

  return {
    game_ign: game_ign || null,
    kills: kills !== undefined ? kills : 0,
    damage: damage !== undefined ? damage : 0,
    placement: placement || '#1',
    extracted_fields_count: extractedCount,
    all_player_rows: multiRows,
  }
}
