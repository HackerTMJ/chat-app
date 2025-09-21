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
    desktop: true
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
  }) {
    if (typeof window === 'undefined' || 
        !this.settings.enabled || 
        !this.permissionState.supported || 
        this.permissionState.permission !== 'granted') {
      return
    }

    const options: NotificationOptions = {
      title: `New message${message.room_name ? ` in ${message.room_name}` : ''}`,
      body: `${message.sender_name || 'Someone'}: ${message.content}`,
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      tag: 'chat-message',
      requireInteraction: false,
      silent: !this.settings.sound,
      data: {
        type: 'message',
        room: message.room_name,
        sender: message.sender_name
      }
    }

    try {
      if (this.swRegistration) {
        // Use service worker for persistent notifications
        await this.swRegistration.showNotification(options.title, options)
      } else {
        // Fallback to direct notification
        new Notification(options.title, options)
      }
      
      console.log('📱 Message notification shown')
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
    })
  }

  // Additional utility methods for better API compatibility
  async showNotification(options: NotificationOptions) {
    return this.showMessageNotification({
      sender_name: options.title,
      content: options.body || '',
      room_name: ''
    })
  }

  shouldShowNotification(): boolean {
    if (typeof window === 'undefined') return false
    return this.permissionState.supported && 
           this.permissionState.permission === 'granted' &&
           !document.hasFocus()
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
}) {
  return notificationManager.showMessageNotification(message)
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