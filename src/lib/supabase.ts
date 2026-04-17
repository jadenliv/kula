import { createClient } from '@supabase/supabase-js'

// Single Supabase client instance for the whole app.
// Env vars come from .env.local (gitignored). If they're missing we warn
// and fall back to placeholders so the dev server still boots — auth calls
// will fail loudly at runtime, which is the signal to fill in .env.local.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[kula] Missing Supabase env vars. Copy .env.example to .env.local and fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before attempting auth.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
