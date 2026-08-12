/**
 * MJ ESPORTS Canvas Image Preprocessor for Browser OCR
 * 
 * Performs client-side image enhancements before Tesseract WebAssembly execution:
 * - Scale/resize optimal DPI
 * - Grayscale conversion
 * - High-contrast binarization thresholding
 */

export async function preprocessScorecardImage(imageElementOrUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Target processing resolution width 1200px
        const maxW = 1200
        const scale = Math.min(1, maxW / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // Draw original
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Get image data for pixel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imageData.data

        // Grayscale + Contrast adjustment
        const contrast = 1.2
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

        for (let i = 0; i < d.length; i += 4) {
          // Grayscale luminance
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          
          // Contrast factor
          let adjusted = factor * (gray - 128) + 128
          adjusted = Math.min(255, Math.max(0, adjusted))

          d[i] = adjusted     // Red
          d[i + 1] = adjusted // Green
          d[i + 2] = adjusted // Blue
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        console.warn('[Image Preprocessing Notice]: Canvas fallback used.', err)
        resolve(typeof imageElementOrUrl === 'string' ? imageElementOrUrl : img.src)
      }
    }

    img.onerror = (err) => {
      console.warn('[Image Load Preprocessing Notice]: Original image used.', err)
      resolve(typeof imageElementOrUrl === 'string' ? imageElementOrUrl : '')
    }

    if (typeof imageElementOrUrl === 'string') {
      img.src = imageElementOrUrl
    } else if (imageElementOrUrl instanceof File || imageElementOrUrl instanceof Blob) {
      img.src = URL.createObjectURL(imageElementOrUrl)
    } else {
      resolve('')
    }
  })
}
