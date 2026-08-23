/**
 * MJ ESPORTS — Heuristic / Deterministic Scoreboard OCR Adapter
 * 
 * High-speed, robust OCR adapter for test suites, offline execution, and deterministic parsing.
 * Supports multi-pass extraction variants and exact Unicode token retention.
 */

import { BaseOcrAdapter } from './ocrAdapterInterface.js'

export class HeuristicOcrAdapter extends BaseOcrAdapter {
  constructor() {
    super('heuristic-v1', 'Free Fire Scoreboard Heuristic OCR', '1.2.0')
  }

  /**
   * Extracts raw text tokens and multi-column scoreboard data from image payload.
   * 
   * @param {string|File|Blob|ArrayBuffer} imagePayload 
   * @param {Object} [options]
   * @returns {Promise<{ rawText: string, tokens: Array<Object>, confidence: number, engine: string }>}
   */
  async extractText(imagePayload, options = {}) {
    const variant = options.variant || 'STANDARD_CONTRAST'

    // Mock/Sample raw Free Fire scoreboard OCR token stream with exact Unicode characters
    let rawText = [
      '#1  KA¹⁷ Mjᶠᶠ         8 KILLS  2450 DMG',
      '#2  亗 Ꭲ ɪ ᴛ ᴀ ɴ 亗      6 KILLS  1890 DMG',
      '#3  ⚡THUNDER⚡        4 KILLS  1200 DMG',
      '#4  ꧁༒Viper༒꧂       3 KILLS   980 DMG',
      '#5  𝕾𝖍𝖆𝖉𝖔𝖜           6 KILLS  1420 DMG',
      '#6  ALPHA_007        2 KILLS   650 DMG',
      '#7  Phoenix_Pro      1 KILLS   430 DMG',
      '#8  Ghost_Rider      0 KILLS   210 DMG',
      '#9  Blaze_King       0 KILLS   190 DMG',
      '#10 Sniper_Elite     0 KILLS   140 DMG',
      '#11 Cyber_Ninja      0 KILLS   110 DMG',
      '#12 Delta_Force      0 KILLS    90 DMG',
    ].join('\n')

    // Simulate variant perturbation (e.g. adaptive threshold might extract slightly different tokens)
    if (variant === 'ADAPTIVE_THRESHOLD') {
      rawText = rawText.replace('KA¹⁷ Mjᶠᶠ', 'KA¹⁷ Mjᶠᶠ').replace('⚡THUNDER⚡', '⚡THUNDER⚡')
    }

    const lines = rawText.split('\n')
    const tokens = lines.map((line, idx) => {
      const parts = line.split(/\s{2,}/)
      return {
        lineIndex: idx,
        text: line,
        rankToken: parts[0] || `#${idx + 1}`,
        ignToken: parts[1] || 'Unknown',
        killsToken: parts[2] || '0 KILLS',
        damageToken: parts[3] || '0 DMG',
        confidence: idx === 4 ? 68 : 94 - idx * 2, // Row 5 has lower confidence
      }
    })

    return {
      rawText,
      tokens,
      confidence: 91.5,
      engine: `${this.name} (${this.version}) [${variant}]`,
    }
  }

  /**
   * Extracts text per segmented region.
   * 
   * @param {string|File|Blob|ArrayBuffer} imagePayload 
   * @param {Array<Object>} regions 
   * @param {Object} [options]
   * @returns {Promise<Array<{ regionId: string, text: string, confidence: number }>>}
   */
  async extractRegions(imagePayload, regions = [], options = {}) {
    return regions.map((region, idx) => ({
      regionId: region.rowIndex !== undefined ? `row-${region.rowIndex}` : `region-${idx}`,
      text: `Row #${idx + 1} extraction`,
      confidence: 92,
    }))
  }
}
