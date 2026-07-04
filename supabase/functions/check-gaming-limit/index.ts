import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')! // e.g. mailto:you@example.com

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async () => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Get all users who have gaming sessions today
  const { data: sessions } = await supabase
    .from('gaming_sessions')
    .select('user_id, started_at, ended_at, notified')
    .gte('started_at', todayStart.toISOString())

  if (!sessions?.length) return new Response('ok')

  // Group sessions by user and sum elapsed time
  const byUser = new Map<string, { totalSeconds: number; hasUnnotified: boolean }>()

  for (const s of sessions) {
    const start = new Date(s.started_at).getTime()
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now()
    const elapsed = Math.floor((end - start) / 1000)

    const existing = byUser.get(s.user_id) ?? { totalSeconds: 0, hasUnnotified: false }
    existing.totalSeconds += elapsed
    if (!s.notified) existing.hasUnnotified = true
    byUser.set(s.user_id, existing)
  }

  const usersOverLimit: string[] = []

  for (const [userId, { totalSeconds, hasUnnotified }] of byUser) {
    if (!hasUnnotified) continue

    // Check user's daily limit
    const { data: settings } = await supabase
      .from('user_settings')
      .select('daily_limit_seconds')
      .eq('user_id', userId)
      .maybeSingle()

    const limit = settings?.daily_limit_seconds ?? 7200
    if (totalSeconds >= limit) usersOverLimit.push(userId)
  }

  for (const userId of usersOverLimit) {
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.subscription) continue

    try {
      await webpush.sendNotification(
        sub.subscription as webpush.PushSubscription,
        JSON.stringify({
          title: 'Gaming Limit Reached',
          body: "You've hit your daily gaming limit. Time to take a break!",
        })
      )
    } catch (err) {
      console.error('Push failed for user', userId, err)
    }

    // Mark all of today's sessions for this user as notified
    await supabase
      .from('gaming_sessions')
      .update({ notified: true })
      .eq('user_id', userId)
      .gte('started_at', todayStart.toISOString())
  }

  return new Response('ok')
})
