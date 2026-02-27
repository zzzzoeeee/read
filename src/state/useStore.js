import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Persisted slice: settings that survive page reload
const persistedSlice = (set) => ({
  // Appearance
  darkMode: false,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  // Auto-scroll
  scrollSpeed: 50, // px/s
  scrollDirection: 'down', // 'up' | 'down'
  setScrollSpeed: (speed) => set({ scrollSpeed: Math.max(5, Math.min(500, speed)) }),
  setScrollDirection: (dir) => set({ scrollDirection: dir }),

  // OCR
  ocrLanguage: 'eng',
  setOcrLanguage: (lang) => set({ ocrLanguage: lang }),

  // OCR panel text size
  ocrFontSize: 14, // px
  setOcrFontSize: (size) => set({ ocrFontSize: Math.max(10, Math.min(32, size)) }),
})

// Session-only slice: runtime state
const sessionSlice = (set) => ({
  // PDF document
  pdfFile: null,           // File object
  pdfUrl: null,            // object URL
  pdfDoc: null,            // PDFDocumentProxy
  totalPages: 0,
  currentPage: 1,
  setPdfFile: (file) => set({ pdfFile: file }),
  setPdfUrl: (url) => set({ pdfUrl: url }),
  setPdfDoc: (doc) => set({ pdfDoc: doc, totalPages: doc ? doc.numPages : 0, currentPage: 1 }),
  setCurrentPage: (page) =>
    set((s) => ({ currentPage: Math.max(1, Math.min(page, s.totalPages)) })),

  // Zoom
  zoom: 1.0,
  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(5, z)) }),

  // Scroll mode
  snapToPage: false,
  setSnapToPage: (v) => set({ snapToPage: v }),

  // Auto-scroll active
  isScrolling: false,
  setIsScrolling: (v) => set({ isScrolling: v }),
  toggleScrolling: () => set((s) => ({ isScrolling: !s.isScrolling })),

  // PDF loading state
  pdfLoading: false,
  pdfError: null,
  setPdfLoading: (v) => set({ pdfLoading: v }),
  setPdfError: (e) => set({ pdfError: e }),

  // OCR state
  ocrCache: {},             // { [pageKey]: string }
  ocrLoading: false,
  ocrProgress: 0,
  setOcrResult: (key, text) =>
    set((s) => ({ ocrCache: { ...s.ocrCache, [key]: text } })),
  setOcrLoading: (v) => set({ ocrLoading: v }),
  setOcrProgress: (p) => set({ ocrProgress: p }),
  clearOcrCache: () => set({ ocrCache: {} }),

  // OCR worker initialization state
  workerReady: false,
  workerInitProgress: 0,   // 0–100, progress of worker init (loading model/data)
  workerInitStatus: '',    // human-readable status label
  setWorkerReady: (v) => set({ workerReady: v }),
  setWorkerInitProgress: (p, status) => set({ workerInitProgress: p, workerInitStatus: status ?? '' }),

  // OCR process log
  ocrLog: [],   // array of string messages with timestamps (newest first)
  addOcrLog: (message) => set((s) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
    const entry = `[${timestamp}] ${message}`
    const updated = [entry, ...s.ocrLog]
    return { ocrLog: updated.slice(0, 50) }
  }),
  clearOcrLog: () => set({ ocrLog: [] }),

  // UI panels
  showOcrPanel: true,
  toggleOcrPanel: () => set((s) => ({ showOcrPanel: !s.showOcrPanel })),
  showThumbnails: false,
  toggleThumbnails: () => set((s) => ({ showThumbnails: !s.showThumbnails })),
})

// Combined store with persistence for settings
export const useStore = create(
  persist(
    (set, get) => ({
      ...persistedSlice(set),
      ...sessionSlice(set),
    }),
    {
      name: 'pdf-ocr-reader-settings',
      partialize: (state) => ({
        darkMode: state.darkMode,
        scrollSpeed: state.scrollSpeed,
        scrollDirection: state.scrollDirection,
        ocrLanguage: state.ocrLanguage,
        ocrFontSize: state.ocrFontSize,
      }),
    },
  ),
)
