import { useEffect, useRef, useCallback } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface RenderCompletePayload {
  canvas: HTMLCanvasElement
  pageNumber: number
  scale: number
}

interface UsePdfPageRendererOptions {
  pdfDoc: PDFDocumentProxy | null
  pageNumber: number
  scale: number
  canvas: HTMLCanvasElement | null
  onRenderComplete?: (payload: RenderCompletePayload) => void
}

/**
 * Renders a PDF page to a canvas element.
 */
export function usePdfPageRenderer({
  pdfDoc,
  pageNumber,
  scale,
  canvas,
  onRenderComplete,
}: UsePdfPageRendererOptions): void {
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const lastRenderRef = useRef({ pageNumber: 0, scale: 0 })

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvas || pageNumber < 1) return

    // Avoid re-rendering same page at same scale
    if (
      lastRenderRef.current.pageNumber === pageNumber &&
      lastRenderRef.current.scale === scale
    ) return

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch (_) { /* ignore */ }
      renderTaskRef.current = null
    }

    try {
      const page = await pdfDoc.getPage(pageNumber)
      const viewport = page.getViewport({ scale })

      // Set device pixel ratio for crisp rendering
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      const renderContext = {
        canvasContext: ctx,
        viewport,
      }

      const renderTask = page.render(renderContext)
      renderTaskRef.current = renderTask

      await renderTask.promise
      lastRenderRef.current = { pageNumber, scale }
      onRenderComplete?.({ canvas, pageNumber, scale })
    } catch (err) {
      const e = err as { name?: string }
      if (e?.name === 'RenderingCancelledException') return
      console.error('Page render error:', err)
    }
  }, [pdfDoc, pageNumber, scale, canvas, onRenderComplete])

  useEffect(() => {
    void renderPage()
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch (_) { /* ignore */ }
      }
    }
  }, [renderPage])
}
