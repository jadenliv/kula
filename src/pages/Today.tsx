import { useZmanim } from '../hooks/useZmanim'
import { useDailyLearning } from '../hooks/useDailyLearning'
import { useLocation } from '../context/LocationContext'
import { Spinner } from '../components/ui/Spinner'
import { type ZmanimTimes, type HebCalEvent } from '../services/hebcal'
import { LocationPicker } from '../components/zemanim/LocationPicker'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Zmanim display config
// ---------------------------------------------------------------------------
type ZmanDisplay = {
  key: keyof ZmanimTimes
  hebrew: string
  english: string
}

const ZMANIM_DISPLAY: ZmanDisplay[] = [
  { key: 'alotHaShachar',   hebrew: 'עלות השחר',             english: 'Alot HaShachar'      },
  { key: 'misheyakir',      hebrew: 'משיכיר',                english: 'Misheyakir'          },
  { key: 'sunrise',         hebrew: 'נץ החמה',               english: 'Netz HaChama'        },
  { key: 'sofZmanShmaMGA',  hebrew: 'סוף זמן שמע (מ״א)',     english: 'Sof Zman Shema (MGA)'},
  { key: 'sofZmanShma',     hebrew: 'סוף זמן שמע (גר״א)',    english: 'Sof Zman Shema (GRA)'},
  { key: 'sofZmanTfillaMGA',hebrew: 'סוף זמן תפילה (מ״א)',   english: 'Sof Zman Tefila (MGA)'},
  { key: 'sofZmanTfilla',   hebrew: 'סוף זמן תפילה (גר״א)',  english: 'Sof Zman Tefila (GRA)'},
  { key: 'chatzot',         hebrew: 'חצות',                  english: 'Chatzot'             },
  { key: 'minchaGedola',    hebrew: 'מנחה גדולה',            english: 'Mincha Gedola'       },
  { key: 'minchaKetana',    hebrew: 'מנחה קטנה',             english: 'Mincha Ketana'       },
  { key: 'plagHaMincha',    hebrew: 'פלג המנחה',             english: 'Plag HaMincha'       },
  { key: 'sunset',          hebrew: 'שקיעה',                 english: 'Shkia'               },
  { key: 'tzeit7083deg',    hebrew: 'צאת הכוכבים',           english: 'Tzet HaKochavim'     },
  { key: 'tzeitRT',         hebrew: 'צאת רבנו תם',           english: 'Tzet Rabbeinu Tam'   },
]

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function findNextZmanKey(times: ZmanimTimes): keyof ZmanimTimes | null {
  const now = Date.now()
  for (const { key } of ZMANIM_DISPLAY) {
    const t = times[key]
    if (t && new Date(t).getTime() > now) return key
  }
  return null
}

function formatGregorianDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatHebrewDate(): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-hebrew', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date())
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Learning schedule config
// ---------------------------------------------------------------------------
type LearningSchedule = {
  titleEn: string
  label: string
  hebrew: string
  accent: string  // text color class for the category label
}

const LEARNING_SCHEDULES: LearningSchedule[] = [
  { titleEn: 'Parashat Hashavua',         label: 'Parashat HaShavuah', hebrew: 'פרשת השבוע',      accent: 'text-kula-600 dark:text-kula-300'  },
  { titleEn: 'Daf Yomi',                  label: 'Daf Yomi',           hebrew: 'דף יומי',           accent: 'text-kula-500 dark:text-kula-400'  },
  { titleEn: 'Yerushalmi Yomi',           label: 'Yerushalmi Yomi',    hebrew: 'ירושלמי יומי',      accent: 'text-kula-700 dark:text-kula-200'  },
  { titleEn: 'Daily Mishnah',             label: 'Mishna Yomit',       hebrew: 'משנה יומית',        accent: 'text-kula-600 dark:text-kula-300'  },
  { titleEn: 'Daily Rambam',              label: 'Rambam (1 Perek)',   hebrew: 'רמב״ם יומי',        accent: 'text-kula-500 dark:text-kula-400'  },
  { titleEn: 'Daily Rambam (3 Chapters)', label: 'Rambam (3 Perakim)', hebrew: 'רמב״ם (3 פרקים)',   accent: 'text-kula-700 dark:text-kula-200'  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Today() {
  const { location } = useLocation()
  const { data: zmanimData, isLoading: zmanimLoading } = useZmanim()
  const { data: learningData, isLoading: learningLoading } = useDailyLearning()
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)

  const nextKey = zmanimData ? findNextZmanKey(zmanimData.times) : null
  const hebrewDate = formatHebrewDate()

  const learningByTitle = new Map<string, HebCalEvent>()
  for (const item of learningData ?? []) {
    const key = item.title.en
    if (!learningByTitle.has(key)) learningByTitle.set(key, item)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">Today</h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm text-kula-600 dark:text-kula-400">
            <span>{formatGregorianDate()}</span>
            {hebrewDate && (
              <>
                <span className="text-kula-300 dark:text-kula-700">·</span>
                <span className="font-serif text-kula-700 dark:text-kula-300">{hebrewDate}</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLocationPickerOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-500 dark:text-kula-400 dark:hover:text-kula-300"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
          </svg>
          {location ? location.label : 'Set location'}
        </button>
      </div>

      {/* Location picker */}
      {locationPickerOpen && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <LocationPicker onClose={() => setLocationPickerOpen(false)} />
        </div>
      )}

      {/* Zmanim section */}
      <section>
        <h3 className="mb-4 font-serif text-xl tracking-tight text-kula-900 dark:text-kula-100">
          זמנים <span className="ml-2 font-sans text-sm font-normal text-kula-500">Zemanim</span>
        </h3>

        {!location && (
          <p className="text-sm text-kula-500">
            Set your location above to see today's zmanim.
          </p>
        )}

        {location && zmanimLoading && (
          <div className="flex items-center gap-3 text-sm text-kula-600 dark:text-kula-400">
            <Spinner size="sm" /> Loading zmanim…
          </div>
        )}

        {zmanimData && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ZMANIM_DISPLAY.filter(({ key }) => zmanimData.times[key]).map(({ key, hebrew, english }) => {
              const timeStr = zmanimData.times[key]!
              const isNext = key === nextKey
              const isPast = new Date(timeStr).getTime() < Date.now()
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 transition-colors ${
                    isNext
                      ? 'border-kula-400/40 bg-kula-400/5 dark:border-kula-400/40 dark:bg-kula-400/5'
                      : 'border-[var(--border)] bg-[var(--surface-raised)]/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${
                      isNext ? 'text-kula-600 dark:text-kula-300'
                        : isPast ? 'text-kula-400/60 dark:text-kula-400/40'
                        : 'text-kula-800 dark:text-kula-200'
                    }`}>
                      {english}
                      {isNext && (
                        <span className="ml-2 rounded-full bg-kula-400/15 px-1.5 py-0.5 text-xs text-kula-600 dark:text-kula-300">
                          next
                        </span>
                      )}
                    </p>
                    <p className={`text-xs ${isPast ? 'text-kula-400/60 dark:text-kula-400/40' : 'text-kula-500'}`} dir="rtl">
                      {hebrew}
                    </p>
                  </div>
                  <span className={`ml-4 shrink-0 font-mono text-sm tabular-nums ${
                    isNext ? 'text-kula-600 dark:text-kula-300'
                      : isPast ? 'text-kula-400/60 dark:text-kula-400/40'
                      : 'text-kula-700 dark:text-kula-300'
                  }`}>
                    {formatTime(timeStr)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Daily learning section */}
      <section>
        <h3 className="mb-4 font-serif text-xl tracking-tight text-kula-900 dark:text-kula-100">
          לימוד היומי <span className="ml-2 font-sans text-sm font-normal text-kula-500">Daily Learning</span>
        </h3>

        {learningLoading && (
          <div className="flex items-center gap-3 text-sm text-kula-600 dark:text-kula-400">
            <Spinner size="sm" /> Loading schedules…
          </div>
        )}

        {!learningLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LEARNING_SCHEDULES.map(({ titleEn, label, hebrew, accent }) => {
              const item = learningByTitle.get(titleEn)
              const sefariaLink = item ? `https://www.sefaria.org/${item.url}?lang=bi` : null
              return (
                <div key={titleEn} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                  <p className={`mb-0.5 text-xs font-semibold uppercase tracking-wider ${accent}`}>
                    {label}
                  </p>
                  <p className="mb-2.5 text-xs text-kula-400 dark:text-kula-600" dir="rtl">
                    {item?.title.he ?? hebrew}
                  </p>
                  {item ? (
                    <>
                      <p className="text-sm font-medium leading-snug text-kula-900 dark:text-kula-100">
                        {item.displayValue.en}
                      </p>
                      {item.displayValue.he && (
                        <p className="mt-1 text-xs text-kula-500" dir="rtl">
                          {item.displayValue.he}
                        </p>
                      )}
                      {sefariaLink && (
                        <a
                          href={sefariaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2.5 inline-block text-xs text-kula-500 transition-colors hover:text-kula-600 dark:hover:text-kula-300"
                        >
                          Open in Sefaria ↗
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm italic text-kula-400 dark:text-kula-600">Not available</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
