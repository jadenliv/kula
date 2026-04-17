import { supabase } from '../lib/supabase'
import { isAdmin } from '../lib/adminConfig'

export type ReportTargetType = 'user' | 'post' | 'note'

export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate content',
  'Other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export type Report = {
  id: string
  reporter_user_id: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  details: string
  created_at: string
  handled_at: string | null
  handled_action: string | null
  /** Joined from profiles — present when fetched via listReports. */
  reporter?: { username: string; display_name: string }
}

/**
 * Submit a report. Inserts into the reports table.
 *
 * TODO: wire email notification via Supabase Edge Function:
 *   1. Create supabase/functions/notify-report/index.ts
 *   2. On insert, call the function with report details
 *   3. Function emails REPORT_ADMIN_EMAIL (from adminConfig.ts)
 *   4. Alternatively, use a Postgres trigger + pg_net or Supabase webhooks
 */
export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  details: string,
  targetUrl?: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error } = await supabase.from('reports').insert({
    reporter_user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    // Include target URL in details for admin context
    details: targetUrl ? `${details}\n\nURL: ${targetUrl}`.trim() : details,
  })

  if (error) throw error
}

/** Fetch all reports (admin only). */
export async function listReports(): Promise<Report[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('Forbidden')

  const { data, error } = await supabase
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_user_id_fkey(username, display_name)')
    .order('created_at', { ascending: false })

  if (error) {
    // Fallback without join if FK name doesn't match
    const { data: plain, error: e2 } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (e2) throw e2
    return (plain ?? []) as Report[]
  }

  return (data ?? []) as Report[]
}

/** Mark a report as handled (admin only). */
export async function handleReport(
  reportId: string,
  action: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('Forbidden')

  const { error } = await supabase
    .from('reports')
    .update({ handled_at: new Date().toISOString(), handled_action: action })
    .eq('id', reportId)

  if (error) throw error
}
