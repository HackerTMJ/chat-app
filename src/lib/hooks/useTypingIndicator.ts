// Typing indicator hook for real-time typing events
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/lib/stores/chat'
import type { RealtimeChannel } from '@supabase/supabase-js'

const TYPING_TIMEOUT = 3000 // 3 seconds
const TYPING_THROTTLE = 1000 // 1 second throttle

export function useTypingIndicator(roomId: string | null, currentUser: any) {
  const { addTypingUser, removeTypingUser, clearTypingUsers } = useChatStore()
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastTypingTimeRef = useRef<number>(0)
  const channelRef = useRef<RealtimeChannel | undefined>(undefined)

  useEffect(() => {
    if (!roomId || !currentUser) return

    const supabase = createClient()
    
    // Setup typing indicator channel
    const channel = supabase
      .channel(`typing-${roomId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('👀 Typing event received:', payload)
        
        const { userId, username, action } = payload.payload
        
        if (action === 'start' && userId !== currentUser.id) {
          addTypingUser({
            userId,
            username,
            timestamp: Date.now()
          })
        } else if (action === 'stop' && userId !== currentUser.id) {
          removeTypingUser(userId)
        }
      })

    channel.subscribe((status) => {
      console.log('🔄 Typing channel status:', status)
    })

    channelRef.current = channel

    // Cleanup typing users on unmount or room change
    return () => {
      clearTypingUsers()
      channel.unsubscribe()
    }
  }, [roomId, currentUser, addTypingUser, removeTypingUser, clearTypingUsers])

  // Function to broadcast typing start
  const startTyping = () => {
    if (!channelRef.current || !currentUser) return

    const now = Date.now()
    
    // Throttle typing events
    if (now - lastTypingTimeRef.current < TYPING_THROTTLE) {
      return
    }

    lastTypingTimeRef.current = now

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUser.id,
        username: currentUser.user_metadata?.name || currentUser.email,
        action: 'start'
      }
    })

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT)
  }

  // Function to broadcast typing stop
  const stopTyping = () => {
    if (!channelRef.current || !currentUser) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUser.id,
        username: currentUser.user_metadata?.name || currentUser.email,
        action: 'stop'
      }
    })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    startTyping,
    stopTyping
  }
}

// Custom hook to manage automatic typing cleanup
export function useTypingCleanup() {
  const { typingUsers, removeTypingUser } = useChatStore()

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      typingUsers.forEach(user => {
        if (now - user.timestamp > TYPING_TIMEOUT + 1000) {
          removeTypingUser(user.userId)
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [typingUsers, removeTypingUser])
}