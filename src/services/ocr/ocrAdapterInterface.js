/**
 * MJ ESPORTS — Pluggable OCR Adapter Interface
 * 
 * Abstract base class and type contracts for OCR engines (Tesseract, Vision API, Heuristics).
 */

export class BaseOcrAdapter {
  constructor(id, name, version = '1.0.0') {
    this.id = id
    this.name = name
    this.version = version
  }

  /**
   * Extracts raw text and bounding tokens from an entire image.
   * 
   * @param {string|File|Blob|ArrayBuffer} imagePayload 
   * @param {Object} [options]
   * @returns {Promise<{ rawText: string, tokens: Array<Object>, confidence: number, engine: string }>}
   */
  async extractText(imagePayload, options = {}) {
    throw new Error(`Method 'extractText' must be implemented by adapter ${this.name}.`)
  }

  /**
   * Extracts text from segmented bounding box regions.
   * 
   * @param {string|File|Blob|ArrayBuffer} imagePayload 
   * @param {Array<Object>} regions 
   * @param {Object} [options]
   * @returns {Promise<Array<{ regionId: string, text: string, confidence: number }>>}
   */
  async extractRegions(imagePayload, regions = [], options = {}) {
    throw new Error(`Method 'extractRegions' must be implemented by adapter ${this.name}.`)
  }
}
