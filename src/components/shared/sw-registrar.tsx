'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Don't register in dev: Next.js dev chunks aren't content-hashed the
    // way production chunks are, so a service worker here just serves stale
    // code after every edit. Only run the PWA service worker in production.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  // New version available, could notify user
                  console.log('[SW] New version installed')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error)
        })
    }
  }, [])

  return null
}
