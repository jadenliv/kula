import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { initSentry } from './lib/sentry'
import './index.css'
import App from './App'

// Initialise Sentry before the React tree is mounted so the error boundary
// is active from the very first render.
initSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sefaria texts are immutable — cache aggressively
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Vercel Analytics — auto-tracks page views via history events */}
      <Analytics />
      {/* Vercel Speed Insights — captures Core Web Vitals (LCP, FID, CLS) */}
      <SpeedInsights />
    </QueryClientProvider>
  </StrictMode>,
)
