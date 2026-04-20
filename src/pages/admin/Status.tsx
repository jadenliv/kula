/**
 * /admin/status — infrastructure health and observability links.
 *
 * Admin-only. Shows:
 *   - Last-deployed indicator (git SHA + message, injected at build time)
 *   - Vercel Analytics link
 *   - Vercel Speed Insights link
 *   - Sentry issues dashboard link
 *   - Summary of required environment variables
 */

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAdmin } from '../../lib/adminConfig'

// These are injected at build time by vite.config.ts define block.
// They are empty strings in local dev (no VERCEL_GIT_COMMIT_SHA present).
const GIT_SHA = (import.meta.env.VITE_GIT_SHA as string) || ''
const GIT_MESSAGE = (import.meta.env.VITE_GIT_MESSAGE as string) || ''
const APP_ENV = (import.meta.env.VITE_APP_ENV as string) || 'development'

// ── Env-var configuration ─────────────────────────────────────────────────────
// Set these in Vercel project settings → Environment Variables.
// See README "Required environment variables" for details.
const VERCEL_ANALYTICS_URL =
  (import.meta.env.VITE_VERCEL_ANALYTICS_URL as string | undefined) ||
  'https://vercel.com/dashboard'

const SENTRY_ISSUES_URL =
  (import.meta.env.VITE_SENTRY_ISSUES_URL as string | undefined) ||
  'https://sentry.io/organizations/'

export default function AdminStatus() {
  const { user } = useAuth()

  if (!isAdmin(user?.id)) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-sm text-kula-500 dark:text-kula-400">
          You don't have permission to view this page.{' '}
          <Link to="/today" className="text-kula-600 underline-offset-2 hover:underline dark:text-kula-300">
            Go home →
          </Link>
        </p>
      </div>
    )
  }

  return <StatusPage />
}

function StatusPage() {
  const shortSha = GIT_SHA ? GIT_SHA.slice(0, 7) : null

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-kula-900 dark:text-kula-50">
          Status
        </h1>
        <p className="mt-1 text-sm text-kula-500 dark:text-kula-400">
          Infrastructure observability for Kula. Admin only.
        </p>
      </div>

      {/* Last deployed */}
      <Section title="Last deployment">
        {shortSha ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-kula-500/10 px-2 py-0.5 font-mono text-xs font-medium text-kula-700 dark:bg-kula-400/10 dark:text-kula-300">
                {shortSha}
              </span>
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                {APP_ENV}
              </span>
            </div>
            {GIT_MESSAGE && (
              <p className="text-sm text-kula-700 dark:text-kula-300">
                {GIT_MESSAGE}
              </p>
            )}
            <p className="text-xs text-kula-400 dark:text-kula-600">
              Full SHA: <span className="font-mono">{GIT_SHA}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-kula-400 dark:text-kula-600">
            Running in local development — no deployment SHA available.
          </p>
        )}
      </Section>

      {/* Vercel Analytics */}
      <Section title="Vercel Analytics">
        <p className="mb-3 text-sm text-kula-600 dark:text-kula-400">
          Page views, custom events (sign-ups, notes, follows, etc.), and audience data.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ExternalLink href={VERCEL_ANALYTICS_URL} label="Open Analytics dashboard →" />
          <ExternalLink
            href={`${VERCEL_ANALYTICS_URL}?tab=custom-events`}
            label="Custom events →"
          />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-kula-500">
            Instrumented events
          </p>
          <ul className="space-y-1 text-xs text-kula-600 dark:text-kula-400">
            {[
              'sign_up_completed',
              'onboarding_completed — props: steps_skipped',
              'sefer_added_active — props: sefer_name',
              'section_marked_learned — props: sefer_name, section_reference',
              'note_created — props: privacy_level',
              'post_created — props: privacy_level',
              'follow_created — props: target_profile_visibility',
              'report_submitted — props: target_type',
            ].map((e) => (
              <li key={e} className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kula-400" />
                <span className="font-mono">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Vercel Speed Insights */}
      <Section title="Vercel Speed Insights">
        <p className="mb-3 text-sm text-kula-600 dark:text-kula-400">
          Core Web Vitals: LCP, FID, CLS, TTFB, FCP. Aggregated by page and device.
        </p>
        <ExternalLink
          href={`${VERCEL_ANALYTICS_URL}?tab=speed-insights`}
          label="Open Speed Insights →"
        />
      </Section>

      {/* Sentry */}
      <Section title="Sentry error tracking">
        <p className="mb-3 text-sm text-kula-600 dark:text-kula-400">
          Runtime errors and unhandled exceptions. PII scrubbing is configured —
          request bodies, auth headers, and keys matching{' '}
          <span className="font-mono text-xs">body / content / text / bio / password / token / email</span>
          {' '}are stripped before events are sent.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ExternalLink href={SENTRY_ISSUES_URL} label="Open Sentry issues →" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-kula-600 dark:text-kula-400">
          <ConfigRow label="Error sample rate" value="100%" />
          <ConfigRow label="Tracing sample rate" value="5%" />
          <ConfigRow label="Session replay" value="Disabled" />
          <ConfigRow label="sendDefaultPii" value="false" />
          <ConfigRow label="ChunkLoadError" value="Ignored (deployment artifact)" />
          <ConfigRow label="Browser extensions" value="Blocked via denyUrls" />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-kula-500">
            Error boundaries
          </p>
          <ul className="space-y-1 text-xs text-kula-600 dark:text-kula-400">
            {[
              'Root layout (App.tsx) — catches all unhandled React errors',
              'Feed page — high-traffic social surface',
              'Post composer (NewPost) — user-generated content flow',
              'Notes panel (Reader) — note editor drawer',
            ].map((b) => (
              <li key={b} className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kula-400" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Environment variables */}
      <Section title="Environment variables">
        <p className="mb-3 text-sm text-kula-600 dark:text-kula-400">
          Required in Vercel project settings → Environment Variables (Production + Preview).
          See README for descriptions.
        </p>
        <div className="space-y-2">
          {[
            { name: 'VITE_SENTRY_DSN', set: Boolean(import.meta.env.VITE_SENTRY_DSN) },
            { name: 'VITE_VERCEL_ANALYTICS_URL', set: Boolean(import.meta.env.VITE_VERCEL_ANALYTICS_URL) },
            { name: 'VITE_SENTRY_ISSUES_URL', set: Boolean(import.meta.env.VITE_SENTRY_ISSUES_URL) },
            { name: 'SENTRY_AUTH_TOKEN', set: null },
            { name: 'SENTRY_ORG', set: null },
            { name: 'SENTRY_PROJECT', set: null },
          ].map(({ name, set }) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="font-mono text-xs text-kula-700 dark:text-kula-300">{name}</span>
              <span className={`text-xs font-medium ${
                set === null
                  ? 'text-kula-400 dark:text-kula-600'
                  : set
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {set === null ? 'build-time' : set ? '✓ set' : '⚠ missing'}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-kula-400 dark:text-kula-600">
          Build-time vars are consumed during Vercel CI and are not visible in the browser.
        </p>
      </Section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-kula-400 dark:text-kula-600">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-kula-600 transition-colors hover:border-kula-400 hover:text-kula-800 dark:text-kula-400 dark:hover:border-kula-500 dark:hover:text-kula-200"
    >
      {label}
    </a>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-kula-500 dark:text-kula-500">{label}</span>
      <span className="font-medium text-kula-700 dark:text-kula-300">{value}</span>
    </div>
  )
}
