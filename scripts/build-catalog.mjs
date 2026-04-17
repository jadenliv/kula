/**
 * build-catalog.mjs
 *
 * One-time build script that walks Sefaria's TOC for our curated categories,
 * fetches /api/shape/{title} for each sefer to get exact structural counts,
 * and writes src/data/catalog.json.
 *
 * Run once (or to refresh after adding new sefarim):
 *   node scripts/build-catalog.mjs
 *
 * Requires Node 20+ (built-in fetch).
 *
 * Grain specs
 * -----------
 * perek         — flat list of N perakim.         Ref: "{title} {n}"
 * daf           — Talmud amudim (start daf 2).    Ref: "{title} 2a", "2b", …
 * perek-mishnah — perakim → mishnayot.            Ref: "{title} {p}:{m}"
 * yerushalmi    — perakim → halakhot (depth-3).   Ref: "{title} {p}:{h}"
 * siman-seif    — simanim → seifim.               Ref: "{title} {s}:{sf}"
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'src/data/catalog.json')

const API = 'https://www.sefaria.org/api'
const CONCURRENCY = 5

// ---------------------------------------------------------------------------
// Which top-level sections of Sefaria's TOC to include, and with what grain.
// skipCategories / skipTitles are matched against children of the root node.
// ---------------------------------------------------------------------------
const CURATED = [
  {
    tocPath: ['Tanakh'],
    english: 'Tanakh', hebrew: 'תנ״ך',
    grain: 'perek',
    skipCategories: new Set([
      'Targum',
      'Rishonim on Tanakh', 'Acharonim on Tanakh', 'Modern Commentary on Tanakh',
      'Commentary', 'Quoting Commentary',
    ]),
  },
  {
    tocPath: ['Mishnah'],
    english: 'Mishnah', hebrew: 'משנה',
    grain: 'perek-mishnah',
    skipCategories: new Set([
      'Rishonim on Mishnah', 'Acharonim on Mishnah', 'Modern Commentary on Mishnah',
      'Commentary', 'Quoting Commentary',
    ]),
  },
  {
    tocPath: ['Talmud', 'Bavli'],
    english: 'Talmud Bavli', hebrew: 'תלמוד בבלי',
    grain: 'daf',
    skipCategories: new Set([
      'Minor Tractates', 'Guides',
      'Rishonim on Talmud', 'Acharonim on Talmud', 'Modern Commentary on Talmud',
      'Commentary on Minor Tractates', 'Commentary', 'Quoting Commentary',
    ]),
  },
  {
    tocPath: ['Talmud', 'Yerushalmi'],
    english: 'Talmud Yerushalmi', hebrew: 'תלמוד ירושלמי',
    grain: 'yerushalmi',
    skipCategories: new Set([
      'Modern Commentary on Talmud', 'Commentary', 'Quoting Commentary',
    ]),
  },
  {
    tocPath: ['Halakhah', 'Mishneh Torah'],
    english: 'Mishneh Torah', hebrew: 'משנה תורה',
    grain: 'perek',
    skipCategories: new Set(['Introduction', 'Commentary', 'Quoting Commentary']),
  },
  {
    tocPath: ['Halakhah', 'Shulchan Arukh'],
    english: 'Shulchan Arukh', hebrew: 'שולחן ערוך',
    grain: 'siman-seif',
    skipCategories: new Set(['Commentary', 'Quoting Commentary']),
    skipTitles: new Set(['Shulchan Arukh, Introduction', 'Peri Megadim on Orach Chayim']),
  },
]

// ---------------------------------------------------------------------------
// HTTP helpers with a simple concurrency-limited queue
// ---------------------------------------------------------------------------
const cache = new Map()
let inFlight = 0
const queue = []

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url)
  await new Promise((resolve) => {
    const attempt = () => {
      if (inFlight < CONCURRENCY) {
        inFlight++
        resolve()
      } else {
        queue.push(attempt)
      }
    }
    attempt()
  })
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
    const data = await res.json()
    cache.set(url, data)
    return data
  } finally {
    inFlight--
    if (queue.length > 0) queue.shift()()
  }
}

async function fetchShape(title) {
  const data = await fetchJson(`${API}/shape/${encodeURIComponent(title)}`)
  if (!Array.isArray(data) || !data[0]) throw new Error(`Unexpected shape for "${title}": ${JSON.stringify(data).slice(0, 200)}`)
  return data[0]
}

// ---------------------------------------------------------------------------
// Leaf generators per grain
// ---------------------------------------------------------------------------
async function generateLeaves(title, grain) {
  const shape = await fetchShape(title)

  if (grain === 'perek') {
    return Array.from({ length: shape.length }, (_, i) => ({
      english: String(i + 1),
      ref: `${title} ${i + 1}`,
    }))
  }

  if (grain === 'daf') {
    // Sefaria's shape.chapters is indexed from daf 1 (slots 0,1 = daf 1a/1b),
    // which never exists in the Bavli — those entries are 0. We skip any
    // amud whose chapter count is 0 so we don't generate phantom refs.
    // Daf formula: daf = floor(i/2) + 1  (daf 1 = indices 0,1; daf 2 = 2,3 …)
    const chapters = shape.chapters ?? []
    const leaves = []
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i] === 0) continue
      const daf = Math.floor(i / 2) + 1
      const side = i % 2 === 0 ? 'a' : 'b'
      leaves.push({ english: `${daf}${side}`, ref: `${title} ${daf}${side}` })
    }
    return leaves
  }

  if (grain === 'perek-mishnah') {
    // chapters = [mishnayot_in_perek_1, mishnayot_in_perek_2, …]
    const chapters = shape.chapters ?? []
    return chapters.map((mishnayot, pi) => ({
      english: `Perek ${pi + 1}`,
      children: Array.from({ length: mishnayot }, (_, mi) => ({
        english: String(mi + 1),
        ref: `${title} ${pi + 1}:${mi + 1}`,
      })),
    }))
  }

  if (grain === 'yerushalmi') {
    // chapters = [[seg_per_halacha_in_p1_h1, …], [p2…], …]  (2D)
    // Middle level = halakhah.  Ref: "{title} {perek}:{halakhah}"
    const chapters = shape.chapters ?? []
    return chapters.map((halakhot, pi) => ({
      english: `Perek ${pi + 1}`,
      children: Array.from({ length: halakhot.length }, (_, hi) => ({
        english: String(hi + 1),
        ref: `${title} ${pi + 1}:${hi + 1}`,
      })),
    }))
  }

  if (grain === 'siman-seif') {
    // chapters = [seifim_in_siman_1, seifim_in_siman_2, …]
    const chapters = shape.chapters ?? []
    return chapters.map((seifim, si) => ({
      english: `Siman ${si + 1}`,
      children: Array.from({ length: seifim }, (_, sfi) => ({
        english: String(sfi + 1),
        ref: `${title} ${si + 1}:${sfi + 1}`,
      })),
    }))
  }

  console.warn(`  Unknown grain "${grain}" for "${title}" — skipping`)
  return []
}

// ---------------------------------------------------------------------------
// TOC walker
// ---------------------------------------------------------------------------
function findTocPath(toc, path) {
  let node = { contents: toc }
  for (const segment of path) {
    if (!node.contents) throw new Error(`No contents at path segment "${segment}"`)
    const found = node.contents.find(
      (c) => c.category === segment || c.title === segment,
    )
    if (!found) throw new Error(`TOC path not found: ${path.join(' > ')}`)
    node = found
  }
  return node
}

async function buildTocNode(tocNode, grain, skipCategories, skipTitles) {
  if (tocNode.contents) {
    // Category node — recurse into children, skipping what we don't want.
    const children = []
    for (const child of tocNode.contents) {
      if (child.category && skipCategories?.has(child.category)) continue
      if (child.title && skipTitles?.has(child.title)) continue
      const built = await buildTocNode(child, grain, skipCategories, skipTitles)
      if (built) children.push(built)
    }
    if (children.length === 0) return null
    return {
      english: tocNode.category,
      hebrew: tocNode.heCategory ?? undefined,
      children,
    }
  } else {
    // Sefer leaf — fetch shape and expand.
    const title = tocNode.title
    if (!title) return null
    process.stdout.write(`  fetching "${title}"…\n`)
    try {
      const leaves = await generateLeaves(title, grain)
      if (leaves.length === 0) {
        console.warn(`  WARNING: No leaves generated for "${title}" — skipping`)
        return null
      }
      return {
        english: title,
        hebrew: tocNode.heTitle ?? undefined,
        children: leaves,
      }
    } catch (err) {
      console.error(`  ERROR for "${title}": ${err.message} — skipping`)
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const toc = await fetchJson(`${API}/index/`)
console.log(`Fetched TOC (${toc.length} top-level categories)`)

const catalogChildren = []
for (const root of CURATED) {
  console.log(`\nBuilding: ${root.english}`)
  const tocNode = findTocPath(toc, root.tocPath)
  const built = await buildTocNode(
    tocNode,
    root.grain,
    root.skipCategories,
    root.skipTitles,
  )
  if (built) {
    catalogChildren.push({
      english: root.english,
      hebrew: root.hebrew,
      children: built.children,
    })
  }
}

const catalog = { english: 'Library', children: catalogChildren }

// Count leaves
function countLeaves(node) {
  if (node.ref) return 1
  return (node.children ?? []).reduce((sum, c) => sum + countLeaves(c), 0)
}
const total = countLeaves(catalog)

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(catalog, null, 2))
console.log(`\nWrote ${OUT}`)
console.log(`Total leaf refs: ${total.toLocaleString()}`)
