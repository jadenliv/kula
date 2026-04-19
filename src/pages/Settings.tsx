import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOwnProfile, useUpdateProfile } from '../hooks/useProfile'
import { isUsernameAvailable } from '../services/profiles'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import LearningSettings from './settings/Learning'
import type { Profile, ProfileUpdate } from '../services/profiles'

type Tab = 'profile' | 'learning' | 'privacy' | 'account'

const USERNAME_RE = /^[a-z0-9_]{3,30}$/

export default function Settings() {
  const { data: profile, isLoading } = useOwnProfile()
  const [tab, setTab] = useState<Tab>('profile')

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-sm text-kula-400">Profile not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
          Settings
        </h2>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Manage your profile and account preferences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        {(['profile', 'learning', 'privacy', 'account'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-[var(--surface)] text-kula-700 shadow-sm dark:text-kula-200'
                : 'text-kula-500 hover:text-kula-700 dark:text-kula-500 dark:hover:text-kula-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab profile={profile} />}
      {tab === 'learning' && <LearningSettings />}
      {tab === 'privacy' && <PrivacyTab profile={profile} />}
      {tab === 'account' && <AccountTab />}
    </div>
  )
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Derived dirty state so we only show Save when something changed
  const isDirty =
    displayName !== profile.display_name ||
    username !== profile.username ||
    bio !== profile.bio

  // Validate username format on change
  useEffect(() => {
    if (username === profile.username) {
      setUsernameError(null)
      return
    }
    if (!USERNAME_RE.test(username)) {
      setUsernameError(
        'Usernames must be 3–30 characters: lowercase letters, numbers, and underscores only.',
      )
    } else {
      setUsernameError(null)
    }
  }, [username, profile.username])

  const handleSave = async () => {
    // Validate
    if (!displayName.trim()) return
    if (usernameError) return

    // Check username availability if it changed
    if (username !== profile.username) {
      setCheckingUsername(true)
      try {
        const available = await isUsernameAvailable(username, profile.id)
        if (!available) {
          setUsernameError('That username is already taken.')
          return
        }
      } catch {
        setUsernameError('Could not verify username. Try again.')
        return
      } finally {
        setCheckingUsername(false)
      }
    }

    const updates: ProfileUpdate = {}
    if (displayName !== profile.display_name) updates.display_name = displayName.trim()
    if (username !== profile.username) updates.username = username
    if (bio !== profile.bio) updates.bio = bio.trim()

    update.mutate(updates, {
      onSuccess: () => showToast('Profile saved.'),
      onError: (err) =>
        showToast(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`),
    })
  }

  return (
    <div className="space-y-5">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <Avatar profile={{ ...profile, display_name: displayName, username }} size="lg" />
        <div>
          <p className="text-sm font-medium text-kula-700 dark:text-kula-300">
            {displayName || username}
          </p>
          <p className="text-xs text-kula-400 dark:text-kula-600">@{username}</p>
          <p className="mt-1 text-xs text-kula-400 dark:text-kula-600">
            Avatar generated from your username
          </p>
        </div>
      </div>

      <Field label="Display name">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100"
        />
      </Field>

      <Field label="Username" error={usernameError}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-kula-400">
            @
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            maxLength={30}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-7 pr-3 text-sm text-kula-900 placeholder:text-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100"
          />
        </div>
        <p className="mt-1 text-xs text-kula-400 dark:text-kula-600">
          Your public URL will be /u/{username}
        </p>
      </Field>

      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="A bit about yourself…"
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-900 placeholder:text-kula-400 transition-colors focus:border-kula-400 focus:outline-none dark:text-kula-100"
        />
        <p className="mt-1 text-right text-xs text-kula-400 dark:text-kula-600">
          {bio.length}/280
        </p>
      </Field>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || update.isPending || checkingUsername || !!usernameError}
          className="rounded-xl bg-kula-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          {update.isPending || checkingUsername ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" /> Saving…
            </span>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  )
}

// ── Privacy tab ───────────────────────────────────────────────────────────────

function PrivacyTab({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const { showToast } = useToast()

  const [visibility, setVisibility] = useState(profile.visibility)
  const [shareActivity, setShareActivity] = useState(profile.share_activity)
  const [shareNotes, setShareNotes] = useState(profile.share_notes)
  const [postsPagePrivacy, setPostsPagePrivacy] = useState(profile.posts_page_privacy ?? 'public')
  const [sharePosts, setSharePosts] = useState(profile.share_posts ?? 'public')

  const isDirty =
    visibility !== profile.visibility ||
    shareActivity !== profile.share_activity ||
    shareNotes !== profile.share_notes ||
    postsPagePrivacy !== (profile.posts_page_privacy ?? 'public') ||
    sharePosts !== (profile.share_posts ?? 'public')

  const handleSave = () => {
    const updates: ProfileUpdate = {}
    if (visibility !== profile.visibility) updates.visibility = visibility
    if (shareActivity !== profile.share_activity) updates.share_activity = shareActivity
    if (shareNotes !== profile.share_notes) updates.share_notes = shareNotes
    if (postsPagePrivacy !== (profile.posts_page_privacy ?? 'public')) updates.posts_page_privacy = postsPagePrivacy as Profile['posts_page_privacy']
    if (sharePosts !== (profile.share_posts ?? 'public')) updates.share_posts = sharePosts as Profile['share_posts']

    update.mutate(updates, {
      onSuccess: () => showToast('Privacy settings saved.'),
      onError: () => showToast('Failed to save settings.'),
    })
  }

  return (
    <div className="space-y-6">
      <Field
        label="Profile visibility"
        hint="Private profiles show only your name and bio to other users."
      >
        <RadioGroup
          value={visibility}
          onChange={(v) => setVisibility(v as Profile['visibility'])}
          options={[
            { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
            { value: 'private', label: 'Private', description: 'Only you can see your full profile' },
          ]}
        />
      </Field>

      <Field
        label="Learning activity"
        hint="Controls who can see what you're currently learning."
      >
        <RadioGroup
          value={shareActivity}
          onChange={(v) => setShareActivity(v as Profile['share_activity'])}
          options={[
            { value: 'public', label: 'Public', description: 'Anyone can see your progress' },
            { value: 'followers', label: 'Followers', description: 'Only people you approve (coming soon)' },
            { value: 'private', label: 'Private', description: 'Only you can see your progress' },
          ]}
        />
      </Field>

      <Field
        label="Notes default visibility"
        hint={
          visibility === 'private'
            ? 'New notes default to this level. Note: your profile is private, so public notes are blocked — "public" on any note is treated as followers-only.'
            : 'Sets the default privacy for new notes. You can change it per note when writing.'
        }
      >
        <RadioGroup
          value={shareNotes}
          onChange={(v) => setShareNotes(v as Profile['share_notes'])}
          options={[
            { value: 'public', label: 'Public', description: visibility === 'private' ? 'Treated as followers-only while your profile is private' : 'Anyone can read your notes' },
            { value: 'followers', label: 'Followers', description: 'Only people you approve (coming soon)' },
            { value: 'private', label: 'Private', description: 'Only you can see your notes' },
          ]}
        />
      </Field>

      <Field
        label="Posts page visibility"
        hint="Controls who can see your Posts section on your profile. Individual posts can be more restrictive than this, but not less."
      >
        <RadioGroup
          value={postsPagePrivacy}
          onChange={(v) => setPostsPagePrivacy(v as Profile['posts_page_privacy'])}
          options={[
            { value: 'public', label: 'Public', description: 'Anyone can see your Posts section' },
            { value: 'followers', label: 'Followers', description: 'Only your followers can see your posts (coming soon)' },
            { value: 'private', label: 'Private', description: 'Only you can see your posts' },
          ]}
        />
      </Field>

      <Field
        label="Posts default visibility"
        hint="Sets the default privacy for new posts. You can change it per post when writing."
      >
        <RadioGroup
          value={sharePosts}
          onChange={(v) => setSharePosts(v as Profile['share_posts'])}
          options={[
            { value: 'public', label: 'Public', description: 'New posts default to public' },
            { value: 'followers', label: 'Followers', description: 'New posts default to followers-only' },
            { value: 'private', label: 'Private', description: 'New posts default to private' },
          ]}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || update.isPending}
          className="rounded-xl bg-kula-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kula-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
        >
          {update.isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" /> Saving…
            </span>
          ) : (
            'Save settings'
          )}
        </button>
      </div>

      {/* Follow management */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-1 text-sm font-medium text-kula-700 dark:text-kula-300">
          Followers
        </h3>
        <p className="mb-3 text-xs text-kula-500 dark:text-kula-400">
          Review pending follow requests and manage who follows you.
        </p>
        <Link
          to="/settings/followers"
          className="inline-block rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-800 dark:text-kula-400 dark:hover:text-kula-200"
        >
          Manage followers →
        </Link>
      </div>
    </div>
  )
}

// ── Account tab ───────────────────────────────────────────────────────────────

function AccountTab() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  return (
    <div className="space-y-6">
      <Field label="Email address">
        <input
          type="email"
          value={user?.email ?? ''}
          readOnly
          className="w-full cursor-default rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-kula-500 dark:text-kula-500"
        />
        <p className="mt-1 text-xs text-kula-400 dark:text-kula-600">
          Email changes are not supported yet.
        </p>
      </Field>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-1 text-sm font-medium text-kula-700 dark:text-kula-300">
          Sign out
        </h3>
        <p className="mb-3 text-xs text-kula-500 dark:text-kula-400">
          You'll be returned to the sign-in page.
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-800 dark:text-kula-400 dark:hover:text-kula-200"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string | React.ReactNode
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-kula-700 dark:text-kula-300">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-kula-400 dark:text-kula-600">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; description: string }[]
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
            value === opt.value
              ? 'border-kula-400 bg-kula-500/5 dark:border-kula-500 dark:bg-kula-400/5'
              : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-kula-300 dark:hover:border-kula-600'
          }`}
        >
          <input
            type="radio"
            name={`radio-${opt.value}`}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-0.5 accent-kula-600 dark:accent-kula-400"
          />
          <div>
            <p className="text-sm font-medium text-kula-700 dark:text-kula-300">{opt.label}</p>
            <p className="text-xs text-kula-400 dark:text-kula-600">{opt.description}</p>
          </div>
        </label>
      ))}
    </div>
  )
}
