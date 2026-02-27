import { useRef, useCallback, useEffect } from 'react'
import { createWorker } from 'tesseract.js'
import type { Worker as TesseractWorker } from 'tesseract.js'
import { useStore } from '../state/useStore'

const LANGUAGE_LABELS: Record<string, string> = {
  eng: 'English', fra: 'French', deu: 'German', spa: 'Spanish',
  ita: 'Italian', por: 'Portuguese', rus: 'Russian', chi_sim: 'Chinese (Simplified)',
  chi_tra: 'Chinese (Traditional)', jpn: 'Japanese', kor: 'Korean',
  ara: 'Arabic', hin: 'Hindi', nld: 'Dutch', pol: 'Polish',
}

/**
 * Convert a canvas element to a PNG Blob via toDataURL.
 * This avoids the toBlob/FileReader async pipeline which can fail
 * silently in certain browser environments.
 */
function canvasToPngBlob(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return new Blob([bytes], { type: 'image/png' })
}

interface PendingOcrRequest {
  canvas: HTMLCanvasElement
  pageNumber: number
  zoom: number
  forceRun: boolean
}

interface InitStatusEntry {
  label: string
  progress: number
}

/**
 * OCR hook using a single Tesseract.js worker.
 * Caches results per (pageNumber, zoom, language) key.
 */
export function useOcr(): { runOcr: (canvas: HTMLCanvasElement, pageNumber: number, zoom: number, forceRun?: boolean) => Promise<string | null> } {
  const ocrLanguage = useStore((s) => s.ocrLanguage)
  const ocrCache = useStore((s) => s.ocrCache)
  const setOcrResult = useStore((s) => s.setOcrResult)
  const setOcrLoading = useStore((s) => s.setOcrLoading)
  const setOcrProgress = useStore((s) => s.setOcrProgress)
  const addOcrLog = useStore((s) => s.addOcrLog)
  const setWorkerReady = useStore((s) => s.setWorkerReady)
  const setWorkerInitProgress = useStore((s) => s.setWorkerInitProgress)

  const workerRef = useRef<TesseractWorker | null>(null)
  const workerReadyRef = useRef(false)
  const currentLangRef = useRef<string | null>(null)
  const pendingRef = useRef<PendingOcrRequest | null>(null)
  const isRunningRef = useRef(false)
  // Keep a stable ref to runOcr so initWorker's setTimeout can call the latest version
  const runOcrRef = useRef<((canvas: HTMLCanvasElement, pageNumber: number, zoom: number, forceRun?: boolean) => Promise<string | null>) | null>(null)

  // Map Tesseract init status strings to human-readable labels and 0-100 progress
  const INIT_STATUS_MAP: Record<string, InitStatusEntry> = {
    'loading tesseract core': { label: 'Loading engine…', progress: 10 },
    'initializing tesseract': { label: 'Initializing engine…', progress: 30 },
    'initialized tesseract': { label: 'Engine ready', progress: 50 },
    'loading language traineddata': { label: 'Loading language data…', progress: 60 },
    'loaded language traineddata': { label: 'Language data loaded', progress: 80 },
    'initializing api': { label: 'Starting OCR engine…', progress: 90 },
    'initialized api': { label: 'OCR engine ready', progress: 100 },
  }

  // Initialize / reinitialize worker when language changes
  const initWorker = useCallback(async (lang: string) => {
    if (workerRef.current) {
      try { await workerRef.current.terminate() } catch (_) { /* ignore */ }
      workerRef.current = null
      workerReadyRef.current = false
    }

    setWorkerReady(false)
    setWorkerInitProgress(0, 'Starting…')

    const langLabel = LANGUAGE_LABELS[lang] || lang
    addOcrLog(`Worker initializing for language: ${langLabel}…`)

    try {
      const worker = await createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
          } else {
            // Report initialization progress
            const statusKey = m.status?.toLowerCase() ?? ''
            const mapped = Object.entries(INIT_STATUS_MAP).find(([k]) => statusKey.includes(k))
            if (mapped) {
              const [, { label, progress: baseProgress }] = mapped
              // Sub-progress within a phase is available via m.progress (0-1)
              const subProgress = typeof m.progress === 'number' ? m.progress : 1
              const next = Math.round(baseProgress * subProgress)
              // Use the base progress when sub-progress hits 1, otherwise interpolate
              setWorkerInitProgress(Math.min(99, Math.max(next, 0)), label)
            }
          }
        },
        // Serve worker and WASM from public/ so they are accessible as static assets.
        // corePath must be a directory URL (not a .wasm file path): the worker appends
        // the correct tesseract-core-*.wasm.js variant name after CPU feature detection.
        workerPath: `${import.meta.env.BASE_URL}tesseract-worker.min.js`,
        corePath: import.meta.env.BASE_URL.replace(/\/$/, ''),
        // Use the default jsDelivr CDN (compatible with tesseract.js-core v7)
        // instead of the older projectnaptha CDN which may serve incompatible data.
        // langPath is intentionally omitted to use the Tesseract.js v7 default.
        workerBlobURL: false,
      })
      workerRef.current = worker
      workerReadyRef.current = true
      currentLangRef.current = lang
      setOcrProgress(0)
      setWorkerInitProgress(100, 'Ready')
      setWorkerReady(true)
      addOcrLog('Worker ready')

      // Process any request that was queued while worker was initializing.
      // Use runOcrRef to access the latest runOcr closure (avoids stale closure bug).
      if (pendingRef.current) {
        const { canvas: c, pageNumber: pn, zoom: z, forceRun: fr } = pendingRef.current
        pendingRef.current = null
        setTimeout(() => runOcrRef.current?.(c, pn, z, fr), 0)
      }
    } catch (err) {
      console.error('Tesseract worker init failed:', err)
      workerReadyRef.current = false
      setWorkerReady(false)
      setWorkerInitProgress(0, 'Failed')
      // err may be a string, ErrorEvent.message, or an Error object
      const errMsg = (err instanceof Error ? err.message : String(err ?? 'unknown error'))
      addOcrLog(`Worker init failed: ${errMsg}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOcrProgress, addOcrLog, setWorkerReady, setWorkerInitProgress])

  useEffect(() => {
    void initWorker(ocrLanguage)
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => { /* ignore */ })
      }
    }
  }, [ocrLanguage, initWorker])

  /**
   * Run OCR on a canvas element.
   * @param canvas - source canvas (full page render)
   * @param pageNumber
   * @param zoom
   * @param forceRun - skip cache and re-run even if result is cached
   */
  const runOcr = useCallback(async (canvas: HTMLCanvasElement, pageNumber: number, zoom: number, forceRun = false): Promise<string | null> => {
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
      // Downsample for OCR if canvas is very large
      const MAX_OCR_DIM = 2400
      let sourceCanvas: HTMLCanvasElement = canvas

      if (canvas.width > MAX_OCR_DIM || canvas.height > MAX_OCR_DIM) {
        const ratio = Math.min(MAX_OCR_DIM / canvas.width, MAX_OCR_DIM / canvas.height)
        const offscreen = document.createElement('canvas')
        offscreen.width = Math.floor(canvas.width * ratio)
        offscreen.height = Math.floor(canvas.height * ratio)
        const ctx = offscreen.getContext('2d')
        if (ctx) {
          // Convert to grayscale for better OCR accuracy
          ctx.filter = 'grayscale(1) contrast(1.2)'
          ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height)
          sourceCanvas = offscreen
        }
      }

      // Convert canvas to PNG Blob using toDataURL for reliable cross-browser support.
      // Passing the canvas element directly to Tesseract.js triggers toBlob/FileReader
      // which can fail silently in some environments (null blob, async issues).
      const imageBlob = canvasToPngBlob(sourceCanvas)

      const result = await workerRef.current.recognize(imageBlob)
      const text = result?.data?.text ?? ''
      const trimmed = text.trim()

      setOcrResult(cacheKey, trimmed)

      if (trimmed.length > 0) {
        addOcrLog(`OCR complete on page ${pageNumber} — ${trimmed.length} chars found`)
      } else {
        addOcrLog(`No text found on page ${pageNumber}`)
      }

      return trimmed
    } catch (err) {
      console.error('OCR error:', err)
      let errMsg: string
      if (err instanceof Error) {
        errMsg = err.message || err.toString()
      } else if (typeof err === 'string') {
        errMsg = err || 'unknown error'
      } else {
        errMsg = String(err ?? 'unknown error')
      }
      addOcrLog(`Error during OCR on page ${pageNumber}: ${errMsg}`)
      return null
    } finally {
      isRunningRef.current = false
      setOcrLoading(false)
      setOcrProgress(0)

      // Process any queued request
      if (pendingRef.current) {
        const { canvas: c, pageNumber: pn, zoom: z, forceRun: fr } = pendingRef.current
        pendingRef.current = null
        void runOcr(c, pn, z, fr)
      }
    }
  }, [ocrLanguage, ocrCache, setOcrResult, setOcrLoading, setOcrProgress, addOcrLog])

  // Keep runOcrRef in sync with the latest runOcr closure
  useEffect(() => {
    runOcrRef.current = runOcr
  }, [runOcr])

  return { runOcr }
}
