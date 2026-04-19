/**
 * MarkdownBody — renders a safe subset of Markdown for post bodies.
 *
 * Supported syntax:
 *   **bold**       → <strong>
 *   *italic*       → <em>
 *   _italic_       → <em>
 *   `code`         → <code>
 *   > blockquote   → <blockquote>
 *   blank line     → paragraph break
 *   single newline → <br> within a paragraph
 *
 * Safety: HTML is escaped before any pattern is applied, so user content
 * can never inject raw HTML. Only our known patterns produce tags.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applyInline(escaped: string): string {
  return escaped
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *italic* (not preceded by another *)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // _italic_
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
    // `code`
    .replace(/`(.+?)`/g, '<code class="rounded bg-kula-500/10 px-1 py-0.5 font-mono text-sm text-kula-700 dark:bg-kula-400/10 dark:text-kula-300">$1</code>')
}

function renderBlock(lines: string[]): string {
  // Blockquote: all lines start with >
  if (lines.every((l) => l.startsWith('>'))) {
    const inner = lines
      .map((l) => applyInline(escapeHtml(l.replace(/^>\s?/, ''))))
      .join('<br>')
    return `<blockquote>${inner}</blockquote>`
  }
  // Regular paragraph
  const html = lines.map((l) => applyInline(escapeHtml(l))).join('<br>')
  return `<p>${html}</p>`
}

function renderMarkdown(body: string): string {
  // Split into blocks by blank lines
  const rawBlocks = body.split(/\n{2,}/)
  return rawBlocks
    .map((block) => renderBlock(block.split('\n')))
    .join('')
}

type Props = {
  body: string
  className?: string
}

export function MarkdownBody({ body, className = '' }: Props) {
  const html = renderMarkdown(body)

  return (
    <div
      // Safe: all HTML is escaped before pattern substitution
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      dir="auto"
      className={`prose-post ${className}`}
    />
  )
}
