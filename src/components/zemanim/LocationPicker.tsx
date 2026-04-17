import { useState } from 'react'
import { useLocation, type LocationData } from '../../context/LocationContext'

type Props = {
  onClose: () => void
}

export function LocationPicker({ onClose }: Props) {
  const { location, isDetecting, detectionError, setManualLocation, redetect } =
    useLocation()

  const [lat, setLat] = useState(location?.lat.toFixed(4) ?? '')
  const [lng, setLng] = useState(location?.lng.toFixed(4) ?? '')
  const [label, setLabel] = useState(
    location?.label === 'Current Location' ? '' : (location?.label ?? ''),
  )

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) return
    const loc: LocationData = {
      lat: latNum,
      lng: lngNum,
      label: label.trim() || `${latNum.toFixed(2)}, ${lngNum.toFixed(2)}`,
      tzid: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
    setManualLocation(loc)
    onClose()
  }

  const handleRedetect = () => {
    redetect()
    onClose()
  }

  return (
    <div className="w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-kula-900 dark:text-kula-100">Location</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-kula-400 hover:text-kula-700 dark:hover:text-kula-200"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {location && (
        <p className="mb-3 text-xs text-kula-600 dark:text-kula-400">
          Current:{' '}
          <span className="text-kula-800 dark:text-kula-200">{location.label}</span>
          {location.label !== 'Current Location' && (
            <span className="ml-1 text-kula-400 dark:text-kula-600">
              ({location.lat.toFixed(2)}, {location.lng.toFixed(2)})
            </span>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={handleRedetect}
        disabled={isDetecting}
        className="mb-4 w-full rounded-lg border border-[var(--border)] py-1.5 text-xs text-kula-700 transition-colors hover:border-kula-400 hover:text-kula-500 disabled:opacity-50 dark:text-kula-300 dark:hover:text-kula-300"
      >
        {isDetecting ? 'Detecting…' : '⟳ Re-detect my location'}
      </button>

      {detectionError && (
        <p className="mb-3 text-xs text-red-500">{detectionError}</p>
      )}

      <form onSubmit={handleManualSubmit} className="space-y-2">
        <p className="text-xs text-kula-500">Or enter manually:</p>
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
          />
        </div>
        <input
          type="text"
          placeholder="Label (optional, e.g. New York)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-kula-900 placeholder:text-kula-400 focus:border-kula-400 focus:outline-none dark:text-kula-100 dark:placeholder:text-kula-600"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-kula-700 py-1.5 text-xs font-medium text-white transition-colors hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          Save location
        </button>
      </form>
    </div>
  )
}
