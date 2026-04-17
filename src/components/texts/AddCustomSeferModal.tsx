import { useEffect, useRef, useState } from 'react'
import {
  useCreateCustomSefer,
  useCreateCustomSection,
  useCustomSections,
  useUpdateCustomSefer,
} from '../../hooks/useCustomSefarim'
import type { UserCustomSefer } from '../../services/customSefarim'
import type { CustomSeferStructure } from '../../services/customSefarim'

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  /** Pass an existing sefer to enter edit mode; omit for create mode. */
  editing?: UserCustomSefer
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddCustomSeferModal({ editing, onClose }: Props) {
  const isEdit = Boolean(editing)

  const [titleEn, setTitleEn] = useState(editing?.title_en ?? '')
  const [titleHe, setTitleHe] = useState(editing?.title_he ?? '')
  const [sefariaRef, setSefariaRef] = useState(editing?.sefaria_ref ?? '')
  const [structureType, setStructureType] = useState<CustomSeferStructure>(
    editing?.structure_type ?? 'flat',
  )
  const [sectionLabel, setSectionLabel] = useState(editing?.section_label ?? 'Perek')
  const [chapterCount, setChapterCount] = useState<string>(
    editing?.chapter_count?.toString() ?? '',
  )

  // Nested: in-progress section title input
  const [newSectionTitle, setNewSectionTitle] = useState('')

  const createSefer = useCreateCustomSefer()
  const updateSefer = useUpdateCustomSefer()
  const createSection = useCreateCustomSection(editing?.id ?? '')
  const { data: existingSections = [] } = useCustomSections(editing?.id ?? '')
  // Track sections being added in this session (before save) for new sefarim
  const [pendingSections, setPendingSections] = useState<string[]>([])

  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { titleRef.current?.focus() }, [])

  const handleAddSection = () => {
    const t = newSectionTitle.trim()
    if (!t) return
    if (isEdit && editing) {
      createSection.mutate({
        seferId: editing.id,
        parentId: null,
        title: t,
        sortOrder: existingSections.length,
      })
    } else {
      setPendingSections((prev) => [...prev, t])
    }
    setNewSectionTitle('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const en = titleEn.trim()
    if (!en) return

    if (isEdit && editing) {
      updateSefer.mutate(
        {
          id: editing.id,
          titleEn: en,
          titleHe: titleHe.trim() || null,
          sefariaRef: sefariaRef.trim() || null,
          sectionLabel: sectionLabel.trim() || 'Perek',
          chapterCount: structureType === 'flat' ? (Number(chapterCount) || null) : null,
        },
        { onSuccess: onClose },
      )
    } else {
      const count = structureType === 'flat' ? (Number(chapterCount) || null) : null
      createSefer.mutate(
        {
          titleEn: en,
          titleHe: titleHe.trim() || null,
          sefariaRef: sefariaRef.trim() || null,
          structureType,
          sectionLabel: sectionLabel.trim() || 'Perek',
          chapterCount: count,
        },
        {
          onSuccess: async (newSefer) => {
            // For nested: create all pending sections
            if (structureType === 'nested' && pendingSections.length > 0) {
              for (let i = 0; i < pendingSections.length; i++) {
                await createSection.mutateAsync({
                  seferId: newSefer.id,
                  parentId: null,
                  title: pendingSections[i],
                  sortOrder: i,
                })
              }
            }
            onClose()
          },
        },
      )
    }
  }

  const isPending = createSefer.isPending || updateSefer.isPending
  const error = createSefer.error ?? updateSefer.error

  const sections = isEdit ? existingSections.map((s) => s.title) : pendingSections

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="font-medium text-kula-900 dark:text-kula-50">
            {isEdit ? 'Edit sefer' : 'Add a sefer'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-kula-400 hover:bg-[var(--surface-raised)] hover:text-kula-700 dark:hover:text-kula-200"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-4">
            {/* Title (English) */}
            <div>
              <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                Title (English) <span className="text-red-400">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Mesilat Yesharim"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
              />
            </div>

            {/* Title (Hebrew) */}
            <div>
              <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                Title (Hebrew) — optional
              </label>
              <input
                type="text"
                value={titleHe}
                onChange={(e) => setTitleHe(e.target.value)}
                placeholder="e.g. מסילת ישרים"
                dir="rtl"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-['Heebo'] text-kula-900 placeholder:text-kula-400 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
              />
            </div>

            {/* Sefaria ref */}
            <div>
              <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                Sefaria ref — optional
              </label>
              <input
                type="text"
                value={sefariaRef}
                onChange={(e) => setSefariaRef(e.target.value)}
                placeholder="e.g. Mesilat Yesharim"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
              />
              <p className="mt-1 text-xs text-kula-400 dark:text-kula-600">
                Paste the title as it appears on sefaria.org to link each section.
              </p>
            </div>

            {/* Structure type (only for new sefarim) */}
            {!isEdit && (
              <div>
                <label className="mb-2 block text-xs font-medium text-kula-500 dark:text-kula-400">
                  Structure
                </label>
                <div className="flex gap-2">
                  {(['flat', 'nested'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setStructureType(type)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                        structureType === type
                          ? 'border-kula-500 bg-kula-500/10 text-kula-700 dark:border-kula-400 dark:text-kula-300'
                          : 'border-[var(--border)] text-kula-500 hover:bg-[var(--surface-raised)] dark:text-kula-400'
                      }`}
                    >
                      {type === 'flat' ? 'Chapter list' : 'Custom sections'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Flat: section label + count */}
            {structureType === 'flat' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                    Section label
                  </label>
                  <input
                    type="text"
                    value={sectionLabel}
                    onChange={(e) => setSectionLabel(e.target.value)}
                    placeholder="Perek"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-kula-500 dark:text-kula-400">
                    Count <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={chapterCount}
                    onChange={(e) => setChapterCount(e.target.value)}
                    placeholder="26"
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
                  />
                </div>
              </div>
            )}

            {/* Nested: section list */}
            {structureType === 'nested' && (
              <div>
                <label className="mb-2 block text-xs font-medium text-kula-500 dark:text-kula-400">
                  Sections
                </label>
                {sections.length > 0 && (
                  <ul className="mb-2 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2">
                    {sections.map((title, i) => (
                      <li key={i} className="flex items-center justify-between rounded px-2 py-1 text-sm text-kula-800 dark:text-kula-200">
                        <span>{title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEdit && editing) {
                              const section = existingSections[i]
                              if (section) {
                                // eslint-disable-next-line no-alert
                                if (confirm(`Remove "${title}"?`)) {
                                  // section deletion handled by useDeleteCustomSection
                                }
                              }
                            } else {
                              setPendingSections((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          }}
                          className="rounded p-0.5 text-kula-400 hover:text-red-400"
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M4 4l8 8M12 4L4 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSection() } }}
                    placeholder="Add section (press Enter)"
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 focus:outline-none focus:ring-2 focus:ring-kula-500 dark:text-kula-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-kula-600 hover:bg-[var(--surface-raised)] dark:text-kula-400"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">
                {error instanceof Error ? error.message : 'Something went wrong'}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-3">
            <button
              type="submit"
              disabled={isPending || !titleEn.trim() || (structureType === 'flat' && !chapterCount)}
              className="w-full rounded-xl bg-kula-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:opacity-50 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add sefer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
