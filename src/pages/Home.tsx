import { useEffect, useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import ProgressRing from '../components/ProgressRing'
import { formatDuration } from '../lib/utils'
import type { GamingSession } from '../types'

const DEFAULT_LIMIT = 2 * 3600

export default function Home({ user }: { user: User }) {
  const [activeSession, setActiveSession] = useState<GamingSession | null>(null)
  const [todayElapsed, setTodayElapsed] = useState(0)
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_LIMIT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionsRef = useRef<GamingSession[]>([])

  useEffect(() => {
    loadData()

    // Reload when user comes back to this tab
    const handleVisibility = () => { if (!document.hidden) loadData() }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user.id])

  async function loadData() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [sessionsResult, settingsResult] = await Promise.all([
      supabase
        .from('gaming_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', todayStart.toISOString()),
      supabase
        .from('user_settings')
        .select('daily_limit_seconds')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (sessionsResult.error) {
      setError('Failed to load sessions: ' + sessionsResult.error.message)
      setLoading(false)
      return
    }

    const sessions: GamingSession[] = sessionsResult.data ?? []
    sessionsRef.current = sessions

    if (settingsResult.data) setDailyLimit(settingsResult.data.daily_limit_seconds)

    const active = sessions.find(s => !s.ended_at) ?? null
    setActiveSession(active)
    setTodayElapsed(computeElapsed(sessions))
    setLoading(false)

    if (active) startTick()
  }

  function computeElapsed(sessions: GamingSession[]): number {
    const now = Date.now()
    return sessions.reduce((acc, s) => {
      const start = new Date(s.started_at).getTime()
      const end = s.ended_at ? new Date(s.ended_at).getTime() : now
      return acc + Math.floor((end - start) / 1000)
    }, 0)
  }

  function startTick() {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      setTodayElapsed(computeElapsed(sessionsRef.current))
    }, 1000)
  }

  async function handleStart() {
    setError('')
    setActionLoading(true)
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('gaming_sessions')
      .insert({ user_id: user.id, started_at: now })
      .select()
      .single()

    setActionLoading(false)
    if (error) { setError('Failed to start: ' + JSON.stringify(error)); return }
    if (!data) { setError('Failed to start: no data returned'); return }

    const newSession = data as GamingSession
    sessionsRef.current = [...sessionsRef.current, newSession]
    setActiveSession(newSession)
    startTick()
  }

  async function handleStop() {
    if (!activeSession) return
    setActionLoading(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('gaming_sessions')
      .update({ ended_at: now })
      .eq('id', activeSession.id)

    setActionLoading(false)
    if (error) { setError('Failed to stop: ' + error.message); return }

    if (tickRef.current) clearInterval(tickRef.current)
    setActiveSession(null)
    await loadData()
  }

  const progress = Math.min(todayElapsed / dailyLimit, 1)
  const overLimit = todayElapsed >= dailyLimit

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="flex flex-col items-center px-6 pt-12 gap-8">
      <h1 className="text-xl font-semibold text-subtext">Gaming Timer</h1>

      <ProgressRing progress={progress} overLimit={overLimit}>
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{formatDuration(todayElapsed)}</div>
          <div className="text-sm text-subtext mt-1">of {formatDuration(dailyLimit)}</div>
        </div>
      </ProgressRing>

      {error && (
        <div className="bg-red/20 border border-red/40 text-red rounded-xl px-4 py-3 text-sm text-center w-full">
          {error}
        </div>
      )}

      {overLimit && !error && (
        <div className="bg-red/20 border border-red/40 text-red rounded-xl px-4 py-3 text-sm text-center">
          Daily limit reached! Take a break.
        </div>
      )}

      <button
        onClick={activeSession ? handleStop : handleStart}
        disabled={actionLoading}
        className={`w-48 py-4 rounded-2xl text-lg font-bold transition-colors disabled:opacity-50 ${
          activeSession
            ? 'bg-red/80 hover:bg-red text-base'
            : 'bg-green/80 hover:bg-green text-base'
        }`}
      >
        {actionLoading ? '…' : activeSession ? 'Stop' : 'Start'}
      </button>

      {activeSession && (
        <p className="text-sm text-subtext">Session started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
      )}
    </div>
  )
}
