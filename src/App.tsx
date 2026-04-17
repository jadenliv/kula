import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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
import Feed from './pages/Feed'
import Discover from './pages/Discover'
import { POSTS_ENABLED } from './lib/featureFlags'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <TimerProvider>
            <ToastProvider>
              <ProfileProvider>
                <Routes>
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppShell />
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

                    {/* Posts */}
                    {POSTS_ENABLED && (
                      <>
                        <Route path="/posts/new" element={<NewPost />} />
                        <Route path="/posts/:id" element={<PostPage />} />
                        <Route path="/posts/:id/edit" element={<EditPost />} />
                      </>
                    )}

                    <Route path="/" element={<Navigate to="/today" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/today" replace />} />
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
