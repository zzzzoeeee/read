import { useRef, useState } from 'react'
import { useStore } from '../state/useStore'

export function Toolbar({ onOpenFile }) {
  const darkMode = useStore((s) => s.darkMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const currentPage = useStore((s) => s.currentPage)
  const totalPages = useStore((s) => s.totalPages)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const zoom = useStore((s) => s.zoom)
  const setZoom = useStore((s) => s.setZoom)
  const showOcrPanel = useStore((s) => s.showOcrPanel)
  const toggleOcrPanel = useStore((s) => s.toggleOcrPanel)
  const showThumbnails = useStore((s) => s.showThumbnails)
  const toggleThumbnails = useStore((s) => s.toggleThumbnails)
  const pdfDoc = useStore((s) => s.pdfDoc)

  const [pageInput, setPageInput] = useState('')
  const fileInputRef = useRef(null)

  const handlePageSubmit = (e) => {
    e.preventDefault()
    const num = parseInt(pageInput, 10)
    if (!isNaN(num)) setCurrentPage(num)
    setPageInput('')
  }

  const zoomOptions = [
    { label: 'Fit Width', value: 'fit-width' },
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2.0 },
  ]

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-wrap">
      {/* Open file button */}
      <button
        onClick={onOpenFile}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open PDF file"
        title="Open PDF (Ctrl+O)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
        Open PDF
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Page navigation */}
      {pdfDoc && (
        <>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous page"
            title="Previous page (←)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput || currentPage}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput('')}
              className="w-12 text-center text-sm border border-gray-300 dark:border-gray-600 rounded-md py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Current page number"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">/ {totalPages}</span>
          </form>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next page"
            title="Next page (→)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

          {/* Zoom */}
          <button
            onClick={() => setZoom(zoom - 0.1)}
            disabled={zoom <= 0.25}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
            </svg>
          </button>

          <select
            value={zoom}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'fit-width') {
                // handled by PdfViewer
                window.dispatchEvent(new CustomEvent('pdf-fit-width'))
              } else {
                setZoom(parseFloat(v))
              }
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md py-1 px-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Zoom level"
          >
            {zoomOptions.map((o) => (
              <option key={o.label} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={() => setZoom(zoom + 0.1)}
            disabled={zoom >= 5}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

          {/* Thumbnails toggle */}
          <button
            onClick={toggleThumbnails}
            className={`p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${showThumbnails ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            aria-label="Toggle thumbnails"
            aria-pressed={showThumbnails}
            title="Toggle thumbnails"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>

          {/* OCR panel toggle */}
          <button
            onClick={toggleOcrPanel}
            className={`p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${showOcrPanel ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            aria-label="Toggle OCR panel"
            aria-pressed={showOcrPanel}
            title="Toggle OCR panel (T)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title="Toggle dark mode (D)"
      >
        {darkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </button>
    </header>
  )
}
