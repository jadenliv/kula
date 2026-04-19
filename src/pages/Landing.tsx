import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setTitle } from '../lib/seo'

// ── Screenshot config ─────────────────────────────────────────────────────────
// Drop real screenshots into /public/screenshots/ to replace the placeholders.

const SCREENSHOTS = {
  today:    '/screenshots/today.png',
  browse:   '/screenshots/browse.png',
  notebook: '/screenshots/notebook.png',
} as const

// ── Landing page ──────────────────────────────────────────────────────────────

export default function Landing() {
  // Respect the stored theme preference (same key as AppShell uses).
  useEffect(() => {
    const stored = localStorage.getItem('kula-theme')
    if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    setTitle()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-kula-900 dark:text-kula-50">
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ScreenshotsSection />
      </main>
      <LandingFooter />
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--app-bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <span className="font-['Heebo'] text-lg font-semibold tracking-tight text-kula-800 dark:text-kula-100">
            כולה
          </span>
          <span className="text-xs text-kula-300 dark:text-kula-700">|</span>
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-kula-700 dark:text-kula-300">
            Kula
          </span>
        </div>

        {/* Auth CTAs */}
        <div className="flex items-center gap-2">
          <Link
            to="/signin"
            className="rounded-xl px-4 py-1.5 text-sm font-medium text-kula-600 transition-colors hover:text-kula-800 dark:text-kula-400 dark:hover:text-kula-200"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-kula-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-20 text-center md:pb-32 md:pt-32">
      {/* Hebrew sub-mark */}
      <p className="mb-6 font-['Heebo'] text-2xl font-medium tracking-tight text-kula-500 dark:text-kula-500">
        כולה
      </p>

      {/* Main headline */}
      <h1 className="font-serif text-5xl leading-tight tracking-tight text-kula-900 dark:text-kula-50 md:text-7xl">
        A companion for your learning.
      </h1>

      {/* Description */}
      <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-kula-600 dark:text-kula-400">
        Track the sefarim you're learning, keep a notebook, and share Torah
        with people you trust.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/signup"
          className="w-full rounded-xl bg-kula-700 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300 sm:w-auto"
        >
          Create a free account
        </Link>
        <Link
          to="/signin"
          className="w-full rounded-xl border border-[var(--border)] px-8 py-3 text-sm font-semibold text-kula-700 transition-colors hover:border-kula-400 hover:text-kula-800 dark:text-kula-300 dark:hover:border-kula-500 dark:hover:text-kula-100 sm:w-auto"
        >
          Sign in
        </Link>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    heading: 'Track your learning',
    body: 'Mark sections of sefarim as you learn them, across Tanakh, Shas, Rambam, Shulchan Arukh, and more.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 2v3M16 2v3" />
      </svg>
    ),
  },
  {
    heading: 'Keep a notebook',
    body: 'Save notes and chiddushim tied to the place in the text where you wrote them. Everything stays with the source.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    heading: 'Share with your circle',
    body: "Follow friends, see what they\u2019re learning, and share Torah thoughts publicly or with just the people you trust.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <circle cx="19" cy="7" r="3" />
        <path d="M23 21v-2a3 3 0 00-2-2.83" />
      </svg>
    ),
  },
]

function FeaturesSection() {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <h2 className="mb-12 text-center font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50 md:text-4xl">
          What is Kula?
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.heading} className="space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-kula-500 dark:text-kula-400">
                {f.icon}
              </div>
              <h3 className="font-serif text-xl text-kula-900 dark:text-kula-100">
                {f.heading}
              </h3>
              <p className="text-sm leading-relaxed text-kula-600 dark:text-kula-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Screenshots ───────────────────────────────────────────────────────────────

const SCREENSHOT_DATA = [
  { key: 'today' as const,    label: 'Today',    url: 'getkula.app/today' },
  { key: 'browse' as const,   label: 'Browse',   url: 'getkula.app/browse' },
  { key: 'notebook' as const, label: 'Notebook', url: 'getkula.app/notebook' },
]

function ScreenshotsSection() {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <h2 className="mb-12 text-center font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50 md:text-4xl">
          Designed for focus
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {SCREENSHOT_DATA.map((s) => (
            <ScreenshotFrame
              key={s.key}
              src={SCREENSHOTS[s.key]}
              label={s.label}
              url={s.url}
            />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-kula-400 dark:text-kula-600">
          Clean, focused interface. No noise.
        </p>
      </div>
    </section>
  )
}

function ScreenshotFrame({ src, label, url }: { src: string; label: string; url: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
      {/* Fake browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-kula-800/40 dark:bg-kula-700/60" />
        <span className="h-2 w-2 rounded-full bg-kula-800/40 dark:bg-kula-700/60" />
        <span className="h-2 w-2 rounded-full bg-kula-800/40 dark:bg-kula-700/60" />
        <span className="ml-1.5 flex-1 truncate rounded-md bg-[var(--surface-overlay)] px-2 py-0.5 text-[10px] text-kula-500 dark:text-kula-600">
          {url}
        </span>
      </div>

      {/* Image or placeholder */}
      {!failed ? (
        <img
          src={src}
          alt={`Kula ${label} page`}
          onError={() => setFailed(true)}
          className="w-full"
          loading="lazy"
        />
      ) : (
        // Placeholder shown until real screenshots are dropped into /public/screenshots/
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-[var(--surface)]">
          <p className="font-serif text-lg text-kula-400 dark:text-kula-600">{label}</p>
          <p className="text-xs text-kula-300 dark:text-kula-700">Screenshot coming soon</p>
        </div>
      )}
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

const FOOTER_LINKS = [
  { to: '/about',   label: 'About' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms',   label: 'Terms of Service' },
  { to: '/contact', label: 'Contact' },
]

function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-2">
            <span className="font-['Heebo'] text-sm font-semibold text-kula-700 dark:text-kula-400">
              כולה
            </span>
            <span className="text-xs text-kula-300 dark:text-kula-700">|</span>
            <span className="font-sans text-xs font-semibold uppercase tracking-widest text-kula-600 dark:text-kula-500">
              Kula
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs text-kula-500 transition-colors hover:text-kula-700 dark:text-kula-600 dark:hover:text-kula-400"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
