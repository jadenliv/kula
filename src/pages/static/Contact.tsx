import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setTitle } from '../../lib/seo'

export default function Contact() {
  useEffect(() => {
    const stored = localStorage.getItem('kula-theme')
    if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    setTitle('Contact')
  }, [])

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-kula-900 dark:text-kula-50">
      <StaticNav />
      <main className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="mb-4 font-serif text-4xl tracking-tight text-kula-900 dark:text-kula-50">
          Contact
        </h1>
        <p className="mb-10 text-sm text-kula-400 dark:text-kula-600">Get in touch</p>
        <p className="text-kula-600 dark:text-kula-400">
          For questions, feedback, or support, reach us at{' '}
          <a
            href="mailto:hello@getkula.app"
            className="text-kula-700 underline underline-offset-2 hover:text-kula-900 dark:text-kula-300 dark:hover:text-kula-100"
          >
            hello@getkula.app
          </a>
          .
        </p>
      </main>
    </div>
  )
}

function StaticNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--app-bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-['Heebo'] text-lg font-semibold tracking-tight text-kula-800 dark:text-kula-100">
            כולה
          </span>
          <span className="text-xs text-kula-300 dark:text-kula-700">|</span>
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-kula-700 dark:text-kula-300">
            Kula
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/signin"
            className="rounded-xl px-4 py-1.5 text-sm font-medium text-kula-600 transition-colors hover:text-kula-800 dark:text-kula-400 dark:hover:text-kula-200"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-kula-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-kula-800 dark:bg-kula-400 dark:text-kula-950 dark:hover:bg-kula-300"
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  )
}
