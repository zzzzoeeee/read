import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '../state/useStore'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { useOcr } from '../hooks/useOcr'
import * as pdfjsLib from 'pdfjs-dist'

// DPR-aware canvas rendering helper
async function renderPageToCanvas(pdfDoc, pageNumber, scale, canvas) {
  if (!pdfDoc || !canvas || pageNumber < 1) return null
  try {
    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const task = page.render({ canvasContext: ctx, viewport })
    await task.promise
    return canvas
  } catch (err) {
    if (err?.name === 'RenderingCancelledException') return null
    throw err
  }
}

// Single page component
function PdfPage({ pdfDoc, pageNumber, scale, onPageVisible, onCanvasReady }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const observerRef = useRef(null)
  const lastRenderRef = useRef({ pageNumber: 0, scale: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!pdfDoc || !canvas) return
    if (lastRenderRef.current.pageNumber === pageNumber && lastRenderRef.current.scale === scale) return

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch (_) {}
      renderTaskRef.current = null
    }

    let cancelled = false

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (cancelled) return
        const viewport = page.getViewport({ scale })
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        const task = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        if (cancelled) return
        lastRenderRef.current = { pageNumber, scale }
        onCanvasReady?.(canvas, pageNumber)
      } catch (err) {
        if (err?.name === 'RenderingCancelledException') return
        console.error(`Page ${pageNumber} render error:`, err)
      }
    }

    render()
    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch (_) {}
      }
    }
  }, [pdfDoc, pageNumber, scale, onCanvasReady])

  // Intersection observer to track visible page
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            onPageVisible?.(pageNumber)
          }
        })
      },
      { threshold: [0.3, 0.6] }
    )
    observer.observe(canvas)
    observerRef.current = observer
    return () => observer.disconnect()
  }, [pageNumber, onPageVisible])

  return (
    <div
      id={`page-${pageNumber}`}
      className="flex justify-center mb-4 last:mb-0"
      data-page={pageNumber}
    >
      <div className="shadow-lg rounded overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          aria-label={`PDF page ${pageNumber}`}
          role="img"
          className="block max-w-full"
        />
      </div>
    </div>
  )
}

export function PdfViewer({ scrollContainerRef, onCanvasReady }) {
  const pdfDoc = useStore((s) => s.pdfDoc)
  const totalPages = useStore((s) => s.totalPages)
  const currentPage = useStore((s) => s.currentPage)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const zoom = useStore((s) => s.zoom)
  const setZoom = useStore((s) => s.setZoom)
  const snapToPage = useStore((s) => s.snapToPage)
  const pdfLoading = useStore((s) => s.pdfLoading)
  const pdfError = useStore((s) => s.pdfError)

  // Auto-scroll
  useAutoScroll(scrollContainerRef)

  // Track pinch-zoom for touch
  const lastTouchDistRef = useRef(null)

  // Fit width on demand
  useEffect(() => {
    const handler = () => {
      const container = scrollContainerRef.current
      if (!container || !pdfDoc) return
      pdfDoc.getPage(1).then((page) => {
        const viewport = page.getViewport({ scale: 1 })
        const containerWidth = container.clientWidth - 48 // padding
        const fitScale = containerWidth / viewport.width
        setZoom(Math.round(fitScale * 100) / 100)
      }).catch(() => {})
    }
    window.addEventListener('pdf-fit-width', handler)
    return () => window.removeEventListener('pdf-fit-width', handler)
  }, [pdfDoc, scrollContainerRef, setZoom])

  const handlePageVisible = useCallback((pageNum) => {
    setCurrentPage(pageNum)
  }, [setCurrentPage])

  // Snap-to-page: scroll to page when currentPage changes externally
  useEffect(() => {
    if (!snapToPage) return
    const el = document.getElementById(`page-${currentPage}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentPage, snapToPage])

  // Touch pinch zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / lastTouchDistRef.current
      lastTouchDistRef.current = dist
      setZoom(zoom * ratio)
    }
  }

  const handleTouchEnd = () => {
    lastTouchDistRef.current = null
  }

  // Wheel zoom (Ctrl+wheel)
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(zoom + delta)
    }
  }, [zoom, setZoom])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel, scrollContainerRef])

  if (pdfError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="rounded-full p-4 bg-red-100 dark:bg-red-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 font-medium">{pdfError}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Please try opening a different PDF file.</p>
      </div>
    )
  }

  if (pdfLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading PDF…</p>
      </div>
    )
  }

  if (!pdfDoc) return null

  // Render pages: for large PDFs we render a window of pages around current page
  // plus pre-render ±2 pages
  const RENDER_WINDOW = 3 // pages on each side
  const pagesToRender = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => Math.abs(p - currentPage) <= RENDER_WINDOW
  )

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-auto bg-gray-200 dark:bg-gray-700 scrollbar-thin"
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="PDF viewer"
      role="region"
      tabIndex={0}
    >
      <div className="py-4 px-4 min-h-full">
        {/* Spacer for pages before render window */}
        {pagesToRender[0] > 1 && (
          <div
            style={{ height: `${(pagesToRender[0] - 1) * 800}px` }}
            aria-hidden="true"
          />
        )}

        {pagesToRender.map((pageNum) => (
          <PdfPage
            key={pageNum}
            pdfDoc={pdfDoc}
            pageNumber={pageNum}
            scale={zoom}
            onPageVisible={handlePageVisible}
            onCanvasReady={onCanvasReady}
          />
        ))}

        {/* Spacer for pages after render window */}
        {pagesToRender[pagesToRender.length - 1] < totalPages && (
          <div
            style={{ height: `${(totalPages - pagesToRender[pagesToRender.length - 1]) * 800}px` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
