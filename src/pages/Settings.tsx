import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

export default function Settings({ user }: { user: User }) {
  const [limitMinutes, setLimitMinutes] = useState(120)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'enabled' | 'denied'>('idle')

  useEffect(() => {
    supabase
      .from('user_settings')
      .select('daily_limit_seconds')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLimitMinutes(Math.floor(data.daily_limit_seconds / 60))
      })

    if (Notification.permission === 'granted') setNotifStatus('enabled')
    else if (Notification.permission === 'denied') setNotifStatus('denied')
  }, [user.id])

  async function saveLimit() {
    setSaving(true)
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, daily_limit_seconds: limitMinutes * 60 })
    setSaving(false)
    if (error) {
      alert('Save failed: ' + error.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function enableNotifications() {
    setNotifStatus('loading')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setNotifStatus('denied')
      return
    }

    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: user.id, subscription: subscription.toJSON() })

    setNotifStatus('enabled')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="px-6 pt-12 space-y-8">
      <h1 className="text-xl font-semibold text-subtext">Settings</h1>

      <div className="bg-surface rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Daily Gaming Limit</h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={15}
            max={480}
            step={15}
            value={limitMinutes}
            onChange={e => setLimitMinutes(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-accent font-bold w-16 text-right">
            {limitMinutes >= 60
              ? `${Math.floor(limitMinutes / 60)}h${limitMinutes % 60 ? ` ${limitMinutes % 60}m` : ''}`
              : `${limitMinutes}m`}
          </span>
        </div>
        <button
          onClick={saveLimit}
          disabled={saving}
          className="w-full py-3 bg-accent text-base font-semibold rounded-xl disabled:opacity-50"
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Limit'}
        </button>
      </div>

      <div className="bg-surface rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Notifications</h2>
        {notifStatus === 'enabled' ? (
          <p className="text-green text-sm">Background notifications are enabled.</p>
        ) : notifStatus === 'denied' ? (
          <p className="text-red text-sm">Notifications were blocked. Enable them in your browser settings.</p>
        ) : (
          <>
            <p className="text-subtext text-sm">
              Get a sound alert on your phone even when the app is closed.
              Add this app to your home screen first for best results.
            </p>
            <button
              onClick={enableNotifications}
              disabled={notifStatus === 'loading'}
              className="w-full py-3 bg-accent text-base font-semibold rounded-xl disabled:opacity-50"
            >
              {notifStatus === 'loading' ? 'Enabling…' : 'Enable Notifications'}
            </button>
          </>
        )}
      </div>

      <button
        onClick={signOut}
        className="w-full py-3 bg-overlay text-subtext font-semibold rounded-xl"
      >
        Sign out
      </button>
    </div>
  )
}
