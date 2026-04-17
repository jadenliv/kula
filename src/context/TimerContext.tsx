import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getActiveSession, type LearningSession } from '../services/sessions'
import { useAuth } from './AuthContext'

type TimerContextValue = {
  activeSession: LearningSession | null
  elapsedSeconds: number
  setActiveSession: (session: LearningSession | null) => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore an in-progress session on mount / sign-in.
  useEffect(() => {
    if (!user) {
      setActiveSession(null)
      return
    }
    getActiveSession()
      .then((session) => {
        if (session) {
          setActiveSession(session)
          setElapsedSeconds(
            Math.floor(
              (Date.now() - new Date(session.started_at).getTime()) / 1000,
            ),
          )
        }
      })
      .catch(() => {})
  }, [user])

  // Tick every second whenever a session is active.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!activeSession) {
      setElapsedSeconds(0)
      return
    }
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(
        Math.floor(
          (Date.now() - new Date(activeSession.started_at).getTime()) / 1000,
        ),
      )
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeSession])

  return (
    <TimerContext.Provider value={{ activeSession, elapsedSeconds, setActiveSession }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
