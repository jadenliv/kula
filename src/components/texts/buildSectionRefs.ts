// Sefaria index schemas vary by text type. This helper produces a flat list
// of "section refs" the tree can link to. It handles:
//
//   - JaggedArrayNode with Integer addresses (Tanakh: "Genesis 1")
//   - JaggedArrayNode with Talmud addresses ("Berakhot 2a", "2b", …)
//   - ComplexSchema / SchemaNode with child nodes (Mishneh Torah etc.) —
//     recurse into schema.nodes and concatenate a titlePath for each leaf
//
// If none of these fit, it returns [] and the UI falls back to a single
// "Open" link that navigates to the sefer's root ref. This is the workaround
// for Sefaria's schema variance — we explicitly handle the common cases and
// degrade gracefully for unusual ones.

import type {
  SefariaIndexDetails,
  SefariaSchemaNode,
} from '../../types/sefaria'

export type SectionRef = {
  ref: string
  label: string
}

export function buildSectionRefs(details: SefariaIndexDetails): SectionRef[] {
  // Some responses surface lengths/sectionNames at the top level instead of
  // inside schema. Prefer schema, fall back to top-level.
  const root: SefariaSchemaNode = details.schema ?? {
    lengths: details.lengths,
    sectionNames: details.sectionNames,
    addressTypes: details.addressTypes,
    depth: details.depth,
  }

  return collectRefs(root, details.title)
}

function collectRefs(
  node: SefariaSchemaNode,
  titlePath: string,
): SectionRef[] {
  // ComplexSchema — recurse into named child nodes.
  if (node.nodes && node.nodes.length > 0) {
    const out: SectionRef[] = []
    for (const child of node.nodes) {
      const childTitle = child.title ?? child.key ?? ''
      // Sefaria refs join ComplexSchema children with ", " — e.g.
      // "Mishneh Torah, Fundamentals of the Torah, 1".
      const nextPath = childTitle ? `${titlePath}, ${childTitle}` : titlePath
      out.push(...collectRefs(child, nextPath))
    }
    return out
  }

  // JaggedArrayNode — generate one ref per top-level section.
  const lengths = node.lengths ?? []
  const addressTypes = node.addressTypes ?? []
  if (lengths.length === 0) return []

  const topCount = lengths[0]
  const topAddressType = addressTypes[0] ?? 'Integer'

  const refs: SectionRef[] = []

  if (topAddressType === 'Talmud') {
    // Sefaria Talmud convention: first daf is 2 (bet). Amudim alternate a/b.
    // lengths[0] is the total amudim count.
    for (let i = 0; i < topCount; i++) {
      const daf = Math.floor(i / 2) + 2
      const side = i % 2 === 0 ? 'a' : 'b'
      const label = `${daf}${side}`
      refs.push({ ref: `${titlePath} ${label}`, label })
    }
  } else {
    // Integer / Perek / generic — 1-indexed.
    for (let i = 1; i <= topCount; i++) {
      refs.push({ ref: `${titlePath} ${i}`, label: String(i) })
    }
  }

  return refs
}
