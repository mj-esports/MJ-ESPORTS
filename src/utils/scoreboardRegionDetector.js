/**
 * MJ ESPORTS — Scoreboard Region & Layout Detector
 * 
 * Computes normalized coordinates and bounding boxes for standard Free Fire Battle Royale
 * match result scoreboards. Adapts dynamically to different resolutions (720p, 1080p, 1440p)
 * and mobile screen aspect ratios (16:9, 19.5:9, 20:9).
 */

/**
 * Detects structural columns and horizontal row regions for a Free Fire scoreboard.
 * 
 * @param {number} [imageWidth=1920]
 * @param {number} [imageHeight=1080]
 * @param {Object} [options]
 * @param {'Solo'|'Duo'|'Squad'} [options.format='Squad']
 * @param {number} [options.rowCount=12]
 * @returns {Object} Structured bounding box regions
 */
export function detectScoreboardRegions(imageWidth = 1920, imageHeight = 1080, {
  format = 'Squad',
  rowCount = 12,
} = {}) {
  const width = Math.max(640, imageWidth)
  const height = Math.max(360, imageHeight)

  // 1. Normalized Column Definitions (X-axis fractions 0.0 -> 1.0)
  const normalizedColumns = {
    rank: { xMin: 0.05, xMax: 0.14, label: 'Placement Rank' },
    playerIgn: { xMin: 0.14, xMax: 0.62, label: 'Player & Team IGN' },
    kills: { xMin: 0.62, xMax: 0.78, label: 'Eliminations / Kills' },
    damage: { xMin: 0.78, xMax: 0.94, label: 'Total Damage' },
  }

  // 2. Table Row Area (Y-axis bounds: header at ~18%, footer at ~92%)
  const tableTopNorm = 0.18
  const tableBottomNorm = 0.92
  const tableHeightNorm = tableBottomNorm - tableTopNorm
  const rowHeightNorm = tableHeightNorm / rowCount

  // 3. Generate Structured Row Slices
  const rows = []
  for (let i = 0; i < rowCount; i++) {
    const rowTopNorm = tableTopNorm + i * rowHeightNorm
    const rowBottomNorm = rowTopNorm + rowHeightNorm

    const rowPixelBox = {
      x: Math.round(normalizedColumns.rank.xMin * width),
      y: Math.round(rowTopNorm * height),
      width: Math.round((normalizedColumns.damage.xMax - normalizedColumns.rank.xMin) * width),
      height: Math.round(rowHeightNorm * height),
    }

    const rankBox = {
      x: Math.round(normalizedColumns.rank.xMin * width),
      y: Math.round(rowTopNorm * height),
      width: Math.round((normalizedColumns.rank.xMax - normalizedColumns.rank.xMin) * width),
      height: Math.round(rowHeightNorm * height),
    }

    const ignBox = {
      x: Math.round(normalizedColumns.playerIgn.xMin * width),
      y: Math.round(rowTopNorm * height),
      width: Math.round((normalizedColumns.playerIgn.xMax - normalizedColumns.playerIgn.xMin) * width),
      height: Math.round(rowHeightNorm * height),
    }

    const killsBox = {
      x: Math.round(normalizedColumns.kills.xMin * width),
      y: Math.round(rowTopNorm * height),
      width: Math.round((normalizedColumns.kills.xMax - normalizedColumns.kills.xMin) * width),
      height: Math.round(rowHeightNorm * height),
    }

    rows.push({
      rowIndex: i,
      expectedRank: i + 1,
      normalizedBounds: {
        top: rowTopNorm,
        bottom: rowBottomNorm,
        height: rowHeightNorm,
      },
      pixelBounds: rowPixelBox,
      subRegions: {
        rank: rankBox,
        playerIgn: ignBox,
        kills: killsBox,
      },
    })
  }

  return {
    imageDimensions: { width, height },
    format,
    rowCount,
    columns: normalizedColumns,
    tableBounds: {
      x: Math.round(normalizedColumns.rank.xMin * width),
      y: Math.round(tableTopNorm * height),
      width: Math.round((normalizedColumns.damage.xMax - normalizedColumns.rank.xMin) * width),
      height: Math.round(tableHeightNorm * height),
    },
    rows,
  }
}
