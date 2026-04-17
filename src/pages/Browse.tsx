import { CatalogTree } from '../components/texts/CatalogTree'

export default function Browse() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-serif text-3xl tracking-tight">Browse</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Check off sections as you learn them. Click any title to open it in
          Sefaria.
        </p>
      </div>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
        <CatalogTree />
      </div>
    </div>
  )
}
