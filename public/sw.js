// Service Worker for Push Notifications
const CACHE_NAME = 'chat-app-v1'
const urlsToCache = [
  '/',
  '/chat',
  '/offline.html'
]

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
  self.skipWaiting()
})

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Handle Push Events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)
  
  const options = {
    body: 'You have a new message!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'new-message',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open Chat',
        icon: '/action-open.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/action-close.png'
      }
    ],
    data: {
      url: '/chat',
      timestamp: Date.now()
    }
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      options.title = payload.title || 'New Message'
      options.body = payload.body || options.body
      options.icon = payload.icon || options.icon
      options.data = { ...options.data, ...payload.data }
    } catch (e) {
      console.error('Error parsing push payload:', e)
      options.title = 'New Message'
    }
  } else {
    options.title = 'New Message'
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  )
})

// Handle Notification Clicks with Reply Support
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification action:', event.action, event.notification.data)
  
  const data = event.notification.data || {}
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  if (event.action === 'reply') {
    // Handle reply action with text input
    console.log('💬 Reply action with text:', event.reply)
    
    // Store reply data for the main app to process
    const replyData = {
      room_id: data.room_id,
      reply_text: event.reply || '',
      timestamp: Date.now(),
      in_reply_to: data.message_id,
      sender: data.sender
    }
    
    // Build chat URL with reply parameters
    let chatUrl = '/chat'
    if (data.room_id) {
      chatUrl = `/chat?room=${data.room_id}&reply=true`
    }
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a chat window open
          for (const client of clientList) {
            if (client.url.includes('/chat') && 'focus' in client) {
              // Send reply data to existing window
              client.postMessage({
                type: 'NOTIFICATION_REPLY',
                data: replyData
              })
              return client.focus()
            }
          }
          
          // If no existing window, open a new one
          if (clients.openWindow) {
            return clients.openWindow(chatUrl).then(function(windowClient) {
              // Send reply data to the new window
              if (windowClient) {
                // Store in a way the new window can access
                return new Promise(resolve => {
                  setTimeout(() => {
                    windowClient.postMessage({
                      type: 'NOTIFICATION_REPLY',
                      data: replyData
                    })
                    resolve()
                  }, 1000) // Wait for window to load
                })
              }
            })
          }
        })
    )
    
  } else {
    // Default action, 'view' action, or 'open' action
    console.log('👁️ View/Open action')
    
    let urlToOpen = '/chat'
    if (data.room_id) {
      urlToOpen = `/chat?room=${data.room_id}`
      if (data.message_id) {
        urlToOpen += `&highlight=${data.message_id}`
      }
    } else if (data.url) {
      urlToOpen = data.url
    }
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window/tab open with the target URL
          for (const client of clientList) {
            if (client.url.includes('/chat') && 'focus' in client) {
              return client.focus()
            }
          }
          
          // If no existing window, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen)
          }
        })
    )
  }
})

// Handle Notification Close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)
  // Optional: Track notification dismissal analytics
})

// Background Sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-messages') {
    console.log('Background sync: messages')
    event.waitUntil(syncMessages())
  }
})

async function syncMessages() {
  try {
    // Implementation for syncing offline messages
    console.log('Syncing offline messages...')
    // This would connect to your chat API to send queued messages
  } catch (error) {
    console.error('Error syncing messages:', error)
  }
}

// Fetch handler for offline functionality
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // If both cache and network fail, return offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/offline.html')
          }
        })
      })
  )
})