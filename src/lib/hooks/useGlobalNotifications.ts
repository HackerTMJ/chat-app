'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notificationManager, showMessageNotification } from '@/lib/notifications/NotificationManager'
import { useChatStore } from '@/lib/stores/chat'

export function useGlobalNotifications(user?: any) {
  const { currentRoom } = useChatStore()
  
  // State to track which rooms the user is a member of
  const [userRoomIds, setUserRoomIds] = useState<Set<string>>(new Set())
  
  // Refs for managing state
  const globalChannelRef = useRef<any>(null)
  const isInitializingRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)
  const isVisible = useRef<boolean>(true)
  const reconnectOnVisibilityChange = useRef<boolean>(false)
  const retryCountRef = useRef(0)
  const maxRetries = 5
  const lastProcessedMessageIds = useRef<Set<string>>(new Set())
  const initializeGlobalNotifications = useRef<() => Promise<void>>(() => Promise.resolve())

  // Track online status and visibility for AFK detection
  const isOnlineRef = useRef(typeof window !== 'undefined' ? navigator.onLine : true)
  const isVisibleRef = useRef(typeof document !== 'undefined' ? !document.hidden : true)
  const hasBeenAFK = useRef(false)

  // Retry function with exponential backoff and visibility checks
  const retryConnection = useRef((reason: string) => {
    // Don't retry if page is hidden and it's just a visibility-related error
    if (!isVisibleRef.current && (reason === 'CHANNEL_ERROR' || reason === 'TIMED_OUT')) {
      reconnectOnVisibilityChange.current = true
      return
    }

    if (retryCountRef.current >= maxRetries) {
      if (isVisibleRef.current) {
        console.log(`❌ Max retries (${maxRetries}) reached for universal notifications. Will retry when page becomes visible.`)
      }
      reconnectOnVisibilityChange.current = true
      return
    }

    retryCountRef.current++
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 30000) // Cap at 30 seconds for AFK scenarios
    
    // Only log retry attempts when page is visible
    if (isVisibleRef.current) {
      console.log(`🔄 Retrying universal notifications (${retryCountRef.current}/${maxRetries}) after ${delay}ms due to: ${reason}`)
    }
    setTimeout(() => {
      // Check if we should still retry (user might have left, page might be hidden)
      if (!user || !isVisibleRef.current) {
        return
      }
      
      if (!isInitializingRef.current) {
        // Clean up existing channel
        if (globalChannelRef.current) {
          try {
            const supabase = createClient()
            supabase.removeChannel(globalChannelRef.current)
          } catch (error) {
            // Silent cleanup during AFK
            if (isVisibleRef.current) {
              console.warn('⚠️ Error during retry cleanup:', error)
            }
          }
          globalChannelRef.current = null
        }
        
        // Reset initialization flag and retry
        isInitializingRef.current = false
        initializeGlobalNotifications.current()
      }
    }, delay)
  })

  // Initialize online and visibility tracking
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      console.log('🌐 Connection restored')
      isOnlineRef.current = true
      if (reconnectOnVisibilityChange.current && isVisibleRef.current) {
        console.log('🔄 Reconnecting on connection restore...')
        retryCountRef.current = 0
        reconnectOnVisibilityChange.current = false
        initializeGlobalNotifications.current()
      }
    }

    const handleOffline = () => {
      console.log('📴 Connection lost')
      isOnlineRef.current = false
    }

    const handleVisibilityChange = () => {
      const wasVisible = isVisibleRef.current
      isVisibleRef.current = typeof document !== 'undefined' ? !document.hidden : true

      if (!wasVisible && isVisibleRef.current) {
        // Page became visible
        console.log('👀 Page became visible')
        hasBeenAFK.current = false
        
        if (reconnectOnVisibilityChange.current && isOnlineRef.current) {
          console.log('🔄 Reconnecting on visibility change...')
          retryCountRef.current = 0
          reconnectOnVisibilityChange.current = false
          initializeGlobalNotifications.current()
        }
      } else if (wasVisible && !isVisibleRef.current) {
        // Page became hidden
        console.log('🌙 Page became hidden - entering AFK mode')
        hasBeenAFK.current = true
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Initialize and set up the universal message listener
  useEffect(() => {
    // Only initialize if user is available
    if (!user) {
      console.log('🔕 User not available yet, skipping global notifications setup')
      return
    }

    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('🔄 Already initializing, skipping duplicate setup')
      return
    }

    // Check if we should initialize during AFK periods
    if (!isOnlineRef.current || (!isVisibleRef.current && hasBeenAFK.current)) {
      console.log('📴 Offline or AFK - deferring notifications setup')
      reconnectOnVisibilityChange.current = true
      return
    }

    isInitializingRef.current = true

    // Cleanup any existing channel first
    if (globalChannelRef.current) {
      console.log('🧹 Cleaning up existing channel before creating new one')
      const supabase = createClient()
      supabase.removeChannel(globalChannelRef.current)
      globalChannelRef.current = null
    }

    // Define the initialization function
    initializeGlobalNotifications.current = async () => {
      try {
        // Check if we should initialize during AFK periods
        if (!isOnlineRef.current) {
          reconnectOnVisibilityChange.current = true
          return
        }

        if (!isVisibleRef.current && hasBeenAFK.current) {
          reconnectOnVisibilityChange.current = true
          return
        }

        // Wait a bit to ensure authentication is stable
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Double-check user is still available after delay
        if (!user) {
          console.log('🔕 User no longer available after delay, aborting')
          return
        }
        
        // Double-check connection state after delay
        if (!isOnlineRef.current) {
          reconnectOnVisibilityChange.current = true
          return
        }
        
        // Initialize notification manager first
        if (typeof window !== 'undefined') {
          const state = notificationManager.getPermissionState()
          if (state.supported && state.permission === 'default') {
            console.log('🔔 Requesting notification permission...')
            await notificationManager.requestPermission()
          }
        }
        
        const supabase = createClient()
        
        // Use the passed user parameter instead of fetching
        console.log('👤 Global notifications user:', user.id)
        currentUserIdRef.current = user.id
        
        // Test basic connectivity before setting up channels (like working useChat hook)
        try {
          const testQuery = await supabase.from('rooms').select('id').limit(1)
          if (testQuery.error) {
            console.error('❌ Connectivity test failed for notifications:', testQuery.error)
            retryConnection.current('CONNECTIVITY_FAILED')
            return
          }
          console.log('✅ Database connectivity verified for notifications')
        } catch (connectivityError) {
          console.error('❌ Connectivity test error:', connectivityError)
          retryConnection.current('CONNECTIVITY_ERROR')
          return
        }
        
        // Get all room IDs the user is a member of
        const { data: memberships, error: membershipError } = await supabase
          .from('room_memberships')
          .select('room_id, rooms!inner(name)')
          .eq('user_id', user.id)
        
        if (membershipError) {
          console.error('❌ Error loading user rooms for notifications:', membershipError)
          retryConnection.current('MEMBERSHIP_ERROR')
          return
        }
        
        const roomIds = new Set(memberships?.map((m: any) => m.room_id) || [])
        const roomNames = memberships?.map((m: any) => m.rooms.name) || []
        
        console.log('🏠 User is member of rooms:', roomNames)
        console.log('🆔 Tracking room IDs:', Array.from(roomIds))
        setUserRoomIds(roomIds)
        
        // Set up ONE global listener for ALL messages (with proper config like working hook)
        console.log('🌐 Setting up UNIVERSAL message listener for all rooms...')
        console.log('📡 Supabase client ready:', !!supabase)
        
        // Create unique channel name to prevent conflicts
        const channelName = `global-notifications-${user.id}-${Date.now()}`
        console.log('📡 Creating channel:', channelName)
        
        const globalChannel = supabase
          .channel(channelName, {
            config: {
              broadcast: {
                self: false // We don't need to receive our own messages
              }
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              // No filter - listen to ALL messages from ALL rooms
            },
            async (payload) => {
              console.log('� New message received:', payload.new?.id)
              try {
                const message = payload.new as any
                
                // Skip if already processed
                if (lastProcessedMessageIds.current.has(message.id)) {
                  return
                }
                
                // Skip if message is from current user
                if (message.user_id === currentUserIdRef.current) {
                  return
                }
                
                // Add to processed messages set
                lastProcessedMessageIds.current.add(message.id)
                
                // Keep only last 50 message IDs to prevent memory leak
                if (lastProcessedMessageIds.current.size > 50) {
                  const idsArray = Array.from(lastProcessedMessageIds.current)
                  lastProcessedMessageIds.current = new Set(idsArray.slice(-50))
                }

                // Get room name and sender info
                let roomName = 'Unknown Room'
                let senderName = 'Someone'
                
                try {
                  // Get room name
                  const { data: room } = await supabase
                    .from('rooms')
                    .select('name')
                    .eq('id', message.room_id)
                    .single()
                  
                  if (room?.name) {
                    roomName = room.name
                  }
                  
                  // Get sender profile
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', message.user_id)
                    .single()
                  
                  if (profile?.username) {
                    senderName = profile.username
                  }
                } catch (error) {
                  console.warn('Failed to get room/sender info:', error)
                }

                // Show notification if conditions are met
                if (notificationManager.shouldShowNotification()) {
                  try {
                    await showMessageNotification({
                      content: message.content,
                      sender_name: senderName,
                      room_name: roomName,
                      room_id: message.room_id,
                      message_id: message.id
                    })
                  } catch (notifError) {
                    console.error('❌ Failed to show notification:', notifError)
                  }
                }
                
              } catch (error) {
                console.error('Error in universal notification handler:', error)
              }
            }
          )
          .subscribe((status) => {
            // Early AFK detection to prevent any console output during AFK
            const isCurrentlyVisible = typeof document !== 'undefined' ? !document.hidden : true
            const isReallyVisible = isVisibleRef.current && isCurrentlyVisible && !hasBeenAFK.current
            
            if (status === 'SUBSCRIBED') {
              if (isReallyVisible) {
                console.log('🎉 UNIVERSAL LISTENER SUCCESSFULLY SUBSCRIBED!')
              }
              // Reset retry counter on successful connection
              retryCountRef.current = 0
              reconnectOnVisibilityChange.current = false
            } else if (status === 'CHANNEL_ERROR') {
              // Complete silence during AFK - no logging whatsoever
              if (!isReallyVisible) {
                reconnectOnVisibilityChange.current = true
                return // Exit early to prevent any processing
              }
              // Only process errors when definitely visible and active
              console.error('❌ Universal listener channel error!')
              retryConnection.current('CHANNEL_ERROR')
            } else if (status === 'TIMED_OUT') {
              // Complete silence during AFK - no logging whatsoever
              if (!isReallyVisible || !isOnlineRef.current) {
                reconnectOnVisibilityChange.current = true
                return // Exit early
              }
              console.error('⏰ Universal listener timed out!')
              retryConnection.current('TIMED_OUT')
            } else if (status === 'CLOSED') {
              // Complete silence during AFK - no logging whatsoever
              if (!isReallyVisible) {
                reconnectOnVisibilityChange.current = true
                return // Exit early
              }
              if (isOnlineRef.current && retryCountRef.current < maxRetries) {
                console.log('🔒 Universal listener channel closed')
                setTimeout(() => {
                  retryConnection.current('CLOSED')
                }, 2000)
              } else {
                reconnectOnVisibilityChange.current = true
              }
            }
          })

        globalChannelRef.current = globalChannel
        
      } catch (error) {
        console.error('❌ Failed to initialize universal notifications:', error)
        console.log('🔄 Will retry on next user change...')
        // Clean up any partial setup
        if (globalChannelRef.current) {
          try {
            const supabase = createClient()
            supabase.removeChannel(globalChannelRef.current)
          } catch (cleanupError) {
            console.warn('⚠️ Error during error cleanup:', cleanupError)
          }
          globalChannelRef.current = null
        }
        
        // Retry with backoff
        retryConnection.current('INITIALIZATION_ERROR')
      } finally {
        isInitializingRef.current = false
      }
    }

    // Start the initialization
    initializeGlobalNotifications.current()

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up global notifications...')
      if (globalChannelRef.current) {
        try {
          const supabase = createClient()
          supabase.removeChannel(globalChannelRef.current)
          console.log('✅ Global notifications channel cleaned up')
        } catch (error) {
          console.warn('⚠️ Error cleaning up global notifications:', error)
        }
        globalChannelRef.current = null
      }
    }
  }, [user?.id]) // Only re-run when user ID changes

  return {
    userRoomIds,
    isActive: !!globalChannelRef.current
  }
}