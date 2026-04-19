/**
 * PostForm — shared compose/edit surface used by both /posts/new and
 * /posts/:id/edit. Feels like a quiet writing surface: no character count
 * nagging, no social prompts.
 */

import { useState } from 'react'
import { PostPrivacySelector } from './PostPrivacySelector'
import type { PostPrivacy } from '../../services/posts'

type Props = {
  /** Pre-populated values when editing an existing post. */
  initialTitle?: string
  initialBody?: string
  initialPrivacy?: PostPrivacy
  /** The user's posts_page_privacy (caps allowed privacy). */
  postsPagePrivacy: PostPrivacy
  /** True when profile.visibility === 'private'. */
  profileIsPrivate: boolean
  /** Submit button label. */
  submitLabel: string
  isPending: boolean
  error: string | null
  onSubmit: (values: { title: string; body: string; privacy: PostPrivacy }) => void
  onCancel?: () => void
}

const MAX_TITLE = 140
const MAX_BODY = 5000

export function PostForm({
  initialTitle = '',
  initialBody = '',
  initialPrivacy = 'public',
  postsPagePrivacy,
  profileIsPrivate,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [privacy, setPrivacy] = useState<PostPrivacy>(initialPrivacy)

  const bodyLength = body.length
  const canSubmit = body.trim().length > 0 && bodyLength <= MAX_BODY && !isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ title: title.trim(), body: body.trim(), privacy })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Optional title */}
      <div>
        <input
          type="text"
          dir="auto"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          placeholder="Title (optional)"
          className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 font-serif text-2xl text-kula-900 placeholder:text-kula-300 focus:border-kula-400 focus:outline-none dark:text-kula-50 dark:placeholder:text-kula-700"
        />
      </div>

      {/* Body */}
      <div className="relative">
        <textarea
          dir="auto"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder=""
          className="w-full resize-none bg-transparent text-base leading-relaxed text-kula-800 placeholder:text-kula-300 focus:outline-none dark:text-kula-200 dark:placeholder:text-kula-700"
        />
        {/* Character count — only shown when approaching limit */}
        {bodyLength > MAX_BODY * 0.8 && (
          <p className={`mt-1 text-right text-xs ${bodyLength > MAX_BODY ? 'text-red-500' : 'text-kula-400 dark:text-kula-600'}`}>
            {bodyLength}/{MAX_BODY}
          </p>
        )}
      </div>

      {/* Markdown hint */}
      <p className="text-xs text-kula-300 dark:text-kula-700">
        **bold** · *italic* · `code` · {'>'}blockquote
      </p>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Privacy + actions */}
      <div className="space-y-3">
        <PostPrivacySelector
          value={privacy}
          onChange={setPrivacy}
          postsPagePrivacy={postsPagePrivacy}
          profileIsPrivate={profileIsPrivate}
        />

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="text-sm text-kula-400 hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="ml-auto rounded-xl bg-kula-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
          >
            {isPending ? 'Publishing…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
