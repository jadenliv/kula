import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // Sentry source-map upload plugin.
    // Runs only when SENTRY_AUTH_TOKEN is present (i.e. in Vercel CI builds).
    // Source maps are generated, uploaded to Sentry, then deleted from the
    // dist/ folder so they are never served publicly.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              // After uploading, remove .map files so they are not public.
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
            telemetry: false,
          }),
        ]
      : []),
  ],

  build: {
    // Enable source maps so Sentry can show readable stack traces.
    // The sentryVitePlugin above deletes them from dist/ after upload.
    sourcemap: true,
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  // Inject Vercel deployment context at build time.
  // VERCEL_GIT_COMMIT_SHA and VERCEL_GIT_COMMIT_MESSAGE are injected
  // automatically by Vercel into the build environment — they just need
  // the VITE_ prefix treatment here so they reach the browser bundle.
  define: {
    'import.meta.env.VITE_GIT_SHA': JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    ),
    'import.meta.env.VITE_GIT_MESSAGE': JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_MESSAGE ?? '',
    ),
    'import.meta.env.VITE_APP_ENV': JSON.stringify(
      // 'production' | 'preview' | 'development'
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    ),
  },
})
