// Hardcoded perek totals for Tanakh.
//
// Why hardcoded and not fetched: computing "% of Tanakh" at render time
// would otherwise require loading index details for ~40 sefarim before we
// can show anything. These counts never change, so a tiny static table is
// the right trade. Other categories (Mishnah, Talmud, etc.) aren't in here
// yet — their percentages are deferred until we have a good way to pull
// totals without hammering Sefaria.
//
// Titles must match Sefaria's canonical English title exactly (Sefaria uses
// Roman numerals for dual books: "I Samuel", "II Kings", etc.).

export const TANAKH_PERAKIM: Readonly<Record<string, number>> = {
  // Torah — 187 perakim total
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,

  // Nevi'im — 380 perakim total
  Joshua: 24,
  Judges: 21,
  'I Samuel': 31,
  'II Samuel': 24,
  'I Kings': 22,
  'II Kings': 25,
  Isaiah: 66,
  Jeremiah: 52,
  Ezekiel: 48,
  Hosea: 14,
  Joel: 4,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 3,

  // Ketuvim — 362 perakim total
  Psalms: 150,
  Proverbs: 31,
  Job: 42,
  'Song of Songs': 8,
  Ruth: 4,
  Lamentations: 5,
  Ecclesiastes: 12,
  Esther: 10,
  Daniel: 12,
  Ezra: 10,
  Nehemiah: 13,
  'I Chronicles': 29,
  'II Chronicles': 36,
}

/** Total perakim for a sefer, or null if we don't have static data for it. */
export function getSeferPerakim(title: string): number | null {
  return TANAKH_PERAKIM[title] ?? null
}

/** All perek refs for a Tanakh sefer: "Genesis 1" through "Genesis 50". */
export function getSeferPerekRefs(title: string): string[] | null {
  const count = getSeferPerakim(title)
  if (count === null) return null
  return Array.from({ length: count }, (_, i) => `${title} ${i + 1}`)
}
