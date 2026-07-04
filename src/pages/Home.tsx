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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadData()
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
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

    const sessions = sessionsResult.data ?? []
    if (settingsResult.data) setDailyLimit(settingsResult.data.daily_limit_seconds)

    const active = sessions.find(s => !s.ended_at) ?? null
    setActiveSession(active)

    const elapsed = computeElapsed(sessions)
    setTodayElapsed(elapsed)
    setLoading(false)

    if (active) startTick(active, sessions)
  }

  function computeElapsed(sessions: GamingSession[]): number {
    const now = Date.now()
    return sessions.reduce((acc, s) => {
      const start = new Date(s.started_at).getTime()
      const end = s.ended_at ? new Date(s.ended_at).getTime() : now
      return acc + Math.floor((end - start) / 1000)
    }, 0)
  }

  function startTick(_active: GamingSession, allSessions: GamingSession[]) {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      setTodayElapsed(computeElapsed(allSessions))
    }, 1000)
  }

  async function handleStart() {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('gaming_sessions')
      .insert({ user_id: user.id, started_at: now })
      .select()
      .single()

    if (error || !data) return
    setActiveSession(data)
    const allSessions = [...(await getTodaySessions()), data]
    startTick(data, allSessions)
  }

  async function handleStop() {
    if (!activeSession) return
    const now = new Date().toISOString()
    await supabase
      .from('gaming_sessions')
      .update({ ended_at: now })
      .eq('id', activeSession.id)

    if (tickRef.current) clearInterval(tickRef.current)
    setActiveSession(null)
    await loadData()
  }

  async function getTodaySessions(): Promise<GamingSession[]> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('gaming_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', todayStart.toISOString())
    return data ?? []
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

      {overLimit && (
        <div className="bg-red/20 border border-red/40 text-red rounded-xl px-4 py-3 text-sm text-center">
          Daily limit reached! Take a break.
        </div>
      )}

      <button
        onClick={activeSession ? handleStop : handleStart}
        className={`w-48 py-4 rounded-2xl text-lg font-bold transition-colors ${
          activeSession
            ? 'bg-red/80 hover:bg-red text-base'
            : 'bg-green/80 hover:bg-green text-base'
        }`}
      >
        {activeSession ? 'Stop' : 'Start'}
      </button>

      {activeSession && (
        <p className="text-sm text-subtext">Session started at {new Date(activeSession.started_at).toLocaleTimeString()}</p>
      )}
    </div>
  )
}
