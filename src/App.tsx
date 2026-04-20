import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { OnboardingGate } from './components/OnboardingGate'
import Onboarding from './pages/Onboarding'
import { LocationProvider } from './context/LocationContext'
import { TimerProvider } from './context/TimerContext'
import { ToastProvider } from './context/ToastContext'
import { ProfileProvider } from './context/ProfileContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Browse from './pages/Browse'
import Reader from './pages/Reader'
import Notebook from './pages/Notebook'
import Today from './pages/Today'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import NewPost from './pages/posts/NewPost'
import PostPage from './pages/posts/PostPage'
import EditPost from './pages/posts/EditPost'
import FollowersList, { FollowingList } from './pages/profile/FollowersList'
import FollowRequests from './pages/settings/FollowRequests'
import AdminReports from './pages/admin/Reports'
import AdminPosts from './pages/admin/Posts'
import AdminStatus from './pages/admin/Status'
import Feed from './pages/Feed'
import Discover from './pages/Discover'
import Landing from './pages/Landing'
import Privacy from './pages/static/Privacy'
import Terms from './pages/static/Terms'
import Contact from './pages/static/Contact'
import About from './pages/static/About'
import { POSTS_ENABLED } from './lib/featureFlags'

/**
 * RootRoute — shown at "/".
 * Logged-in users are sent straight to /today.
 * Logged-out (or still loading) visitors see the public landing page.
 * We intentionally show Landing during the auth-loading state rather than a
 * blank screen; ProtectedRoute handles the real redirect for inner routes.
 */
function RootRoute() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/today" replace />
  return <Landing />
}

/** Generic error fallback shown when a Sentry error boundary catches. */
function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm text-kula-500 dark:text-kula-400">
        Something went wrong. Our team has been notified.
      </p>
      <button
        type="button"
        onClick={resetError}
        className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs text-kula-600 hover:border-kula-400 dark:text-kula-400"
      >
        Try again
      </button>
    </div>
  )
}

function App() {
  return (
    // Outermost Sentry boundary — catches any error that escapes nested boundaries.
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <TimerProvider>
              <ToastProvider>
                <ProfileProvider>
                  <Routes>
                    {/* Public routes — no auth required */}
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />

                    {/* Onboarding — protected (needs auth) but outside the OnboardingGate */}
                    <Route
                      path="/onboarding"
                      element={
                        <ProtectedRoute>
                          <Onboarding />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected app routes — OnboardingGate redirects incomplete users */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <OnboardingGate>
                            <AppShell />
                          </OnboardingGate>
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/today" element={<Today />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/browse" element={<Browse />} />
                      <Route path="/read/:ref" element={<Reader />} />
                      <Route path="/notebook" element={<Notebook />} />

                      {/* Feed — gets its own error boundary: social feed is high-traffic */}
                      <Route
                        path="/feed"
                        element={
                          <Sentry.ErrorBoundary
                            fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
                          >
                            <Feed />
                          </Sentry.ErrorBoundary>
                        }
                      />

                      <Route path="/discover" element={<Discover />} />

                      {/* Profile pages */}
                      <Route path="/u/:username" element={<Profile />} />
                      <Route path="/u/:username/followers" element={<FollowersList />} />
                      <Route path="/u/:username/following" element={<FollowingList />} />

                      {/* Settings */}
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/followers" element={<FollowRequests />} />

                      {/* Admin */}
                      <Route path="/admin/reports" element={<AdminReports />} />
                      <Route path="/admin/posts" element={<AdminPosts />} />
                      <Route path="/admin/status" element={<AdminStatus />} />

                      {/* Posts — each gets its own error boundary (composer is high-risk) */}
                      {POSTS_ENABLED && (
                        <>
                          <Route
                            path="/posts/new"
                            element={
                              <Sentry.ErrorBoundary
                                fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
                              >
                                <NewPost />
                              </Sentry.ErrorBoundary>
                            }
                          />
                          <Route path="/posts/:id" element={<PostPage />} />
                          <Route path="/posts/:id/edit" element={<EditPost />} />
                        </>
                      )}
                    </Route>

                    {/* Catch-all → landing */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ProfileProvider>
              </ToastProvider>
            </TimerProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}

export default App
