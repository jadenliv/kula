import { CatalogTree } from '../components/texts/CatalogTree'
import { CustomSeferSection } from '../components/texts/CustomSeferSection'

export default function Browse() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 md:space-y-6">
      <div>
        <h2 className="font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50 md:text-3xl">
          Browse
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Check off sections as you learn them. Hover a title and click Range… to mark many at once.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 md:p-4">
        <CatalogTree />
      </div>
      <CustomSeferSection />
    </div>
  )
}
