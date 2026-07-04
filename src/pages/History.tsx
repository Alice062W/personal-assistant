import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { formatDuration } from '../lib/utils'
import type { GamingSession } from '../types'

type DayGroup = {
  date: string
  sessions: GamingSession[]
  totalSeconds: number
}

export default function History({ user }: { user: User }) {
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [user.id])

  async function loadHistory() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data } = await supabase
      .from('gaming_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: false })

    const sessions = data ?? []
    const byDay = new Map<string, GamingSession[]>()

    for (const s of sessions) {
      const day = new Date(s.started_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      })
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(s)
    }

    const grouped: DayGroup[] = []
    for (const [date, daySessions] of byDay) {
      const totalSeconds = daySessions.reduce((acc, s) => {
        const start = new Date(s.started_at).getTime()
        const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now()
        return acc + Math.floor((end - start) / 1000)
      }, 0)
      grouped.push({ date, sessions: daySessions, totalSeconds })
    }

    setGroups(grouped)
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>

  if (groups.length === 0) {
    return (
      <div className="px-6 pt-12">
        <h1 className="text-xl font-semibold text-subtext mb-8">History</h1>
        <p className="text-subtext text-center mt-20">No sessions yet. Start gaming!</p>
      </div>
    )
  }

  return (
    <div className="px-6 pt-12 space-y-6">
      <h1 className="text-xl font-semibold text-subtext">History</h1>
      {groups.map(group => (
        <div key={group.date} className="bg-surface rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-overlay">
            <span className="font-semibold">{group.date}</span>
            <span className="text-accent font-bold">{formatDuration(group.totalSeconds)}</span>
          </div>
          {group.sessions.map(s => (
            <div key={s.id} className="flex justify-between items-center px-4 py-3 text-sm text-subtext">
              <span>
                {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {s.ended_at
                  ? new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'active'}
              </span>
              <span>
                {formatDuration(
                  Math.floor((
                    (s.ended_at ? new Date(s.ended_at).getTime() : Date.now()) -
                    new Date(s.started_at).getTime()
                  ) / 1000)
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
