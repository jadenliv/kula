// Types for the Sefaria API responses we consume.
// The API is quirky and the schema varies by text type, so these cover the
// shapes we actually use and leave unknown fields as optional.

// ---------- GET /api/index/ ----------
// Returns a tree of categories whose leaves are sefarim.

export type SefariaIndexCategory = {
  category: string
  heCategory?: string
  contents: SefariaIndexEntry[]
}

export type SefariaIndexSefer = {
  title: string
  heTitle?: string
  categories?: string[]
  // Sefarim don't have `contents`.
}

export type SefariaIndexEntry = SefariaIndexCategory | SefariaIndexSefer

export function isCategory(
  entry: SefariaIndexEntry,
): entry is SefariaIndexCategory {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'contents' in entry &&
    Array.isArray((entry as SefariaIndexCategory).contents)
  )
}

// ---------- GET /api/index/{title} ----------
// Index details — contains the structural schema. Sefaria has two main shapes:
// JaggedArrayNode (flat, e.g. Tanakh, Talmud) and SchemaNode with child nodes
// (complex, e.g. Mishneh Torah). We expose both shapes as optional fields.

export type SefariaSchemaNode = {
  title?: string
  heTitle?: string
  key?: string
  nodeType?: string
  depth?: number
  sectionNames?: string[]
  heSectionNames?: string[]
  addressTypes?: string[]
  lengths?: number[]
  nodes?: SefariaSchemaNode[]
}

export type SefariaIndexDetails = {
  title: string
  heTitle: string
  categories?: string[]
  schema: SefariaSchemaNode
  // Some responses surface these at the top level instead of inside schema.
  depth?: number
  sectionNames?: string[]
  heSectionNames?: string[]
  addressTypes?: string[]
  lengths?: number[]
}

// ---------- GET /api/texts/{ref} ----------
// Returns Hebrew and English text for a reference. `text` and `he` can be a
// string, string[], or string[][] depending on the depth of the ref.

export type SefariaTextValue = string | string[] | string[][]

export type SefariaText = {
  ref: string
  heRef: string
  book: string
  sectionRef: string
  text: SefariaTextValue
  he: SefariaTextValue
  next: string | null
  prev: string | null
}
