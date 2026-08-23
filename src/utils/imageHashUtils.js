/**
 * MJ ESPORTS — Image Hashing & Integrity Utilities
 * 
 * Provides cryptographic SHA-256 calculation for exact duplicate rejection,
 * 64-bit perceptual hash (pHash / aHash) calculation for near-duplicate visual detection,
 * and comprehensive image format and dimension validation.
 */

/**
 * Calculates SHA-256 cryptographic hash of a file or ArrayBuffer.
 * Works seamlessly in both modern browsers (Web Crypto) and Node.js environments.
 * 
 * @param {File|Blob|ArrayBuffer|Uint8Array} fileOrBuffer 
 * @returns {Promise<string>} 64-character lowercase hexadecimal hash
 */
export async function calculateImageSha256(fileOrBuffer) {
  if (!fileOrBuffer) {
    throw new Error('No image payload provided for SHA-256 calculation.')
  }

  let buffer
  if (typeof File !== 'undefined' && fileOrBuffer instanceof File) {
    buffer = await fileOrBuffer.arrayBuffer()
  } else if (typeof Blob !== 'undefined' && fileOrBuffer instanceof Blob) {
    buffer = await fileOrBuffer.arrayBuffer()
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer
  } else if (ArrayBuffer.isView(fileOrBuffer)) {
    buffer = fileOrBuffer.buffer
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileOrBuffer)) {
    // Node.js Buffer
    buffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength)
  } else if (typeof fileOrBuffer === 'string') {
    buffer = new TextEncoder().encode(fileOrBuffer).buffer
  } else if (typeof fileOrBuffer === 'object') {
    buffer = new TextEncoder().encode(JSON.stringify(fileOrBuffer)).buffer
  } else {
    throw new Error('Unsupported payload type for SHA-256 calculation.')
  }

  // 1. Browser Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // 2. Node.js Crypto Fallback
  try {
    const nodeCrypto = await import('crypto')
    const hash = nodeCrypto.createHash('sha256')
    hash.update(new Uint8Array(buffer))
    return hash.digest('hex')
  } catch (err) {
    throw new Error(`Failed to compute SHA-256 hash: ${err.message}`)
  }
}

/**
 * Calculates a 64-bit perceptual hash (aHash) for visual similarity comparison.
 * In the browser, downscales image to 8x8 grayscale, computes mean, and builds a 64-bit bitmask.
 * In Node, generates a deterministic spatial intensity matrix.
 * 
 * @param {File|Blob|ArrayBuffer|HTMLImageElement|string} input 
 * @returns {Promise<string>} 16-character hexadecimal perceptual hash
 */
export async function calculateImagePHash(input) {
  if (!input) {
    throw new Error('No input provided for perceptual hash calculation.')
  }

  // Browser Canvas Implementation (if HTMLImageElement or Blob in browser DOM)
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
      let imgElement = input
      let cleanupUrl = null

      if (!(input instanceof HTMLImageElement)) {
        let blob = input
        if (input instanceof ArrayBuffer) {
          blob = new Blob([input], { type: 'image/png' })
        }
        const url = URL.createObjectURL(blob)
        cleanupUrl = url
        imgElement = await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error('Failed to load image for pHash computation.'))
          img.src = url
        })
      }

      // Draw downscaled 8x8 image
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      const ctx = canvas.getContext('2d')
      ctx.drawImage(imgElement, 0, 0, 8, 8)
      const imgData = ctx.getImageData(0, 0, 8, 8)
      const pixels = imgData.data

      if (cleanupUrl) {
        URL.revokeObjectURL(cleanupUrl)
      }

      // Compute 64 grayscale values
      const grays = []
      let sum = 0
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        // Standard perceptual luminance: 0.299R + 0.587G + 0.114B
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        grays.push(gray)
        sum += gray
      }

      const mean = sum / 64
      let hexHash = ''
      for (let byteIdx = 0; byteIdx < 8; byteIdx++) {
        let byteVal = 0
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const idx = byteIdx * 8 + bitIdx
          if (grays[idx] >= mean) {
            byteVal |= (1 << (7 - bitIdx))
          }
        }
        hexHash += byteVal.toString(16).padStart(2, '0')
      }

      return hexHash.toLowerCase()
    } catch (browserErr) {
      console.warn('[ImageHashUtils] Browser canvas pHash notice:', browserErr)
    }
  }

  // Node.js / Buffer Deterministic Fallback Hash
  try {
    let bytes
    if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input)
    } else if (ArrayBuffer.isView(input)) {
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
      bytes = new Uint8Array(input)
    } else {
      bytes = new TextEncoder().encode(String(input))
    }

    // Sample 64 points across payload
    const step = Math.max(1, Math.floor(bytes.length / 64))
    const samples = []
    let sum = 0
    for (let i = 0; i < 64; i++) {
      const val = bytes[(i * step) % bytes.length] || 0
      samples.push(val)
      sum += val
    }
    const avg = sum / 64

    let hexResult = ''
    for (let b = 0; b < 8; b++) {
      let byteVal = 0
      for (let bit = 0; bit < 8; bit++) {
        const idx = b * 8 + bit
        if (samples[idx] >= avg) {
          byteVal |= (1 << (7 - bit))
        }
      }
      hexResult += byteVal.toString(16).padStart(2, '0')
    }

    return hexResult.toLowerCase()
  } catch (nodeErr) {
    throw new Error(`Failed to compute perceptual hash: ${nodeErr.message}`)
  }
}

/**
 * Calculates the Hamming Distance (differing bit count) between two 64-bit hex perceptual hashes.
 * Distance 0 = Exact visual match.
 * Distance <= 5 = Likely resized/recompressed near-duplicate (POSSIBLE_DUPLICATE).
 * 
 * @param {string} hash1 - 16-character hex hash
 * @param {string} hash2 - 16-character hex hash
 * @returns {{ distance: number, isExactVisualMatch: boolean, isNearDuplicate: boolean }}
 */
export function calculateHammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return { distance: 64, isExactVisualMatch: false, isNearDuplicate: false }
  }

  const h1 = hash1.toLowerCase()
  const h2 = hash2.toLowerCase()

  let distance = 0
  for (let i = 0; i < h1.length; i += 2) {
    const byte1 = parseInt(h1.substr(i, 2), 16) || 0
    const byte2 = parseInt(h2.substr(i, 2), 16) || 0
    let xor = byte1 ^ byte2
    // Count set bits in xor
    while (xor > 0) {
      distance += xor & 1
      xor >>= 1
    }
  }

  return {
    distance,
    isExactVisualMatch: distance === 0,
    isNearDuplicate: distance <= 5, // Threshold for visual near-duplicate
  }
}

/**
 * Validates a scoreboard image file for MIME type, file size, and minimum resolution.
 * 
 * @param {File|Blob|Object} file 
 * @returns {Promise<{ valid: boolean, error?: string, dimensions?: { width: number, height: number } }>}
 */
export async function validateScoreboardImage(file) {
  if (!file) {
    return { valid: false, error: 'No image file selected.' }
  }

  // 1. MIME Type Validation
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  const fileType = (file.type || '').toLowerCase()
  const fileName = (file.name || '').toLowerCase()

  const hasValidMime = allowedMimeTypes.includes(fileType)
  const hasValidExt = /\.(png|jpe?g|webp)$/i.test(fileName)

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: `Unsupported image format (${fileType || 'unknown'}). Allowed: PNG, JPEG, JPG, WEBP.`,
    }
  }

  // 2. File Size Validation (Min 10KB, Max 15MB)
  const minSize = 10 * 1024 // 10 KB
  const maxSize = 15 * 1024 * 1024 // 15 MB

  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File size is too small (under 10 KB). Scoreboard text will be unreadable.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds maximum allowed limit (15 MB).',
    }
  }

  // 3. Browser Dimension Check (Min 640x360 for OCR legibility)
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && (file instanceof Blob || file instanceof File)) {
    try {
      const url = URL.createObjectURL(file)
      const dimensions = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = () => {
          reject(new Error('Corrupted image payload. Failed to decode image pixels.'))
        }
        img.src = url
      })
      URL.revokeObjectURL(url)

      if (dimensions.width < 640 || dimensions.height < 360) {
        return {
          valid: false,
          error: `Image resolution (${dimensions.width}x${dimensions.height}) is too low for scoreboard OCR. Minimum 640x360 (1080p recommended).`,
          dimensions,
        }
      }

      return { valid: true, dimensions }
    } catch (dimErr) {
      return { valid: false, error: dimErr.message || 'Invalid or corrupted image file.' }
    }
  }

  return { valid: true }
}
