# Kula

Torah learning tracker — browse, track, and take notes on all major Torah texts.

## Required environment variables

Set these in **Vercel project settings → Environment Variables** for both Production and Preview environments. For local development, create a `.env.local` file (never committed to git).

### Runtime variables (prefixed `VITE_` — available in the browser bundle)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL. Found in Supabase dashboard → Settings → API. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key. Same location as above. |
| `VITE_SENTRY_DSN` | Sentry Data Source Name. Found in Sentry project settings → Client Keys (DSN). Required for error tracking in production. |
| `VITE_VERCEL_ANALYTICS_URL` | Direct URL to your Vercel Analytics dashboard (e.g. `https://vercel.com/your-team/kula/analytics`). Used on the admin status page. |
| `VITE_SENTRY_ISSUES_URL` | Direct URL to your Sentry issues list (e.g. `https://sentry.io/organizations/your-org/issues/?project=your-project`). Used on the admin status page. |

### Build-time variables (consumed during Vercel CI, not shipped to the browser)

| Variable | Description |
|---|---|
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source-map upload. Create one in Sentry → Settings → Auth Tokens. Mark as **sensitive** in Vercel. |
| `SENTRY_ORG` | Sentry organisation slug (the `your-org` part of your Sentry URL). |
| `SENTRY_PROJECT` | Sentry project slug. |

### Automatically injected by Vercel (no action needed)

| Variable | Description |
|---|---|
| `VERCEL_GIT_COMMIT_SHA` | Git commit SHA of the current deployment. Injected by Vercel at build time and re-exposed via `VITE_GIT_SHA` through `vite.config.ts`. |
| `VERCEL_GIT_COMMIT_MESSAGE` | Git commit message. Re-exposed as `VITE_GIT_MESSAGE`. |
| `VERCEL_ENV` | `production`, `preview`, or `development`. Re-exposed as `VITE_APP_ENV`. |

> **Note:** Vercel source-map uploads are only triggered when `SENTRY_AUTH_TOKEN` is present in the build environment. Local builds skip source-map upload automatically.
