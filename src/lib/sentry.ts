/**
 * Sentry error-tracking initialisation — Vite + React SPA.
 *
 * Call initSentry() once, before createRoot(), in main.tsx.
 *
 * Environment variables needed (see README "Required environment variables"):
 *   VITE_SENTRY_DSN       — DSN from Sentry project settings (runtime)
 *   SENTRY_AUTH_TOKEN     — upload token for source maps (build-time only)
 *   SENTRY_ORG            — Sentry organisation slug (build-time only)
 *   SENTRY_PROJECT        — Sentry project slug (build-time only)
 *
 * ── Alert rules to configure in Sentry project settings ──────────────────────
 *
 * 1. New-issue alert
 *    Trigger : "A new issue is created"
 *    Action  : Send email to admin address
 *
 * 2. Error-rate spike alert
 *    Trigger : "Number of events is more than 10 in 5 minutes"
 *    Action  : Send email to admin address
 *
 * 3. Ignore ChunkLoadError
 *    These are produced when Vercel deploys a new build while a tab is open.
 *    Already in ignoreErrors below; also create an Inbound Filter rule in
 *    Sentry: Filters → "Discard events with these error messages" →
 *    add "ChunkLoadError".
 *
 * 4. Browser-extension noise is suppressed by denyUrls below.
 *    No additional Sentry filter needed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as Sentry from '@sentry/react'

const PII_KEYS = new Set([
  'body', 'content', 'text', 'bio', 'password', 'token', 'email',
])

/** Recursively redact values whose key matches the PII_KEYS set. */
function scrubPii(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((item) => scrubPii(item, depth + 1))

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = PII_KEYS.has(key.toLowerCase())
      ? '[Filtered]'
      : scrubPii(value, depth + 1)
  }
  return result
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) {
    // DSN not configured — Sentry is disabled (expected in local dev).
    return
  }

  Sentry.init({
    dsn,

    // 'development' locally, 'preview' or 'production' on Vercel.
    // Injected at build time via vite.config.ts define block.
    environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,

    // Set to the Git commit SHA so stack traces link to the exact source.
    // VITE_GIT_SHA is injected from VERCEL_GIT_COMMIT_SHA in vite.config.ts.
    release: (import.meta.env.VITE_GIT_SHA as string | undefined) || undefined,

    integrations: [
      // Automatic browser performance tracing (page loads, navigation, XHR).
      Sentry.browserTracingIntegration(),
      // Session replay is disabled — uncomment to enable:
      // Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],

    // Capture every error in production; leave at 1.0 unless costs become a concern.
    sampleRate: 1.0,

    // 5% of page loads get full performance traces — plenty for slow-query diagnosis.
    tracesSampleRate: 0.05,

    // Session replay disabled for now.
    // replaysSessionSampleRate: 0,
    // replaysOnErrorSampleRate: 0,

    // Never attach PII that Sentry sends by default (IP, user agent, cookies).
    sendDefaultPii: false,

    // Ignore transient deployment-artifact errors; they are not bugs.
    ignoreErrors: [
      'ChunkLoadError',
      /Loading chunk \d+ failed/,
      /Loading CSS chunk \d+ failed/,
    ],

    // Block events originating from browser extensions — they produce noise
    // that has nothing to do with Kula source code.
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^safari-web-extension:\/\//i,
    ],

    beforeSend(event) {
      // ── Strip request body entirely ────────────────────────────────────────
      // Note/post bodies, bio text, and other user content must never appear
      // in Sentry. We delete the data field unconditionally rather than trying
      // to selectively scrub — if it's a request body, we don't want it.
      if (event.request) {
        if (event.request.data !== undefined) {
          event.request.data = '[Filtered]'
        }
        // Strip auth + cookie headers.
        if (event.request.headers) {
          const h = event.request.headers as Record<string, string>
          for (const key of Object.keys(h)) {
            if (['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase())) {
              h[key] = '[Filtered]'
            }
          }
        }
        // Strip query string (may contain tokens in OAuth flows).
        if (event.request.query_string) {
          event.request.query_string = '[Filtered]'
        }
      }

      // ── Scrub PII keys from extra + contexts ───────────────────────────────
      if (event.extra) {
        event.extra = scrubPii(event.extra) as typeof event.extra
      }
      if (event.contexts) {
        event.contexts = scrubPii(event.contexts) as typeof event.contexts
      }

      return event
    },
  })
}
