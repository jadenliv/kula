import type { PostPrivacy } from '../../services/posts'

export const POST_PRIVACY_LABELS: Record<PostPrivacy, string> = {
  private: 'Private',
  followers: 'Followers',
  public: 'Public',
}

export const POST_PRIVACY_DESCRIPTIONS: Record<PostPrivacy, string> = {
  private: 'Only you can see this post.',
  followers: 'You and your followers can see this post.',
  public: 'Anyone can see this post.',
}

const PRIVACY_LEVEL: Record<PostPrivacy, number> = {
  public: 0,
  followers: 1,
  private: 2,
}

type Props = {
  value: PostPrivacy
  onChange: (v: PostPrivacy) => void
  /** Viewer's posts_page_privacy — post can't be less restrictive than this. */
  postsPagePrivacy: PostPrivacy
  /** True when the user's profile.visibility === 'private'. */
  profileIsPrivate: boolean
}

export function PostPrivacySelector({
  value,
  onChange,
  postsPagePrivacy,
  profileIsPrivate,
}: Props) {
  function isDisabled(opt: PostPrivacy): boolean {
    if (opt === 'public' && profileIsPrivate) return true
    return PRIVACY_LEVEL[opt] < PRIVACY_LEVEL[postsPagePrivacy]
  }

  function disabledTitle(opt: PostPrivacy): string | undefined {
    if (opt === 'public' && profileIsPrivate) {
      return 'Your profile is private — posts cannot be public.'
    }
    if (PRIVACY_LEVEL[opt] < PRIVACY_LEVEL[postsPagePrivacy]) {
      return `Your Posts page is set to "${postsPagePrivacy}", so posts cannot be less restrictive.`
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {(['private', 'followers', 'public'] as PostPrivacy[]).map((opt) => {
          const disabled = isDisabled(opt)
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              title={disabledTitle(opt)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                value === opt
                  ? 'bg-kula-600/15 text-kula-700 dark:bg-kula-400/15 dark:text-kula-300'
                  : 'text-kula-400 hover:bg-[var(--surface-overlay)] hover:text-kula-600 dark:text-kula-600 dark:hover:text-kula-400'
              }`}
            >
              <PrivacyDot privacy={opt} active={value === opt} />
              {POST_PRIVACY_LABELS[opt]}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-kula-400 dark:text-kula-600">
        {POST_PRIVACY_DESCRIPTIONS[value]}
        {value === 'public' && profileIsPrivate && (
          <span className="ml-1 text-amber-500 dark:text-amber-400">
            Your profile is private, so this is effectively followers-only.
          </span>
        )}
      </p>
    </div>
  )
}

function PrivacyDot({ privacy, active }: { privacy: PostPrivacy; active: boolean }) {
  if (privacy === 'private') {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor"
        strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 016 0v2" />
      </svg>
    )
  }
  if (privacy === 'followers') {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor"
        strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2" />
        <path d="M2 13c0-2.21 1.79-4 4-4s4 1.79 4 4" />
        <circle cx="12" cy="5" r="1.5" />
        <path d="M14 13c0-1.66-1-3-2.5-3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2c-1.5 2-2.5 3.8-2.5 6s1 4 2.5 6M8 2c1.5 2 2.5 3.8 2.5 6S9.5 12 8 14M2 8h12" />
    </svg>
  )
}
