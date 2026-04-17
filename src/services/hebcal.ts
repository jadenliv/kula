/**
 * HebCal API service layer.
 *
 * Zmanim:   GET https://www.hebcal.com/zmanim?cfg=json&latitude=…&longitude=…&tzid=…
 * Calendar: GET https://www.hebcal.com/hebcal?v=1&cfg=json&start=…&end=…&…flags…
 *
 * No API key required. Cache aggressively — times don't change within a day.
 */

const BASE = 'https://www.hebcal.com'

// ---------------------------------------------------------------------------
// Zmanim
// ---------------------------------------------------------------------------

export type ZmanimTimes = {
  alotHaShachar?: string
  misheyakir?: string
  misheyakirMachmir?: string
  dawn?: string
  sunrise?: string
  sofZmanShmaMGA?: string
  sofZmanShma?: string
  sofZmanTfillaMGA?: string
  sofZmanTfilla?: string
  chatzot?: string
  minchaGedola?: string
  minchaKetana?: string
  plagHaMincha?: string
  sunset?: string
  dusk?: string
  tzeit7083deg?: string
  tzeit85deg?: string
  tzeitRT?: string
}

export type ZmanimResponse = {
  date: string
  location: {
    title?: string
    city?: string
    tzid: string
    latitude: number
    longitude: number
  }
  times: ZmanimTimes
}

export async function fetchZmanim(
  lat: number,
  lng: number,
  tzid: string,
): Promise<ZmanimResponse> {
  const url =
    `${BASE}/zmanim?cfg=json` +
    `&latitude=${lat}&longitude=${lng}` +
    `&tzid=${encodeURIComponent(tzid)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HebCal zmanim HTTP ${res.status}`)
  return res.json() as Promise<ZmanimResponse>
}

// ---------------------------------------------------------------------------
// Daily learning schedule — sourced from Sefaria's /api/calendars endpoint.
//
// HebCal's hebcal API does not reliably expose Yerushalmi Yomi or Rambam via
// its query parameters. Sefaria's own calendars endpoint returns all major
// daily learning schedules in a single call with Hebrew titles and direct
// Sefaria links, making it the better source.
// ---------------------------------------------------------------------------

export type SefariaCalendarItem = {
  title: { en: string; he?: string }
  displayValue: { en: string; he?: string }
  /** Sefaria URL path segment — build the full link as sefaria.org/{url}?lang=bi */
  url: string
  ref: string
  heRef?: string
  order: number
  category: string
  description?: { en?: string; he?: string }
}

// Keep HebCalEvent as an alias so the hook and page don't need a rename.
export type HebCalEvent = SefariaCalendarItem

/**
 * Fetch today's learning schedules from Sefaria's calendars API.
 * Returns all calendar items (Parasha, Daf Yomi, Yerushalmi, Mishna,
 * Rambam 1 chapter, Rambam 3 chapters, etc.).
 */
export async function fetchDailyLearning(): Promise<SefariaCalendarItem[]> {
  const res = await fetch('https://www.sefaria.org/api/calendars')
  if (!res.ok) throw new Error(`Sefaria calendars HTTP ${res.status}`)
  const data = (await res.json()) as { calendar_items: SefariaCalendarItem[] }
  return data.calendar_items ?? []
}
