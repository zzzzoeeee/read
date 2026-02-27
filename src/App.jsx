import { useEffect, useRef, useCallback } from 'react'
import { useStore } from './state/useStore'
import { usePdfDocument } from './hooks/usePdfDocument'
import { useOcr } from './hooks/useOcr'
import { PdfLoader } from './components/PdfLoader'
import { Toolbar } from './components/Toolbar'
import { AutoScrollControls } from './components/AutoScrollControls'
import { PdfViewer } from './components/PdfViewer'
import { OcrPanel } from './components/OcrPanel'
import { ThumbnailPanel } from './components/ThumbnailPanel'

export default function App() {
  const darkMode = useStore((s) => s.darkMode)
  const pdfDoc = useStore((s) => s.pdfDoc)
  const pdfLoading = useStore((s) => s.pdfLoading)
  const setPdfUrl = useStore((s) => s.setPdfUrl)
  const setPdfFile = useStore((s) => s.setPdfFile)
  const currentPage = useStore((s) => s.currentPage)
  const totalPages = useStore((s) => s.totalPages)
  const zoom = useStore((s) => s.zoom)
  const setZoom = useStore((s) => s.setZoom)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const toggleScrolling = useStore((s) => s.toggleScrolling)
  const setScrollSpeed = useStore((s) => s.setScrollSpeed)
  const scrollSpeed = useStore((s) => s.scrollSpeed)
  const showOcrPanel = useStore((s) => s.showOcrPanel)
  const toggleOcrPanel = useStore((s) => s.toggleOcrPanel)
  const showThumbnails = useStore((s) => s.showThumbnails)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const pdfUrl = useStore((s) => s.pdfUrl)

  const scrollContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const canvasMapRef = useRef({}) // pageNumber -> canvas element

  // Load PDF document when URL changes
  usePdfDocument()

  // OCR hook
  const { runOcr } = useOcr()

  const triggerOcrForPage = useCallback((pageNumber, canvas) => {
    const c = canvas || canvasMapRef.current[pageNumber]
    if (!c) return
    runOcr(c, pageNumber, zoom)
  }, [runOcr, zoom])

  // Track latest rendered canvas per page
  const handleCanvasReady = useCallback((canvas, pageNumber) => {
    canvasMapRef.current[pageNumber] = canvas
    triggerOcrForPage(pageNumber, canvas)
  }, [triggerOcrForPage])

  // When page changes, trigger OCR if canvas is available
  useEffect(() => {
    const canvas = canvasMapRef.current[currentPage]
    if (canvas) triggerOcrForPage(currentPage, canvas)
  }, [currentPage, triggerOcrForPage])

  // Dark mode: apply class to html element
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [darkMode])

  // File open handler
  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please select a PDF file.')
      return
    }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    const url = URL.createObjectURL(file)
    setPdfFile(file)
    setPdfUrl(url)
    e.target.value = ''
  }, [pdfUrl, setPdfFile, setPdfUrl])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't fire if focus is in an input/select/textarea
      const tag = document.activeElement?.tagName
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggleScrolling()
          break
        case 'ArrowRight':
        case 'ArrowDown':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setCurrentPage(currentPage + 1)
          }
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setCurrentPage(currentPage - 1)
          }
          break
        case '+':
        case '=':
          e.preventDefault()
          setZoom(zoom + 0.1)
          break
        case '-':
          e.preventDefault()
          setZoom(zoom - 0.1)
          break
        case 'd':
        case 'D':
          toggleDarkMode()
          break
        case 't':
        case 'T':
          toggleOcrPanel()
          break
        case 'o':
        case 'O':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleOpenFile()
          }
          break
        case '[':
          setScrollSpeed(scrollSpeed - 10)
          break
        case ']':
          setScrollSpeed(scrollSpeed + 10)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentPage, zoom, scrollSpeed, toggleScrolling, setCurrentPage, setZoom, setScrollSpeed, toggleDarkMode, toggleOcrPanel, handleOpenFile])

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      const url = useStore.getState().pdfUrl
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  // Show loader when no PDF is loaded (not during loading)
  if (!pdfDoc && !pdfLoading) {
    return <PdfLoader />
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {/* Top bar */}
      <Toolbar onOpenFile={handleOpenFile} />

      {/* Auto-scroll controls bar */}
      <AutoScrollControls />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Thumbnail sidebar */}
        {showThumbnails && <ThumbnailPanel />}

        {/* PDF Viewer */}
        <PdfViewer
          scrollContainerRef={scrollContainerRef}
          onCanvasReady={handleCanvasReady}
        />

        {/* OCR Panel */}
        {showOcrPanel && (
          <div className="w-80 flex-shrink-0 flex flex-col min-h-0 overflow-hidden">
            <OcrPanel onRunOcr={() => triggerOcrForPage(currentPage, null)} />
          </div>
        )}
      </div>

      {/* Status bar */}
      {pdfDoc && (
        <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <span>🔒 All processing is on-device — no uploads</span>
          <span>Page {currentPage} of {totalPages} · {Math.round(zoom * 100)}% zoom</span>
          <span className="hidden sm:block">
            Space: play/pause · ←→: page · +/-: zoom · D: dark · T: OCR panel
          </span>
        </div>
      )}
    </div>
  )
}
