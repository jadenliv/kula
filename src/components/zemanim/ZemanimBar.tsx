import { useEffect, useRef, useState } from 'react'
import { useZmanim } from '../../hooks/useZmanim'
import { useLocation } from '../../context/LocationContext'
import { type ZmanimTimes } from '../../services/hebcal'
import { LocationPicker } from './LocationPicker'

/** Ordered list of all zmanim keys with their display labels. */
const ZMANIM_ORDER: { key: keyof ZmanimTimes; label: string }[] = [
  { key: 'alotHaShachar', label: 'Alot HaShachar' },
  { key: 'misheyakir', label: 'Misheyakir' },
  { key: 'sunrise', label: 'Netz HaChama' },
  { key: 'sofZmanShmaMGA', label: 'Shema (MGA)' },
  { key: 'sofZmanShma', label: 'Shema (GRA)' },
  { key: 'sofZmanTfillaMGA', label: 'Tefila (MGA)' },
  { key: 'sofZmanTfilla', label: 'Tefila (GRA)' },
  { key: 'chatzot', label: 'Chatzot' },
  { key: 'minchaGedola', label: 'Mincha Gedola' },
  { key: 'minchaKetana', label: 'Mincha Ketana' },
  { key: 'plagHaMincha', label: 'Plag HaMincha' },
  { key: 'sunset', label: 'Shkia' },
  { key: 'tzeit7083deg', label: 'Tzet HaKochavim' },
  { key: 'tzeitRT', label: 'Tzet Rabbeinu Tam' },
]

const SCROLL_SPEED = 0.4 // pixels per frame (~24px/sec at 60fps)

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function findNextZmanKey(times: ZmanimTimes): keyof ZmanimTimes | null {
  const now = Date.now()
  for (const { key } of ZMANIM_ORDER) {
    const t = times[key]
    if (t && new Date(t).getTime() > now) return key
  }
  return null
}

export function ZemanimBar() {
  const { location, isDetecting } = useLocation()
  const { data, isLoading } = useZmanim()
  const [pickerOpen, setPickerOpen] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const rafRef = useRef<number>(0)

  const nextKey = data ? findNextZmanKey(data.times) : null

  // Auto-scroll: advance scrollLeft every frame; when we reach the halfway
  // point of the duplicated content, jump back to 0 (seamless loop).
  useEffect(() => {
    const el = trackRef.current
    if (!el || !data) return

    function step() {
      if (el && !pausedRef.current) {
        el.scrollLeft += SCROLL_SPEED
        // The inner content is duplicated — the loop point is halfway.
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [data])

  const handleMouseEnter = () => { pausedRef.current = true }
  const handleMouseLeave = () => { pausedRef.current = false }

  // Build the visible items list once, then render it twice for seamless loop.
  const visibleItems = data
    ? ZMANIM_ORDER.filter(({ key }) => data.times[key])
    : []

  const renderItems = (suffix: string) =>
    visibleItems.map(({ key, label }, idx) => {
      const timeStr = data!.times[key]!
      const isNext = key === nextKey
      const isPast = new Date(timeStr).getTime() < Date.now()
      return (
        <span
          key={`${suffix}-${key}`}
          className={`text-xs ${
            isNext
              ? 'font-medium text-kula-600 dark:text-kula-300'
              : isPast
                ? 'text-kula-400/60 dark:text-kula-400/40'
                : 'text-kula-600 dark:text-kula-400'
          }`}
        >
          {idx > 0 && <span className="mx-2 text-kula-300/50 dark:text-kula-600/50">·</span>}
          {label}{' '}
          <span
            className={
              isNext
                ? 'text-kula-600 dark:text-kula-300'
                : isPast
                  ? 'text-kula-400/60 dark:text-kula-400/40'
                  : 'text-kula-500'
            }
          >
            {formatTime(timeStr)}
          </span>
        </span>
      )
    })

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {/* Location pin button */}
      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        className="shrink-0 rounded p-1 text-kula-500 transition-colors hover:text-kula-600 dark:text-kula-300"
        title={location ? `Location: ${location.label}` : 'Set location for zmanim'}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Scrolling strip */}
      <div
        ref={trackRef}
        className="min-w-0 flex-1 overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isDetecting && (
          <span className="whitespace-nowrap text-xs text-neutral-600">
            Detecting location…
          </span>
        )}
        {!location && !isDetecting && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="whitespace-nowrap text-xs text-kula-500 hover:text-kula-600 dark:text-kula-300"
          >
            Set location for zmanim →
          </button>
        )}
        {location && isLoading && (
          <span className="animate-pulse whitespace-nowrap text-xs text-neutral-600">
            Loading zmanim…
          </span>
        )}
        {data && (
          // Content is duplicated so the scroll loop is seamless.
          <div className="flex items-center whitespace-nowrap">
            <span className="flex items-center">{renderItems('a')}</span>
            {/* Spacer between the two copies */}
            <span className="mx-6 text-kula-300/50 dark:text-kula-600/50">·</span>
            <span className="flex items-center">{renderItems('b')}</span>
            <span className="mx-6 text-kula-300/50 dark:text-kula-600/50">·</span>
          </div>
        )}
      </div>

      {/* Location picker popover */}
      {pickerOpen && (
        <div className="absolute right-0 top-full z-50 mt-1">
          <LocationPicker onClose={() => setPickerOpen(false)} />
        </div>
      )}
    </div>
  )
}
