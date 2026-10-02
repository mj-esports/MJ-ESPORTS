/**
 * MJ ESPORTS — Player Identity & IGN Normalization Utilities
 * 
 * Provides canonical IGN formatting and deterministic Unicode-aware normalization
 * for Free Fire & BGMI player identity matching.
 */

import { isValidGameUid, sanitizeString } from './validationUtils.js'

/**
 * Produces the canonical display IGN.
 * Preserves exact Unicode glyphs, special fonts, subscript/superscript, symbols,
 * clan prefixes, and case while trimming surrounding whitespace and collapsing
 * internal excessive whitespace.
 * 
 * Example: "  KA¹⁷   Mjᶠᶠ  " -> "KA¹⁷ Mjᶠᶠ"
 * 
 * @param {string} rawIgn 
 * @returns {string} Canonical display IGN
 */
export function toCanonicalIgn(rawIgn) {
  if (!rawIgn || typeof rawIgn !== 'string') return ''
  return rawIgn
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Produces a deterministic normalized comparison key for player identity and search matching.
 * Performs Unicode Compatibility Decomposition (NFKC), lowercasing, and whitespace collapse.
 * 
 * Example: "KA¹⁷ Mjᶠᶠ" -> "ka17 mjff" (NFKC decomposes superscripts to standard digits)
 * 
 * @param {string} rawIgn 
 * @returns {string} Normalized comparison IGN
 */
export function normalizeIgn(rawIgn) {
  if (!rawIgn || typeof rawIgn !== 'string') return ''
  try {
    return rawIgn
      .normalize('NFKC')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
  } catch {
    return rawIgn
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
  }
}

/**
 * Validates Free Fire in-game name (IGN).
 * Accepts any non-empty character set (including symbols, emojis, unicode, stylized scripts).
 * Length must be between 1 and 30 characters after trimming.
 * 
 * @param {string} ign 
 * @returns {boolean}
 */
export function isValidIgn(ign) {
  if (!ign || typeof ign !== 'string') return false
  const trimmed = ign.trim()
  return trimmed.length >= 1 && trimmed.length <= 30
}

/**
 * Builds structured active player roster array with canonical and normalized identity fields.
 * 
 * @param {Object} params
 * @param {string} params.captainUid
 * @param {string} params.captainIgn
 * @param {string[]} [params.teammateUids]
 * @param {string[]} [params.teammateIgns]
 * @param {string[]} [params.substituteUids]
 * @param {string[]} [params.substituteIgns]
 * @returns {Array<{ role: string, uid: string, canonicalIgn: string, normalizedIgn: string }>}
 */
export function buildRosterArray({
  captainUid,
  captainIgn,
  teammateUids = [],
  teammateIgns = [],
  substituteUids = [],
  substituteIgns = [],
}) {
  const roster = []

  // Captain
  if (captainUid) {
    roster.push({
      role: 'Captain',
      uid: String(captainUid).trim().toUpperCase(),
      canonicalIgn: toCanonicalIgn(captainIgn),
      normalizedIgn: normalizeIgn(captainIgn),
    })
  }

  // Teammates
  const activeTeammateCount = Math.max(teammateUids.length, teammateIgns.length)
  for (let i = 0; i < activeTeammateCount; i++) {
    const uid = teammateUids[i]
    const ign = teammateIgns[i] || ''
    if (uid && String(uid).trim()) {
      roster.push({
        role: 'Member',
        uid: String(uid).trim().toUpperCase(),
        canonicalIgn: toCanonicalIgn(ign),
        normalizedIgn: normalizeIgn(ign),
      })
    }
  }

  // Substitutes
  const subCount = Math.max(substituteUids.length, substituteIgns.length)
  for (let s = 0; s < subCount; s++) {
    const sUid = substituteUids[s]
    const sIgn = substituteIgns[s] || ''
    if (sUid && String(sUid).trim()) {
      roster.push({
        role: 'Substitute',
        uid: String(sUid).trim().toUpperCase(),
        canonicalIgn: toCanonicalIgn(sIgn),
        normalizedIgn: normalizeIgn(sIgn),
      })
    }
  }

  return roster
}

/**
 * Resolves the authoritative Free Fire IGN for identity comparison.
 * Prioritizes stored canonical IGN from player evidence (player_identity_evidence.canonical_ign)
 * or verified status, then explicit game IGN metadata, before falling back to account display name.
 * 
 * @param {Object} [params]
 * @param {string} [params.evidenceIgn] - Stored canonical_ign from player_identity_evidence
 * @param {string} [params.verifiedIgn] - Stored verified canonical IGN
 * @param {string} [params.metaIgn] - Game IGN stored in user_metadata (canonical_ign, freeFireIgn, gameIgn)
 * @param {string} [params.profileIgn] - Canonical IGN stored in profile
 * @param {string} [params.formUsername] - Current form display name / account username
 * @returns {string} Authoritative Free Fire IGN for comparison
 */
export function resolveAuthoritativeProfileIgn({
  evidenceIgn = '',
  verifiedIgn = '',
  metaIgn = '',
  profileIgn = '',
  formUsername = '',
} = {}) {
  const storedCanonical = String(
    evidenceIgn ||
    verifiedIgn ||
    metaIgn ||
    profileIgn ||
    ''
  ).trim()

  const cleanForm = String(formUsername || '').trim()

  if (storedCanonical) {
    return storedCanonical
  }

  return cleanForm
}

export { isValidGameUid, sanitizeString }
