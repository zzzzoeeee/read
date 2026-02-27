import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// ─── State interfaces ─────────────────────────────────────────────────────────

export interface StoreState {
  // ── Persisted: Appearance ──────────────────────────────────────────────────
  darkMode: boolean
  toggleDarkMode: () => void

  // ── Persisted: Auto-scroll ─────────────────────────────────────────────────
  scrollSpeed: number // px/s
  scrollDirection: 'up' | 'down'
  setScrollSpeed: (speed: number) => void
  setScrollDirection: (dir: 'up' | 'down') => void

  // ── Persisted: OCR ────────────────────────────────────────────────────────
  ocrLanguage: string
  setOcrLanguage: (lang: string) => void

  // ── Persisted: OCR panel text size ────────────────────────────────────────
  ocrFontSize: number // px
  setOcrFontSize: (size: number) => void

  // ── Session: PDF document ─────────────────────────────────────────────────
  pdfFile: File | null
  pdfUrl: string | null
  pdfDoc: PDFDocumentProxy | null
  totalPages: number
  currentPage: number
  setPdfFile: (file: File | null) => void
  setPdfUrl: (url: string | null) => void
  setPdfDoc: (doc: PDFDocumentProxy | null) => void
  setCurrentPage: (page: number) => void

  // ── Session: Zoom ─────────────────────────────────────────────────────────
  zoom: number
  setZoom: (z: number) => void

  // ── Session: Scroll mode ──────────────────────────────────────────────────
  snapToPage: boolean
  setSnapToPage: (v: boolean) => void

  // ── Session: Auto-scroll active ───────────────────────────────────────────
  isScrolling: boolean
  setIsScrolling: (v: boolean) => void
  toggleScrolling: () => void

  // ── Session: PDF loading state ────────────────────────────────────────────
  pdfLoading: boolean
  pdfError: string | null
  setPdfLoading: (v: boolean) => void
  setPdfError: (e: string | null) => void

  // ── Session: OCR state ────────────────────────────────────────────────────
  ocrCache: Record<string, string>
  ocrLoading: boolean
  ocrProgress: number
  setOcrResult: (key: string, text: string) => void
  setOcrLoading: (v: boolean) => void
  setOcrProgress: (p: number) => void
  clearOcrCache: () => void

  // ── Session: OCR worker initialization state ──────────────────────────────
  workerReady: boolean
  workerInitProgress: number // 0–100
  workerInitStatus: string
  setWorkerReady: (v: boolean) => void
  setWorkerInitProgress: (p: number, status?: string) => void

  // ── Session: OCR process log ──────────────────────────────────────────────
  ocrLog: string[]
  addOcrLog: (message: string) => void
  clearOcrLog: () => void

  // ── Session: UI panels ────────────────────────────────────────────────────
  showOcrPanel: boolean
  toggleOcrPanel: () => void
  showThumbnails: boolean
  toggleThumbnails: () => void
}

// ─── Combined store ───────────────────────────────────────────────────────────

type PersistedPartial = Pick<StoreState,
  'darkMode' | 'scrollSpeed' | 'scrollDirection' | 'ocrLanguage' | 'ocrFontSize'
>

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // ── Persisted: Appearance ────────────────────────────────────────────
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      // ── Persisted: Auto-scroll ───────────────────────────────────────────
      scrollSpeed: 50,
      scrollDirection: 'down',
      setScrollSpeed: (speed) => set({ scrollSpeed: Math.max(5, Math.min(500, speed)) }),
      setScrollDirection: (dir) => set({ scrollDirection: dir }),

      // ── Persisted: OCR ──────────────────────────────────────────────────
      ocrLanguage: 'eng',
      setOcrLanguage: (lang) => set({ ocrLanguage: lang }),

      // ── Persisted: OCR panel text size ──────────────────────────────────
      ocrFontSize: 14,
      setOcrFontSize: (size) => set({ ocrFontSize: Math.max(10, Math.min(32, size)) }),

      // ── Session: PDF document ────────────────────────────────────────────
      pdfFile: null,
      pdfUrl: null,
      pdfDoc: null,
      totalPages: 0,
      currentPage: 1,
      setPdfFile: (file) => set({ pdfFile: file }),
      setPdfUrl: (url) => set({ pdfUrl: url }),
      setPdfDoc: (doc) => set({ pdfDoc: doc, totalPages: doc ? doc.numPages : 0, currentPage: 1 }),
      setCurrentPage: (page) =>
        set((s) => ({ currentPage: Math.max(1, Math.min(page, s.totalPages)) })),

      // ── Session: Zoom ────────────────────────────────────────────────────
      zoom: 1.0,
      setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(5, z)) }),

      // ── Session: Scroll mode ─────────────────────────────────────────────
      snapToPage: false,
      setSnapToPage: (v) => set({ snapToPage: v }),

      // ── Session: Auto-scroll active ──────────────────────────────────────
      isScrolling: false,
      setIsScrolling: (v) => set({ isScrolling: v }),
      toggleScrolling: () => set((s) => ({ isScrolling: !s.isScrolling })),

      // ── Session: PDF loading state ───────────────────────────────────────
      pdfLoading: false,
      pdfError: null,
      setPdfLoading: (v) => set({ pdfLoading: v }),
      setPdfError: (e) => set({ pdfError: e }),

      // ── Session: OCR state ───────────────────────────────────────────────
      ocrCache: {},
      ocrLoading: false,
      ocrProgress: 0,
      setOcrResult: (key, text) =>
        set((s) => ({ ocrCache: { ...s.ocrCache, [key]: text } })),
      setOcrLoading: (v) => set({ ocrLoading: v }),
      setOcrProgress: (p) => set({ ocrProgress: p }),
      clearOcrCache: () => set({ ocrCache: {} }),

      // ── Session: OCR worker initialization state ─────────────────────────
      workerReady: false,
      workerInitProgress: 0,
      workerInitStatus: '',
      setWorkerReady: (v) => set({ workerReady: v }),
      setWorkerInitProgress: (p, status) => set({ workerInitProgress: p, workerInitStatus: status ?? '' }),

      // ── Session: OCR process log ─────────────────────────────────────────
      ocrLog: [],
      addOcrLog: (message) => set((s) => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
        const entry = `[${timestamp}] ${message}`
        const updated = [entry, ...s.ocrLog]
        return { ocrLog: updated.slice(0, 50) }
      }),
      clearOcrLog: () => set({ ocrLog: [] }),

      // ── Session: UI panels ───────────────────────────────────────────────
      showOcrPanel: true,
      toggleOcrPanel: () => set((s) => ({ showOcrPanel: !s.showOcrPanel })),
      showThumbnails: false,
      toggleThumbnails: () => set((s) => ({ showThumbnails: !s.showThumbnails })),
    }),
    {
      name: 'pdf-ocr-reader-settings',
      partialize: (state): PersistedPartial => ({
        darkMode: state.darkMode,
        scrollSpeed: state.scrollSpeed,
        scrollDirection: state.scrollDirection,
        ocrLanguage: state.ocrLanguage,
        ocrFontSize: state.ocrFontSize,
      }),
    },
  ),
)
