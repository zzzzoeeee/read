import { useCallback, useRef, useState } from 'react'
import { useStore } from '../state/useStore'

export function PdfLoader() {
  const setPdfFile = useStore((s) => s.setPdfFile)
  const setPdfUrl = useStore((s) => s.setPdfUrl)
  const pdfUrl = useStore((s) => s.pdfUrl)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please select a PDF file.')
      return
    }
    // Revoke previous object URL
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    const url = URL.createObjectURL(file)
    setPdfFile(file)
    setPdfUrl(url)
  }, [pdfUrl, setPdfFile, setPdfUrl])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = '' // allow re-selecting same file
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      {/* Privacy badge */}
      <div className="mb-6 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-4 py-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 013 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        100% on-device processing — your PDF never leaves your browser
      </div>

      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">PDF OCR Reader</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
        Open a local PDF file to read it with auto-scroll and on-device OCR text extraction.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Open PDF file"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
        className={`
          relative w-full max-w-lg rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-gray-700/50'
          }
        `}
      >
        <div className={`rounded-full p-4 transition-colors ${isDragging ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            {isDragging ? 'Drop your PDF here' : 'Click or drag & drop a PDF'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Supports any PDF file — scanned or text-based
          </p>
        </div>

        <button
          type="button"
          className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
        >
          Browse Files
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-hidden="true"
        onChange={handleInputChange}
      />

      {/* Feature list */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: '📖', title: 'Auto-Scroll', desc: 'Hands-free reading at your preferred speed' },
          { icon: '🔍', title: 'On-Device OCR', desc: 'Extract text from scanned pages — no server' },
          { icon: '🌙', title: 'Dark Mode', desc: 'Easy on the eyes in any lighting' },
        ].map((f) => (
          <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{f.title}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
