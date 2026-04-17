/**
 * Admin configuration — hardcoded for now, refactor to a DB role table later.
 * Add your Supabase user UUID here to access /admin/reports.
 *
 * Find your user UUID in Supabase Dashboard → Authentication → Users.
 */
export const ADMIN_USER_IDS: string[] = [
  '936edc86-c923-47fe-ab14-4e1d84daab92',
]

export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false
  return ADMIN_USER_IDS.includes(userId)
}

/**
 * Email address for report notifications.
 * Set VITE_REPORT_ADMIN_EMAIL in .env.local.
 * Email delivery requires a Supabase Edge Function or similar — see TODO in
 * src/services/reports.ts for wiring instructions.
 */
export const REPORT_ADMIN_EMAIL =
  import.meta.env.VITE_REPORT_ADMIN_EMAIL as string | undefined
