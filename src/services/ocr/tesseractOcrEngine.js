import { createWorker } from 'tesseract.js'
import { preprocessScorecardImage } from './imagePreprocessor'
import { parseScorecardText } from './scorecardParser'

/**
 * Client-Side True Image OCR Engine utilizing Tesseract WebAssembly worker
 */
export async function runRealImageOcr(imageSource, game = 'Free Fire MAX') {
  const startTime = Date.now()

  try {
    // Step 1: Preprocess image with HTML5 Canvas
    const processedImageData = await preprocessScorecardImage(imageSource)

    // Step 2: Initialize WebAssembly Tesseract Worker
    const worker = await createWorker('eng')
    
    // Step 3: Recognize text from image
    const ret = await worker.recognize(processedImageData || imageSource)
    await worker.terminate()

    const rawText = ret.data?.text || ''
    const confidence = Math.round(ret.data?.confidence || 0)

    // Step 4: Parse structured fields
    const parsedData = parseScorecardText(rawText, game)

    return {
      success: true,
      data: {
        game_ign: parsedData.game_ign,
        kills: parsedData.kills,
        damage: parsedData.damage,
        placement: parsedData.placement,
        confidence: confidence > 0 ? confidence : 75,
        raw_text: rawText,
        extracted_fields_count: parsedData.extracted_fields_count,
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
      },
    }
  } catch (err) {
    console.error('[Tesseract WebAssembly OCR Error]:', err)

    return {
      success: false,
      error: err.message || 'Tesseract WebAssembly processing exception.',
      data: {
        game_ign: null,
        kills: 0,
        damage: 0,
        placement: null,
        confidence: 0,
        raw_text: '',
        extracted_fields_count: 0,
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
      },
    }
  }
}
