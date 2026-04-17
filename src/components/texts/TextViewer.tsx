import { Link } from 'react-router-dom'
import type { SefariaText, SefariaTextValue } from '../../types/sefaria'

type Props = {
  data: SefariaText
}

// Sefaria returns `text` and `he` as string | string[] | string[][] depending
// on the depth of the ref. We normalize to a flat string[] of lines so the
// viewer can render one pasuk/line per row.
function toLines(value: SefariaTextValue): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) {
    if (value.length === 0) return []
    if (typeof value[0] === 'string') return value as string[]
    return (value as string[][]).flat()
  }
  return []
}

export function TextViewer({ data }: Props) {
  const enLines = toLines(data.text)
  const heLines = toLines(data.he)
  const maxLen = Math.max(enLines.length, heLines.length)

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Hebrew — RTL, serif */}
        <div
          dir="rtl"
          className="space-y-3 font-serif text-xl leading-relaxed text-neutral-100"
        >
          {Array.from({ length: maxLen }).map((_, i) => (
            <p key={`he-${i}`} className="flex gap-3">
              <span className="shrink-0 select-none text-sm text-neutral-600">
                {i + 1}
              </span>
              {/*
                Sefaria returns HTML-formatted text (italics, footnote tags,
                superscript verse numbers). We render it directly — content is
                from a trusted source and there is no user input mixed in.
              */}
              <span
                dangerouslySetInnerHTML={{ __html: heLines[i] ?? '' }}
              />
            </p>
          ))}
        </div>

        {/* English — LTR, sans-serif */}
        <div className="space-y-3 text-base leading-relaxed text-neutral-300">
          {Array.from({ length: maxLen }).map((_, i) => (
            <p key={`en-${i}`} className="flex gap-3">
              <span className="shrink-0 select-none text-sm text-neutral-600">
                {i + 1}
              </span>
              <span
                dangerouslySetInnerHTML={{ __html: enLines[i] ?? '' }}
              />
            </p>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-neutral-800 pt-4 text-sm">
        {data.prev ? (
          <Link
            to={`/read/${encodeURIComponent(data.prev)}`}
            className="text-amber-400 hover:underline"
          >
            ← {data.prev}
          </Link>
        ) : (
          <span />
        )}
        {data.next ? (
          <Link
            to={`/read/${encodeURIComponent(data.next)}`}
            className="text-amber-400 hover:underline"
          >
            {data.next} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
