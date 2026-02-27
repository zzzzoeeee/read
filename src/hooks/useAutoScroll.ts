import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../state/useStore'

/**
 * Auto-scroll hook using requestAnimationFrame.
 * @param scrollContainerRef - ref to the scrollable container
 */
export function useAutoScroll(scrollContainerRef: React.RefObject<HTMLDivElement | null>): void {
  const isScrolling = useStore((s) => s.isScrolling)
  const scrollSpeed = useStore((s) => s.scrollSpeed)
  const scrollDirection = useStore((s) => s.scrollDirection)
  const setIsScrolling = useStore((s) => s.setIsScrolling)

  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const isScrollingRef = useRef(isScrolling)
  const speedRef = useRef(scrollSpeed)
  const directionRef = useRef(scrollDirection)

  // Keep refs in sync with state (avoid stale closures in rAF loop)
  useEffect(() => { isScrollingRef.current = isScrolling }, [isScrolling])
  useEffect(() => { speedRef.current = scrollSpeed }, [scrollSpeed])
  useEffect(() => { directionRef.current = scrollDirection }, [scrollDirection])

  const step = useCallback((timestamp: number) => {
    if (!isScrollingRef.current) {
      lastTimeRef.current = null
      return
    }

    const container = scrollContainerRef.current
    if (!container) {
      rafRef.current = requestAnimationFrame(step)
      return
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = timestamp
    }

    const delta = (timestamp - lastTimeRef.current) / 1000 // seconds
    lastTimeRef.current = timestamp

    const pixels = speedRef.current * delta
    const dir = directionRef.current === 'up' ? -1 : 1

    const prevScrollTop = container.scrollTop
    container.scrollTop += dir * pixels

    // Stop at top or bottom
    if (container.scrollTop === prevScrollTop) {
      // Hit a boundary — stop scrolling
      setIsScrolling(false)
      lastTimeRef.current = null
      return
    }

    rafRef.current = requestAnimationFrame(step)
  }, [scrollContainerRef, setIsScrolling])

  useEffect(() => {
    if (isScrolling) {
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(step)
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimeRef.current = null
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isScrolling, step])

  // Pause when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isScrollingRef.current) {
        setIsScrolling(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [setIsScrolling])

  // Pause on window blur
  useEffect(() => {
    const handleBlur = () => {
      if (isScrollingRef.current) {
        setIsScrolling(false)
      }
    }
    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [setIsScrolling])
}
