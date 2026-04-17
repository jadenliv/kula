/**
 * Utilities for traversing the pre-compiled catalog tree.
 *
 * These are used by:
 *  - The Dashboard "Currently Learning" section (progress + last-learned)
 *  - The SeferPicker (building the searchable sefer list)
 */

import { catalog, type CatalogNode } from '../data/catalog'

// ── Ref collection ────────────────────────────────────────────────────────────

/** Recursively collect every leaf ref under a node. */
export function collectRefs(node: CatalogNode): string[] {
  if (node.ref) return [node.ref]
  return (node.children ?? []).flatMap(collectRefs)
}

/** Memoized map: English name → all leaf refs under that node. Built once. */
const refCache = new Map<string, string[]>()

export function refsForSefer(seferId: string): string[] {
  if (refCache.has(seferId)) return refCache.get(seferId)!
  const node = findNodeByEnglish(seferId)
  const refs = node ? collectRefs(node) : []
  refCache.set(seferId, refs)
  return refs
}

// ── Node lookup ───────────────────────────────────────────────────────────────

/** Find the first catalog node whose English name matches exactly. */
export function findNodeByEnglish(english: string): CatalogNode | null {
  return searchNodes(english, catalog.children)
}

function searchNodes(english: string, nodes: CatalogNode[]): CatalogNode | null {
  for (const node of nodes) {
    if (node.english === english) return node
    if (node.children) {
      const found = searchNodes(english, node.children)
      if (found) return found
    }
  }
  return null
}

// ── Picker items ──────────────────────────────────────────────────────────────

/** One entry in the sefer picker — always a group node (never a leaf). */
export type PickerItem = {
  english: string
  hebrew?: string
  totalRefs: number
  /** Top-level category label (e.g. "Talmud Bavli", "Tanakh"). */
  topCategory: string
}

/**
 * Flat list of all group nodes at depth 0–2, organized for the picker.
 * Depth 0 = corpora (Tanakh, Talmud Bavli, …)
 * Depth 1 = sub-corpora or major sefarim (Torah, Berakhot, …)
 * Depth 2 = individual sefarim where applicable (Genesis, Exodus, …)
 *
 * Leaf nodes (those with a `ref`) are excluded — users track at the
 * sefer/section level, not individual daf/perek.
 */
export function buildPickerItems(): PickerItem[] {
  const items: PickerItem[] = []

  for (const top of catalog.children) {
    if (top.ref) continue // shouldn't happen at root level

    items.push({
      english: top.english,
      hebrew: top.hebrew,
      totalRefs: collectRefs(top).length,
      topCategory: top.english,
    })

    for (const mid of top.children ?? []) {
      if (mid.ref) continue // leaf at depth 1 — skip (not a grouping)

      items.push({
        english: mid.english,
        hebrew: mid.hebrew,
        totalRefs: collectRefs(mid).length,
        topCategory: top.english,
      })

      for (const deep of mid.children ?? []) {
        if (deep.ref) continue // leaf — skip

        items.push({
          english: deep.english,
          hebrew: deep.hebrew,
          totalRefs: collectRefs(deep).length,
          topCategory: top.english,
        })
      }
    }
  }

  return items
}

/** Singleton picker items list — computed once and reused. */
let _pickerItems: PickerItem[] | null = null
export function getPickerItems(): PickerItem[] {
  if (!_pickerItems) _pickerItems = buildPickerItems()
  return _pickerItems
}

// ── Picker tree (for accordion browse) ───────────────────────────────────────

/**
 * A node in the picker tree. Only group nodes are included — leaf nodes
 * (individual daf/pasuk) are filtered out because "currently learning" tracks
 * at the sefer or section level, not individual entries.
 */
export type PickerTreeNode = {
  english: string
  hebrew?: string
  totalRefs: number
  children: PickerTreeNode[]
}

function buildGroupTree(nodes: CatalogNode[]): PickerTreeNode[] {
  const result: PickerTreeNode[] = []
  for (const node of nodes) {
    if (node.ref) continue // leaf — skip
    const children = buildGroupTree(node.children ?? [])
    result.push({
      english: node.english,
      hebrew: node.hebrew,
      totalRefs: collectRefs(node).length,
      children,
    })
  }
  return result
}

let _pickerTree: PickerTreeNode[] | null = null
export function getPickerTree(): PickerTreeNode[] {
  if (!_pickerTree) _pickerTree = buildGroupTree(catalog.children)
  return _pickerTree
}
