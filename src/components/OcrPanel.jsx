import { useState, useRef, useEffect } from 'react'
import { useStore } from '../state/useStore'

const SUPPORTED_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'rus', label: 'Russian' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'chi_tra', label: 'Chinese (Traditional)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'ara', label: 'Arabic' },
  { code: 'hin', label: 'Hindi' },
  { code: 'nld', label: 'Dutch' },
  { code: 'pol', label: 'Polish' },
]

export function OcrPanel({ onRunOcr }) {
  const currentPage = useStore((s) => s.currentPage)
  const zoom = useStore((s) => s.zoom)
  const ocrCache = useStore((s) => s.ocrCache)
  const ocrLoading = useStore((s) => s.ocrLoading)
  const ocrProgress = useStore((s) => s.ocrProgress)
  const ocrLanguage = useStore((s) => s.ocrLanguage)
  const setOcrLanguage = useStore((s) => s.setOcrLanguage)
  const ocrFontSize = useStore((s) => s.ocrFontSize)
  const setOcrFontSize = useStore((s) => s.setOcrFontSize)
  const clearOcrCache = useStore((s) => s.clearOcrCache)
  const ocrLog = useStore((s) => s.ocrLog)
  const clearOcrLog = useStore((s) => s.clearOcrLog)

  const [copyFeedback, setCopyFeedback] = useState(false)
  const [tab, setTab] = useState('current') // 'current' | 'all'
  const [showLog, setShowLog] = useState(false)

  const logTopRef = useRef(null)

  const cacheKey = `${currentPage}:${zoom.toFixed(2)}:${ocrLanguage}`
  // Distinguish "never processed" (undefined) from "processed but empty" ("")
  const currentText = ocrCache[cacheKey]
  const currentTextProcessed = currentText !== undefined // was OCR run for this key?
  const currentTextValue = currentText ?? ''             // safe string for display

  const allText = Object.entries(ocrCache)
    .filter(([k]) => k.endsWith(`:${ocrLanguage}`))
    .sort(([a], [b]) => {
      const pageA = parseInt(a.split(':')[0], 10)
      const pageB = parseInt(b.split(':')[0], 10)
      return pageA - pageB
    })
    .map(([k, v]) => {
      const page = k.split(':')[0]
      return `--- Page ${page} ---\n${v}`
    })
    .join('\n\n')

  const displayText = tab === 'current' ? currentTextValue : allText

  // Auto-scroll log to top (newest entry) when entries change
  useEffect(() => {
    if (showLog && logTopRef.current) {
      logTopRef.current.scrollTop = 0
    }
  }, [ocrLog, showLog])

  const copyToClipboard = async () => {
    if (!displayText) return
    try {
      await navigator.clipboard.writeText(displayText)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = displayText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  const exportText = () => {
    if (!displayText) return
    const blob = new Blob([displayText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = tab === 'current' ? `ocr-page-${currentPage}.txt` : 'ocr-all-pages.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Whether we should show the empty/no-text state for "current page" tab
  const showEmptyState = tab === 'current' && !displayText && !ocrLoading

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700" aria-label="OCR text panel">
      {/* Panel header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">OCR Text Extraction</h2>
          <div className="flex items-center gap-1">
            {/* Font size controls */}
            <button
              onClick={() => setOcrFontSize(ocrFontSize - 2)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Decrease font size"
              title="Decrease text size"
            >A-</button>
            <button
              onClick={() => setOcrFontSize(ocrFontSize + 2)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Increase font size"
              title="Increase text size"
            >A+</button>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="ocr-lang" className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Language:</label>
          <select
            id="ocr-lang"
            value={ocrLanguage}
            onChange={(e) => {
              setOcrLanguage(e.target.value)
              clearOcrCache()
            }}
            className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded py-1 px-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
          <button
            onClick={() => setTab('current')}
            className={`flex-1 py-1 font-medium transition-colors ${tab === 'current' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            aria-pressed={tab === 'current'}
          >
            Page {currentPage}
          </button>
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-1 font-medium transition-colors ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            aria-pressed={tab === 'all'}
          >
            All Pages
          </button>
        </div>
      </div>

      {/* OCR progress */}
      {ocrLoading && (
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Recognizing text…</span>
            <span>{ocrProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${ocrProgress}%` }}
              role="progressbar"
              aria-valuenow={ocrProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Text area */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {currentTextProcessed ? (
              // Was processed but returned empty string
              <>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  OCR found no readable text on this page.
                </p>
                <button
                  onClick={onRunOcr}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Re-run OCR
                </button>
              </>
            ) : (
              // Never been processed
              <>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No OCR text yet for this page.
                </p>
                <button
                  onClick={onRunOcr}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Run OCR Now
                </button>
              </>
            )}
          </div>
        ) : ocrLoading && !displayText ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-gray-400 dark:text-gray-500">Running OCR…</div>
          </div>
        ) : (
          <pre
            className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed"
            style={{ fontSize: `${ocrFontSize}px` }}
          >
            {displayText}
          </pre>
        )}
      </div>

      {/* Process Log */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        {/* Log header / toggle */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 select-none">
          <button
            onClick={() => setShowLog((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
            aria-expanded={showLog}
          >
            {/* Chevron */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3 h-3 transition-transform duration-150 ${showLog ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            Process Log ({ocrLog.length})
          </button>
          {ocrLog.length > 0 && (
            <button
              onClick={clearOcrLog}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors focus:outline-none"
              aria-label="Clear process log"
            >
              Clear
            </button>
          )}
        </div>

        {/* Log entries */}
        {showLog && (
          <div
            ref={logTopRef}
            className="max-h-40 overflow-y-auto bg-gray-900 dark:bg-gray-950 scrollbar-thin"
          >
            {ocrLog.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500 font-mono">No log entries yet.</p>
            ) : (
              <ul className="py-1">
                {ocrLog.map((entry, i) => (
                  <li
                    key={i}
                    className="px-3 py-0.5 text-xs font-mono text-gray-400 leading-relaxed hover:bg-gray-800 dark:hover:bg-gray-900 whitespace-pre-wrap break-all"
                  >
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {displayText && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={copyToClipboard}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              copyFeedback
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
            aria-label="Copy OCR text to clipboard"
          >
            {copyFeedback ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={exportText}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Export OCR text as .txt file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export .txt
          </button>
        </div>
      )}
    </aside>
  )
}
