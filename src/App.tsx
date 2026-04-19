import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

function App() {
  return (
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

                    {/* Social */}
                    <Route path="/feed" element={<Feed />} />
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

                    {/* Posts */}
                    {POSTS_ENABLED && (
                      <>
                        <Route path="/posts/new" element={<NewPost />} />
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
  )
}

export default App
