import { useStore } from '../state/useStore'

export function AutoScrollControls() {
  const isScrolling = useStore((s) => s.isScrolling)
  const toggleScrolling = useStore((s) => s.toggleScrolling)
  const scrollSpeed = useStore((s) => s.scrollSpeed)
  const setScrollSpeed = useStore((s) => s.setScrollSpeed)
  const scrollDirection = useStore((s) => s.scrollDirection)
  const setScrollDirection = useStore((s) => s.setScrollDirection)
  const snapToPage = useStore((s) => s.snapToPage)
  const setSnapToPage = useStore((s) => s.setSnapToPage)
  const pdfDoc = useStore((s) => s.pdfDoc)

  if (!pdfDoc) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 flex-wrap text-sm">
      {/* Play/Pause */}
      <button
        onClick={toggleScrolling}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isScrolling
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
        aria-label={isScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
        title="Play/Pause auto-scroll (Space)"
      >
        {isScrolling ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
            Pause
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
            Auto-Scroll
          </>
        )}
      </button>

      {/* Direction toggle */}
      <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        {(['down', 'up'] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => setScrollDirection(dir)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none ${
              scrollDirection === dir
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            aria-label={`Scroll ${dir}`}
            aria-pressed={scrollDirection === dir}
          >
            {dir === 'down' ? '↓ Down' : '↑ Up'}
          </button>
        ))}
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
        <label htmlFor="scroll-speed" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Speed:
        </label>
        <input
          id="scroll-speed"
          type="range"
          min={5}
          max={500}
          step={5}
          value={scrollSpeed}
          onChange={(e) => setScrollSpeed(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
          aria-label="Auto-scroll speed"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
          {scrollSpeed} px/s
        </span>
      </div>

      {/* Speed presets */}
      <div className="flex gap-1">
        {[20, 60, 120, 200].map((speed) => (
          <button
            key={speed}
            onClick={() => setScrollSpeed(speed)}
            className={`px-1.5 py-0.5 text-xs rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              scrollSpeed === speed
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={`Set speed to ${speed} px/s`}
          >
            {speed === 20 ? 'Slow' : speed === 60 ? 'Normal' : speed === 120 ? 'Fast' : 'Turbo'}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />

      {/* Snap to page */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            checked={snapToPage}
            onChange={(e) => setSnapToPage(e.target.checked)}
            className="sr-only peer"
            aria-label="Snap to page mode"
          />
          <div className="w-8 h-4 bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-600 rounded-full transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Snap to page</span>
      </label>
    </div>
  )
}
