import { useEffect, useRef, useCallback } from 'react'

/**
 * Renders a PDF page to a canvas element.
 * @param {object} options
 * @param {PDFDocumentProxy|null} options.pdfDoc
 * @param {number} options.pageNumber
 * @param {number} options.scale
 * @param {HTMLCanvasElement|null} options.canvas
 * @param {function} options.onRenderComplete - called with { canvas, pageNumber, scale }
 */
export function usePdfPageRenderer({ pdfDoc, pageNumber, scale, canvas, onRenderComplete }) {
  const renderTaskRef = useRef(null)
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
      try { renderTaskRef.current.cancel() } catch (_) {}
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
      if (err?.name === 'RenderingCancelledException') return
      console.error('Page render error:', err)
    }
  }, [pdfDoc, pageNumber, scale, canvas, onRenderComplete])

  useEffect(() => {
    renderPage()
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch (_) {}
      }
    }
  }, [renderPage])
}
