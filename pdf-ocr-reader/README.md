# PDF OCR Reader

A browser-based PDF reader with on-device OCR, built with React + Vite + Tailwind CSS.  
**Zero uploads. All processing happens locally in your browser.**

---

## Features

| Feature | Details |
|---|---|
| 📄 PDF Rendering | PDF.js (pdfjs-dist) renders to `<canvas>` with DPR-aware crisp output |
| 🔍 On-Device OCR | Tesseract.js (WebAssembly) — no server, no network calls for OCR |
| ⏩ Auto-Scroll | Smooth `requestAnimationFrame` loop; speed 5–500 px/s; direction up/down |
| 🌙 Dark Mode | Tailwind `class` strategy; persisted across sessions |
| 📐 Zoom | Ctrl+wheel, pinch-to-zoom (mobile), toolbar controls, fit-width |
| 🗂 Thumbnails | Lazy-rendered page thumbnails for navigation |
| 📋 Copy / Export | Copy OCR text to clipboard or export as `.txt` (per page or all pages) |
| 🗺 Page Navigation | Next/prev buttons, go-to-page input, keyboard arrows |
| 💾 PWA | Offline-capable via `vite-plugin-pwa` / Workbox service worker |
| ⌨️ Keyboard shortcuts | Space, ←→↑↓, +/-, D, T, Ctrl+O |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
git clone <repo-url>
cd pdf-ocr-reader
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

The `dist/` folder contains a fully static app you can host on any CDN or static host (Netlify, Vercel, GitHub Pages, etc.).

---

## Project Structure

```
pdf-ocr-reader/
├── public/                   # Static assets (icons, manifest)
├── src/
│   ├── components/
│   │   ├── PdfLoader.jsx     # File select / drag-and-drop landing page
│   │   ├── PdfViewer.jsx     # Canvas rendering, zoom, touch gestures
│   │   ├── ThumbnailPanel.jsx# Lazy-rendered page thumbnails
│   │   ├── AutoScrollControls.jsx  # Speed, direction, play/pause
│   │   ├── OcrPanel.jsx      # OCR text output, copy, export, language
│   │   └── Toolbar.jsx       # Top bar: open, navigation, zoom, toggles
│   ├── hooks/
│   │   ├── usePdfDocument.js # Load PDF.js document from object URL
│   │   ├── usePdfPageRenderer.js  # Render a page to canvas (used internally)
│   │   ├── useAutoScroll.js  # rAF auto-scroll with tab/blur pause
│   │   └── useOcr.js         # Tesseract.js worker, caching, downsampling
│   ├── state/
│   │   └── useStore.js       # Zustand store (settings persisted, runtime ephemeral)
│   ├── styles/
│   │   └── index.css         # Tailwind base + custom scrollbar utilities
│   ├── App.jsx               # Root layout, keyboard shortcuts, OCR trigger
│   └── main.jsx              # React root mount
├── index.html
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause auto-scroll |
| `←` / `↑` | Previous page |
| `→` / `↓` | Next page |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `D` | Toggle dark mode |
| `T` | Toggle OCR panel |
| `Ctrl + O` | Open PDF file |
| `[` | Decrease scroll speed by 10 px/s |
| `]` | Increase scroll speed by 10 px/s |

---

## OCR Languages

The default language is **English (`eng`)**. Change it in the OCR panel language dropdown. When you change the language, the OCR cache is cleared and the Tesseract worker is reloaded with the new language data.

Language data is downloaded on first use from:
```
https://tessdata.projectnaptha.com/4.0.0_best/
```

### Adding More Languages

1. Open `src/components/OcrPanel.jsx`
2. Add an entry to the `SUPPORTED_LANGUAGES` array:

```js
{ code: 'vie', label: 'Vietnamese' },
{ code: 'tur', label: 'Turkish' },
```

Tesseract.js will auto-download the required `.traineddata` file on first use.  
For a full list of supported language codes, see [tesseract-ocr/tessdata_best](https://github.com/tesseract-ocr/tessdata_best).

---

## Performance Tuning

### OCR Resolution

In `src/hooks/useOcr.js`, the `MAX_OCR_DIM` constant controls the maximum canvas dimension before downsampling:

```js
const MAX_OCR_DIM = 2400  // pixels (width or height)
```

- **Lower** (e.g., `1200`) → faster OCR, less accurate on small text
- **Higher** (e.g., `3600`) → slower OCR, better accuracy

### PDF Render Scale

The default zoom is `1.0`. For OCR purposes, a scale of `1.5`–`2.0` improves accuracy on scanned documents.

### Tesseract PSM (Page Segmentation Mode)

To customize the Tesseract page segmentation mode, edit `src/hooks/useOcr.js`:

```js
// After createWorker:
await worker.setParameters({
  tessedit_pageseg_mode: '6',  // Assume a single uniform block of text
  // tessedit_pageseg_mode: '1',  // Automatic with OSD
  // tessedit_pageseg_mode: '11', // Sparse text
})
```

Common PSM values:
- `3` — Fully automatic (default)
- `6` — Single uniform text block (good for clean scans)
- `11` — Sparse text (good for mixed layouts)
- `1` — Auto with orientation detection

### Pre-Rendering Window

In `src/components/PdfViewer.jsx`, the `RENDER_WINDOW` constant controls how many pages around the current page are rendered:

```js
const RENDER_WINDOW = 3  // render ±3 pages around current page
```

For memory-constrained devices, reduce to `1` or `2`.

---

## PWA / Offline Support

The app includes a service worker configured via `vite-plugin-pwa`. After the first load, the app shell and Tesseract WASM/scripts are cached for offline use.

To enable PWA icons, add the following files to `public/`:
- `pwa-192x192.png`
- `pwa-512x512.png`
- `apple-touch-icon.png`

---

## Privacy & Security

- **No uploads**: PDF files and OCR results never leave your device.
- **No analytics**: No tracking scripts included by default.
- **Local processing**: All PDF rendering (PDF.js) and OCR (Tesseract.js WebAssembly) run in the browser.
- **Object URLs**: PDFs are accessed via `URL.createObjectURL()` — they are never serialized or transmitted.

---

## Browser Support

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Firefox 88+ | ✅ Full support |
| Safari 15+ | ✅ Full support |
| Android Chrome | ✅ Full support |
| iOS Safari 15+ | ⚠️ Supported (large canvas may be limited on older devices) |

---

## Manual Test Checklist

- [ ] Open a text-based PDF → renders correctly
- [ ] Open a scanned PDF → OCR produces readable text
- [ ] Open a password-protected PDF → password prompt appears
- [ ] Open a corrupted file → error message displayed
- [ ] Auto-scroll starts/stops with Space bar
- [ ] Speed slider changes scroll speed with immediate effect
- [ ] OCR panel shows text for current page
- [ ] Language change clears cache and re-OCRs
- [ ] Copy to clipboard works
- [ ] Export .txt downloads correct file
- [ ] Dark mode persists after page reload
- [ ] Zoom with Ctrl+wheel works
- [ ] Pinch-to-zoom works on mobile
- [ ] Thumbnails navigate to correct pages
- [ ] Tab switching pauses auto-scroll
- [ ] App works offline after first load (PWA)

---

## License

MIT
