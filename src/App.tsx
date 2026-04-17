import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Browse from './pages/Browse'
import Reader from './pages/Reader'
import Notebook from './pages/Notebook'
import Today from './pages/Today'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
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
              <Route path="/browse" element={<Browse />} />
              <Route path="/read/:ref" element={<Reader />} />
              <Route path="/notebook" element={<Notebook />} />
              <Route path="/" element={<Navigate to="/today" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
