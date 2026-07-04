/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const title: string = data.title ?? 'Gaming Limit Reached'
  const body: string = data.body ?? "You've hit your daily gaming limit. Time to take a break!"

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'gaming-limit',
        renotify: true,
      } as NotificationOptions),
      playAlarm(),
    ])
  )
})

async function playAlarm() {
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.postMessage({ type: 'PLAY_ALARM' })
  }
}

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
