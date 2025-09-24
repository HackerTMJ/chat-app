// Notification management utility
'use client'

export interface NotificationPermissionState {
  permission: NotificationPermission
  supported: boolean
  serviceWorkerReady: boolean
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  data?: any
}

export interface NotificationSettings {
  enabled: boolean
  sound: boolean
  desktop: boolean
  showWhenFocused: boolean
}

export class NotificationManager {
  private static instance: NotificationManager
  private swRegistration: ServiceWorkerRegistration | null = null
  private permissionState: NotificationPermissionState = {
    permission: 'default',
    supported: false,
    serviceWorkerReady: false
  }
  
  private settings: NotificationSettings = {
    enabled: true,
    sound: true,
    desktop: true,
    showWhenFocused: false  // Default: only show when app is in background
  }

  private constructor() {
    this.init()
  }

  public static getInstance(): NotificationManager {
    if (typeof window === 'undefined') {
      // Return a mock instance for SSR
      return {
        requestPermission: async () => ({ permission: 'default', supported: false }),
        showMessageNotification: () => {},
        getPermissionState: () => ({ permission: 'default', supported: false }),
        updateSettings: () => {},
        getSettings: () => ({ enabled: false, sound: true, desktop: true }),
        testNotification: () => {}
      } as any
    }
    
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  private async init() {
    // Check if notifications are supported (only in browser)
    if (typeof window === 'undefined') {
      return // Skip initialization on server
    }
    
    this.permissionState.supported = 'Notification' in window && 'serviceWorker' in navigator

    if (!this.permissionState.supported) {
      console.warn('Notifications or Service Workers not supported')
      return
    }

    // Get current permission state
    this.permissionState.permission = Notification.permission

    // Register service worker if needed
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js')
        this.permissionState.serviceWorkerReady = true
        console.log('📱 Service Worker registered for notifications')
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    // Load settings from localStorage
    this.loadSettings()
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (typeof window === 'undefined' || !this.permissionState.supported) {
      return this.permissionState
    }

    try {
      const permission = await Notification.requestPermission()
      this.permissionState.permission = permission
      console.log(`📱 Notification permission: ${permission}`)
      return this.permissionState
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return this.permissionState
    }
  }

  getPermissionState(): NotificationPermissionState {
    if (typeof window === 'undefined') {
      return { permission: 'default', supported: false, serviceWorkerReady: false }
    }
    return { ...this.permissionState }
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
  }

  getSettings(): NotificationSettings {
    return { ...this.settings }
  }

  private loadSettings() {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('notification-settings')
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('notification-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.error('Failed to save notification settings:', error)
    }
  }

  async showMessageNotification(message: { 
    sender_name?: string
    content: string
    room_name?: string
    room_id?: string
    message_id?: string
  }, force: boolean = false) {
    if (typeof window === 'undefined' || 
        !this.permissionState.supported || 
        this.permissionState.permission !== 'granted') {
      return
    }

    // Check if we should show the notification
    if (!force && !this.shouldShowNotification()) {
      console.log('🔕 Notification skipped - app is focused and showWhenFocused is disabled')
      return
    }

    const options: NotificationOptions = {
      title: `New message${message.room_name ? ` in ${message.room_name}` : ''}`,
      body: `${message.sender_name || 'Someone'}: ${message.content}`,
      tag: `message-${message.room_name || 'unknown'}`, // Use room name in tag for better management
      requireInteraction: true, // Keep notification visible for reply action
      silent: !this.settings.sound,
      data: {
        type: 'message',
        room: message.room_name,
        room_id: message.room_id,
        sender: message.sender_name,
        message_id: message.message_id,
        timestamp: Date.now()
      }
    }

    try {
      if (this.swRegistration) {
        // Use service worker for persistent notifications with actions
        const notificationOptions = {
          ...options,
          actions: [
            {
              action: 'reply',
              title: '💬 Reply',
              type: 'text' as const,
              placeholder: 'Type your reply...'
            },
            {
              action: 'view',
              title: '👁️ View',
            }
          ]
        }
        await this.swRegistration.showNotification(options.title, notificationOptions)
      } else {
        // Fallback to direct notification with click handler
        const notification = new Notification(options.title, options)
        notification.onclick = () => {
          this.handleNotificationClick(options.data)
          notification.close()
        }
      }
      
      console.log('📱 Message notification shown with reply actions')
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  async testNotification() {
    if (typeof window === 'undefined') return
    
    await this.showMessageNotification({
      sender_name: 'Test User',
      content: 'This is a test notification!',
      room_name: 'Test Room'
    }, true) // Force show test notifications
  }

  // Additional utility methods for better API compatibility
  async showNotification(options: NotificationOptions) {
    return this.showMessageNotification({
      sender_name: options.title,
      content: options.body || '',
      room_name: ''
    })
  }

  private handleNotificationClick(data: any) {
    console.log('🔔 Notification clicked:', data)
    
    if (data?.room_id) {
      // Focus the window if it exists
      if (typeof window !== 'undefined') {
        window.focus()
        
        // Navigate to the room using URL
        const chatUrl = `/chat?room=${data.room_id}`
        if (data.message_id) {
          // If we have a message ID, add it to highlight the message
          window.location.href = `${chatUrl}&highlight=${data.message_id}`
        } else {
          window.location.href = chatUrl
        }
      }
    }
  }

  // Method to handle notification replies (called from service worker)
  handleNotificationReply(data: any, reply: string) {
    console.log('💬 Notification reply:', { data, reply })
    
    // Store the reply in localStorage for the main app to pick up
    if (typeof window !== 'undefined') {
      const replyData = {
        room_id: data.room_id,
        reply_text: reply,
        timestamp: Date.now(),
        in_reply_to: data.message_id
      }
      
      localStorage.setItem('pending_notification_reply', JSON.stringify(replyData))
      
      // Focus the window and navigate to room
      window.focus()
      const chatUrl = `/chat?room=${data.room_id}&reply=true`
      window.location.href = chatUrl
    }
  }

  shouldShowNotification(force: boolean = false): boolean {
    if (typeof window === 'undefined') return false
    
    // Basic requirements check
    const hasPermission = this.permissionState.supported && 
                         this.permissionState.permission === 'granted' &&
                         this.settings.enabled
    
    if (!hasPermission) return false
    
    // If forced (like test notifications), always show
    if (force) return true
    
    // For message notifications, check if app is in background or user settings allow
    // You can modify this logic based on user preferences
    return !document.hasFocus() || this.settings.showWhenFocused
  }

  clearNotifications(tag?: string) {
    if (typeof window === 'undefined' || !this.swRegistration) return
    
    // Clear service worker notifications with tag
    this.swRegistration.getNotifications({ tag }).then(notifications => {
      notifications.forEach(notification => notification.close())
    })
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return this.permissionState.supported
  }

  isPermissionGranted(): boolean {
    if (typeof window === 'undefined') return false
    return this.permissionState.permission === 'granted'
  }

  isReady(): boolean {
    if (typeof window === 'undefined') return false
    return this.permissionState.supported && 
           this.permissionState.serviceWorkerReady &&
           this.permissionState.permission === 'granted'
  }
}

// Export singleton instance functions
export const notificationManager = NotificationManager.getInstance()

export async function showMessageNotification(message: { 
  sender_name?: string
  content: string
  room_name?: string
  room_id?: string
  message_id?: string
}, force: boolean = false) {
  return notificationManager.showMessageNotification(message, force)
}

export async function requestNotificationPermission() {
  return notificationManager.requestPermission()
}

export function getNotificationPermissionState() {
  return notificationManager.getPermissionState()
}

export function updateNotificationSettings(settings: Partial<NotificationSettings>) {
  return notificationManager.updateSettings(settings)
}

export function getNotificationSettings() {
  return notificationManager.getSettings()
}