import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signUp(email, password, displayName)
      // Email confirmation is disabled — Supabase returns a live session
      // immediately, so send the user straight into the app.
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Wordmark */}
        <div className="text-center">
          <p className="font-['Heebo'] text-4xl font-semibold tracking-tight text-kula-800 dark:text-kula-100">
            כולה
          </p>
          <p className="mt-1 font-sans text-xs font-semibold uppercase tracking-widest text-kula-500 dark:text-kula-400">
            Kula
          </p>
        </div>

        <Card className="w-full">
          <h1 className="mb-2 font-serif text-2xl tracking-tight text-kula-900 dark:text-kula-50">
            Create account
          </h1>
          <p className="mb-6 text-sm text-kula-500 dark:text-kula-400">
            Start tracking your learning.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="displayName"
              label="Display name"
              type="text"
              autoComplete="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-kula-500 dark:text-kula-400">
            Already have an account?{' '}
            <Link
              to="/signin"
              className="font-medium text-kula-600 underline-offset-2 hover:underline dark:text-kula-300"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
