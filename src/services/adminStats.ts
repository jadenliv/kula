/**
 * Admin stats service — calls the get_admin_stats() Postgres RPC function.
 *
 * The function runs with SECURITY DEFINER and enforces its own admin check,
 * so any non-admin call is rejected at the DB level.
 *
 * Prerequisites: run supabase/migrations/0010_admin_stats.sql in the
 * Supabase SQL Editor before using this.
 */

import { supabase } from '../lib/supabase'

export type WeeklySignup = {
  week: string   // YYYY-MM-DD (start of week)
  count: number
}

export type DailyActiveUsers = {
  day: string          // YYYY-MM-DD
  active_users: number
}

export type AdminStats = {
  // Users
  total_users: number
  onboarding_completed: number
  public_profiles: number
  private_profiles: number
  // Signups
  signups_today: number
  signups_7d: number
  signups_30d: number
  signups_by_week: WeeklySignup[]
  // Activity
  active_users_7d: number
  active_users_30d: number
  dau_by_day: DailyActiveUsers[]
  // Content
  total_completions: number
  total_notes: number
  total_posts: number
  total_follows: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('get_admin_stats')
  if (error) throw error
  return data as AdminStats
}
