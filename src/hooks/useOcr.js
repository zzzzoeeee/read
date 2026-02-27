import { useRef, useCallback, useEffect } from 'react'
import { createWorker } from 'tesseract.js'
import { useStore } from '../state/useStore'

const LANGUAGE_LABELS = {
  eng: 'English', fra: 'French', deu: 'German', spa: 'Spanish',
  ita: 'Italian', por: 'Portuguese', rus: 'Russian', chi_sim: 'Chinese (Simplified)',
  chi_tra: 'Chinese (Traditional)', jpn: 'Japanese', kor: 'Korean',
  ara: 'Arabic', hin: 'Hindi', nld: 'Dutch', pol: 'Polish',
}

/**
 * OCR hook using a single Tesseract.js worker.
 * Caches results per (pageNumber, zoom, language) key.
 */
export function useOcr() {
  const ocrLanguage = useStore((s) => s.ocrLanguage)
  const ocrCache = useStore((s) => s.ocrCache)
  const setOcrResult = useStore((s) => s.setOcrResult)
  const setOcrLoading = useStore((s) => s.setOcrLoading)
  const setOcrProgress = useStore((s) => s.setOcrProgress)
  const addOcrLog = useStore((s) => s.addOcrLog)

  const workerRef = useRef(null)
  const workerReadyRef = useRef(false)
  const currentLangRef = useRef(null)
  const pendingRef = useRef(null)
  const isRunningRef = useRef(false)

  // Initialize / reinitialize worker when language changes
  const initWorker = useCallback(async (lang) => {
    if (workerRef.current) {
      try { await workerRef.current.terminate() } catch (_) {}
      workerRef.current = null
      workerReadyRef.current = false
    }

    const langLabel = LANGUAGE_LABELS[lang] || lang
    addOcrLog(`Worker initializing for language: ${langLabel}…`)

    try {
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
          }
        },
        // Use bundled wasm from node_modules via Vite
        workerPath: new URL('tesseract.js/dist/worker.min.js', import.meta.url).toString(),
        corePath: new URL('tesseract.js-core/tesseract-core-simd-lstm.wasm', import.meta.url).toString(),
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
      })
      workerRef.current = worker
      workerReadyRef.current = true
      currentLangRef.current = lang
      setOcrProgress(0)
      addOcrLog('Worker ready')

      // Process any request that was queued while worker was initializing
      if (pendingRef.current) {
        const { canvas: c, pageNumber: pn, zoom: z, forceRun: fr } = pendingRef.current
        pendingRef.current = null
        // Use setTimeout to avoid calling runOcr before it's defined in closure
        setTimeout(() => runOcr(c, pn, z, fr), 0)
      }
    } catch (err) {
      console.error('Tesseract worker init failed:', err)
      workerReadyRef.current = false
      addOcrLog(`Worker init failed: ${err.message}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOcrProgress, addOcrLog])

  useEffect(() => {
    initWorker(ocrLanguage)
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {})
      }
    }
  }, [ocrLanguage, initWorker])

  /**
   * Run OCR on a canvas element.
   * @param {HTMLCanvasElement} canvas - source canvas (full page render)
   * @param {number} pageNumber
   * @param {number} zoom
   * @param {boolean} forceRun - skip cache and re-run even if result is cached
   */
  const runOcr = useCallback(async (canvas, pageNumber, zoom, forceRun = false) => {
    const cacheKey = `${pageNumber}:${zoom.toFixed(2)}:${ocrLanguage}`

    // Return cached result unless force-running
    if (!forceRun && ocrCache[cacheKey] !== undefined) {
      addOcrLog(`OCR skipped — result cached for page ${pageNumber}`)
      return ocrCache[cacheKey]
    }

    if (!workerReadyRef.current || !workerRef.current) {
      // Queue the request — will be picked up after initWorker completes
      pendingRef.current = { canvas, pageNumber, zoom, forceRun }
      if (forceRun) {
        addOcrLog(`Force re-running OCR on page ${pageNumber} (queued — worker not ready)`)
      }
      return null
    }

    if (isRunningRef.current) {
      // Queue the latest request, drop older ones
      pendingRef.current = { canvas, pageNumber, zoom, forceRun }
      return null
    }

    isRunningRef.current = true
    setOcrLoading(true)
    setOcrProgress(0)

    if (forceRun) {
      addOcrLog(`Force re-running OCR on page ${pageNumber}`)
    } else {
      addOcrLog(`Starting OCR on page ${pageNumber}…`)
    }

    try {
      // Downsample for OCR: target ~150 DPI equivalent
      // If the canvas is very large, scale it down
      const MAX_OCR_DIM = 2400
      let imageSource = canvas

      if (canvas.width > MAX_OCR_DIM || canvas.height > MAX_OCR_DIM) {
        const ratio = Math.min(MAX_OCR_DIM / canvas.width, MAX_OCR_DIM / canvas.height)
        const offscreen = document.createElement('canvas')
        offscreen.width = Math.floor(canvas.width * ratio)
        offscreen.height = Math.floor(canvas.height * ratio)
        const ctx = offscreen.getContext('2d')
        // Convert to grayscale for better OCR accuracy
        ctx.filter = 'grayscale(1) contrast(1.2)'
        ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height)
        imageSource = offscreen
      }

      const { data: { text } } = await workerRef.current.recognize(imageSource)
      const trimmed = text.trim()

      // When force-running, remove old cache entry first (setOcrResult overwrites anyway,
      // but being explicit makes the intent clear)
      setOcrResult(cacheKey, trimmed)

      if (trimmed.length > 0) {
        addOcrLog(`OCR complete on page ${pageNumber} — ${trimmed.length} chars found`)
      } else {
        addOcrLog(`No text found on page ${pageNumber}`)
      }

      return trimmed
    } catch (err) {
      console.error('OCR error:', err)
      addOcrLog(`Error during OCR on page ${pageNumber}: ${err.message}`)
      return null
    } finally {
      isRunningRef.current = false
      setOcrLoading(false)
      setOcrProgress(0)

      // Process any queued request
      if (pendingRef.current) {
        const { canvas: c, pageNumber: pn, zoom: z, forceRun: fr } = pendingRef.current
        pendingRef.current = null
        runOcr(c, pn, z, fr)
      }
    }
  }, [ocrLanguage, ocrCache, setOcrResult, setOcrLoading, setOcrProgress, addOcrLog])

  return { runOcr }
}
