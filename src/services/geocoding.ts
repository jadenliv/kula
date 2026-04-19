/**
 * Geocoding service layer.
 *
 * Reverse geocoding (coords → city name + timezone):
 *   BigDataCloud — free, no API key, returns timezone too.
 *   https://api.bigdatacloud.net/data/reverse-geocode-client
 *
 * Forward geocoding (place name / zip → coords):
 *   Nominatim (OpenStreetMap) — free, no API key.
 *   https://nominatim.openstreetmap.org/search
 *   Per Nominatim's usage policy we must not spam it — callers should debounce.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeocodedPlace = {
  /** Short human-readable label, e.g. "Bloomington, Indiana" */
  label: string
  lat: number
  lng: number
  /** IANA timezone string, e.g. "America/Indiana/Indianapolis" */
  tzid: string
}

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    municipality?: string
    suburb?: string
    county?: string
    state?: string
    country?: string
    country_code?: string
    postcode?: string
  }
}

type BigDataCloudResult = {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
  countryCode?: string
  timezone?: {
    ianaTimeId?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a readable short label from a Nominatim address object. */
function shortLabelFromNominatim(address: NominatimResult['address']): string {
  if (!address) return ''
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality
  const region = address.state || address.county || address.country
  return [city, region].filter(Boolean).join(', ')
}

// ── Reverse geocode ───────────────────────────────────────────────────────────

/**
 * Given coordinates, return a human-readable city label and IANA timezone.
 * Falls back to the browser's current timezone if BigDataCloud doesn't return one.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ label: string; tzid: string }> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`BigDataCloud HTTP ${res.status}`)
    const data = (await res.json()) as BigDataCloudResult

    const city = data.city || data.locality || data.principalSubdivision
    const region =
      data.countryCode === 'US' ? data.principalSubdivision : data.countryName
    const label =
      [city, region].filter(Boolean).join(', ') ||
      `${lat.toFixed(2)}, ${lng.toFixed(2)}`
    const tzid =
      data.timezone?.ianaTimeId ||
      Intl.DateTimeFormat().resolvedOptions().timeZone

    return { label, tzid }
  } catch {
    // Fallback: browser timezone, coordinate label
    return {
      label: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      tzid: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }
}

// ── Forward geocode (search) ──────────────────────────────────────────────────

/**
 * Search for places by name or zip code.
 * Returns up to 5 candidate results with a short label and coordinates.
 * Timezone is NOT resolved here — call reverseGeocode() after the user picks
 * a result to get the full GeocodedPlace including tzid.
 */
export async function searchPlaces(
  query: string,
): Promise<Array<{ label: string; shortLabel: string; lat: number; lng: number }>> {
  if (!query.trim()) return []
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query.trim())}` +
    `&format=json&limit=6&addressdetails=1`
  const res = await fetch(url, {
    headers: {
      // Nominatim requires identifying the app; User-Agent can't be set from
      // browsers, but Accept-Language is accepted in its place for web apps.
      'Accept-Language': 'en',
    },
  })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  const results = (await res.json()) as NominatimResult[]

  return results.map((r) => ({
    label: r.display_name,
    shortLabel: shortLabelFromNominatim(r.address) || r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }))
}
