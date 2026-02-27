import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useStore } from '../state/useStore'

interface ThumbnailProps {
  pdfDoc: PDFDocumentProxy
  pageNumber: number
  isActive: boolean
  onClick: () => void
}

function Thumbnail({ pdfDoc, pageNumber, isActive, onClick }: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdfDoc) return

    // Use IntersectionObserver to lazy-render thumbnails
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        if (rendered) return

        try {
          const page = await pdfDoc.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 0.2 })
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          await page.render({ canvasContext: ctx, viewport }).promise
          setRendered(true)
        } catch (err) {
          const e = err as { name?: string }
          if (e?.name !== 'RenderingCancelledException') {
            console.error(`Thumbnail ${pageNumber} error:`, err)
          }
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(canvas)
    observerRef.current = observer

    return () => observer.disconnect()
  }, [pdfDoc, pageNumber, rendered])

  return (
    <button
      onClick={onClick}
      className={`w-full p-1.5 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
      }`}
      aria-label={`Go to page ${pageNumber}`}
      aria-pressed={isActive}
      title={`Page ${pageNumber}`}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="bg-white shadow-sm rounded overflow-hidden w-full">
          <canvas
            ref={canvasRef}
            className="block w-full h-auto"
            aria-hidden="true"
          />
          {!rendered && (
            <div className="w-full h-16 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <span className={`text-xs ${isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
          {pageNumber}
        </span>
      </div>
    </button>
  )
}

export function ThumbnailPanel() {
  const pdfDoc = useStore((s) => s.pdfDoc)
  const totalPages = useStore((s) => s.totalPages)
  const currentPage = useStore((s) => s.currentPage)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const snapToPage = useStore((s) => s.snapToPage)

  if (!pdfDoc) return null

  const handlePageClick = (pageNum: number) => {
    setCurrentPage(pageNum)
    if (!snapToPage) {
      // Scroll to the page in the viewer
      const el = document.getElementById(`page-${pageNum}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <aside
      className="w-28 flex-shrink-0 overflow-y-auto bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-2 px-1.5 scrollbar-thin"
      aria-label="Page thumbnails"
    >
      <div className="flex flex-col gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <Thumbnail
            key={pageNum}
            pdfDoc={pdfDoc}
            pageNumber={pageNum}
            isActive={pageNum === currentPage}
            onClick={() => handlePageClick(pageNum)}
          />
        ))}
      </div>
    </aside>
  )
}
