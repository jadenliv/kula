/**
 * OnboardingGate — renders its children normally for users who have completed
 * onboarding, and redirects to /onboarding for users who have not.
 *
 * Placed between ProtectedRoute and AppShell so the redirect fires before any
 * app chrome renders, but after we know the user is authenticated.
 *
 * While the profile is still loading we show a full-page spinner rather than
 * flickering between states or doing a premature redirect.
 */

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import { Spinner } from './ui/Spinner'

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Profile loaded and onboarding not complete — redirect to the flow
  if (profile && profile.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
