import { useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useStore } from '../state/useStore'

// Set worker source using import.meta.url for Vite compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export function usePdfDocument() {
  const pdfUrl = useStore((s) => s.pdfUrl)
  const setPdfDoc = useStore((s) => s.setPdfDoc)
  const setPdfLoading = useStore((s) => s.setPdfLoading)
  const setPdfError = useStore((s) => s.setPdfError)
  const clearOcrCache = useStore((s) => s.clearOcrCache)
  const currentDocRef = useRef(null)

  useEffect(() => {
    if (!pdfUrl) {
      setPdfDoc(null)
      return
    }

    let cancelled = false

    const loadPdf = async () => {
      setPdfLoading(true)
      setPdfError(null)
      clearOcrCache()

      // Destroy previous document
      if (currentDocRef.current) {
        try {
          await currentDocRef.current.destroy()
        } catch (_) {}
        currentDocRef.current = null
      }

      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          // Enable range requests for large PDFs
          rangeChunkSize: 65536,
          // Disable streaming for local blob URLs
          disableStream: false,
          disableAutoFetch: false,
        })

        // Password handler
        loadingTask.onPassword = (updatePassword, reason) => {
          const password = window.prompt(
            reason === 1
              ? 'This PDF is password-protected. Enter password:'
              : 'Incorrect password. Try again:',
          )
          if (password !== null) {
            updatePassword(password)
          } else {
            loadingTask.destroy()
            setPdfError('Password entry cancelled.')
            setPdfLoading(false)
          }
        }

        const doc = await loadingTask.promise
        if (cancelled) {
          doc.destroy()
          return
        }
        currentDocRef.current = doc
        setPdfDoc(doc)
      } catch (err) {
        if (cancelled) return
        console.error('PDF load error:', err)
        if (err.name === 'PasswordException') {
          setPdfError('This PDF is password-protected and could not be opened.')
        } else if (err.name === 'InvalidPDFException') {
          setPdfError('This file is not a valid PDF or is corrupted.')
        } else if (err.name === 'MissingPDFException') {
          setPdfError('The PDF file could not be found.')
        } else {
          setPdfError(`Failed to load PDF: ${err.message}`)
        }
      } finally {
        if (!cancelled) setPdfLoading(false)
      }
    }

    loadPdf()

    return () => {
      cancelled = true
    }
  }, [pdfUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentDocRef.current) {
        currentDocRef.current.destroy().catch(() => {})
      }
    }
  }, [])
}
