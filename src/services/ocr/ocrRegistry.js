/**
 * MJ ESPORTS — OCR Engine Provider Registry
 * 
 * Manages registered OCR engine adapters and provides a unified entrypoint
 * for multi-pass scoreboard image processing.
 */

import { HeuristicOcrAdapter } from './heuristicOcrAdapter.js'
import { TesseractClientAdapter } from './tesseractClientAdapter.js'

class OcrEngineRegistry {
  constructor() {
    this.adapters = new Map()
    // Register default adapters
    this.registerAdapter(new HeuristicOcrAdapter())
    this.registerAdapter(new TesseractClientAdapter())
    // Default active adapter
    this.activeAdapterId = 'heuristic-v1'
  }

  /**
   * Registers a new OCR adapter.
   * @param {import('./ocrAdapterInterface.js').BaseOcrAdapter} adapter 
   */
  registerAdapter(adapter) {
    if (!adapter || !adapter.id) {
      throw new Error('Invalid OCR adapter: missing id or implementation.')
    }
    this.adapters.set(adapter.id, adapter)
  }

  /**
   * Sets the active OCR adapter by ID.
   * @param {string} adapterId 
   */
  setActiveAdapter(adapterId) {
    if (!this.adapters.has(adapterId)) {
      throw new Error(`OCR Adapter '${adapterId}' is not registered. Available: ${Array.from(this.adapters.keys()).join(', ')}`)
    }
    this.activeAdapterId = adapterId
  }

  /**
   * Retrieves the currently active OCR adapter.
   * @returns {import('./ocrAdapterInterface.js').BaseOcrAdapter}
   */
  getActiveAdapter() {
    return this.adapters.get(this.activeAdapterId) || this.adapters.get('heuristic-v1')
  }

  /**
   * Lists all registered OCR adapter definitions.
   * @returns {Array<{ id: string, name: string, version: string }>}
   */
  listAdapters() {
    return Array.from(this.adapters.values()).map((a) => ({
      id: a.id,
      name: a.name,
      version: a.version,
    }))
  }
}

export const ocrRegistry = new OcrEngineRegistry()
