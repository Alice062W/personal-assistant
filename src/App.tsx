import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Settings from './pages/Settings'
import History from './pages/History'
import Login from './pages/Login'
import NavBar from './components/NavBar'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route path="/history" element={<History user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  )
}
