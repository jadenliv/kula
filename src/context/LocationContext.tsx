import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { reverseGeocode } from '../services/geocoding'

const LOCATION_KEY = 'kula-location'

export type LocationData = {
  lat: number
  lng: number
  label: string  // "Current Location" or user-set label
  tzid: string   // IANA timezone string
}

type LocationContextValue = {
  location: LocationData | null
  isDetecting: boolean
  detectionError: string | null
  setManualLocation: (loc: LocationData) => void
  redetect: () => void
}

const LocationContext = createContext<LocationContextValue | null>(null)

function readStoredLocation(): LocationData | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    return raw ? (JSON.parse(raw) as LocationData) : null
  } catch {
    return null
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(readStoredLocation)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setDetectionError('Geolocation is not supported by this browser.')
      return
    }
    setIsDetecting(true)
    setDetectionError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        // Reverse-geocode the coordinates to get a real city name and
        // the correct IANA timezone for the detected location.
        const { label, tzid } = await reverseGeocode(lat, lng)
        const loc: LocationData = { lat, lng, label, tzid }
        setLocation(loc)
        localStorage.setItem(LOCATION_KEY, JSON.stringify(loc))
        setIsDetecting(false)
      },
      (err) => {
        setDetectionError(err.message)
        setIsDetecting(false)
      },
      { timeout: 10000 },
    )
  }, [])

  // Auto-detect on first mount only when there is no stored location.
  useEffect(() => {
    if (!readStoredLocation()) {
      detectLocation()
    }
  }, [detectLocation])

  const setManualLocation = useCallback((loc: LocationData) => {
    setLocation(loc)
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc))
  }, [])

  return (
    <LocationContext.Provider
      value={{
        location,
        isDetecting,
        detectionError,
        setManualLocation,
        redetect: detectLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
