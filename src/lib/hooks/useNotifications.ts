// Hook for managing push notifications in chat
'use client'

import { useEffect, useRef } from 'react'
import { notificationManager, showMessageNotification } from '@/lib/notifications/NotificationManager'
import { useChatStore } from '@/lib/stores/chat'
import type { Message } from '@/lib/stores/chat'

export function useNotifications() {
  const { currentRoom } = useChatStore()
  const lastMessageIdRef = useRef<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  // Initialize notifications when component mounts
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Wait for service worker to be ready
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('Notification system initialized')
        console.log('Permission state:', notificationManager.getPermissionState())
      } catch (error) {
        console.error('Failed to initialize notifications:', error)
      }
    }

    initNotifications()
  }, [])

  // Listen for new messages and show notifications
  useEffect(() => {
    const unsubscribe = useChatStore.subscribe(
      (state) => state.messages,
      (messages) => {
        if (!messages.length || !currentRoom) return

        // Get the latest message
        const latestMessage = messages[messages.length - 1]
        
        // Skip if this is the same message we already processed
        if (latestMessage.id === lastMessageIdRef.current) return
        
        // Skip if this message is from the current user
        if (latestMessage.user_id === currentUserIdRef.current) return
        
        // Skip if message is older than 10 seconds (probably from history load)
        const messageTime = new Date(latestMessage.created_at).getTime()
        const tenSecondsAgo = Date.now() - 10000
        if (messageTime < tenSecondsAgo) return

        // Update the last processed message ID
        lastMessageIdRef.current = latestMessage.id

        // Show notification if app is not in focus
        if (notificationManager.shouldShowNotification()) {
          showMessageNotification({
            content: latestMessage.content,
            sender_name: latestMessage.profiles?.username || 'Someone',
            room_name: currentRoom.name
          }).catch((error: any) => {
            console.error('Failed to show message notification:', error)
          })
        }
      }
    )

    return unsubscribe
  }, [currentRoom])

  // Update current user ID when it changes
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        currentUserIdRef.current = user?.id || null
      } catch (error) {
        console.error('Failed to get current user:', error)
      }
    }

    getCurrentUser()
  }, [])

  // Clear notifications when user focuses on the current room
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentRoom) {
        // Clear notifications for the current room when user comes back
        notificationManager.clearNotifications(`message-${currentRoom.id}`)
      }
    }

    const handleFocus = () => {
      if (currentRoom) {
        // Clear notifications when window gains focus
        notificationManager.clearNotifications(`message-${currentRoom.id}`)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentRoom])

  // Return notification utilities
  return {
    isSupported: typeof window !== 'undefined' ? notificationManager.isSupported() : false,
    isPermissionGranted: typeof window !== 'undefined' ? notificationManager.isPermissionGranted() : false,
    isReady: typeof window !== 'undefined' ? notificationManager.isReady() : false,
    requestPermission: () => typeof window !== 'undefined' ? notificationManager.requestPermission() : Promise.resolve(false),
    showTestNotification: () => typeof window !== 'undefined' ? notificationManager.showNotification({
      title: 'Test Notification',
      body: 'This is a test from your chat app!',
      tag: 'test'
    }) : Promise.resolve(),
    clearNotifications: (tag?: string) => typeof window !== 'undefined' ? notificationManager.clearNotifications(tag) : undefined
  }
}