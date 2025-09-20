// Real-time presence tracking
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface UserPresence {
  user_id: string
  username: string
  avatar_url: string | null
  last_seen: string
}

export function useRoomPresence(roomId: string | null, currentUser: any) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  
  useEffect(() => {
    if (!roomId || !currentUser) return
    
    const supabase = createClient()
    let channel: RealtimeChannel
    
    const setupPresence = async () => {
      try {
        channel = supabase.channel(`room:${roomId}:presence`)
        
        // Track user presence
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            const users: UserPresence[] = []
            const seenUsers = new Set<string>()
            
            // Convert presence state to user list (deduplicated)
            Object.keys(state).forEach((userId) => {
              const presences = state[userId] as any[]
              if (presences.length > 0 && !seenUsers.has(userId)) {
                users.push(presences[0] as UserPresence)
                seenUsers.add(userId)
              }
            })
            
            setOnlineUsers(users)
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', key, newPresences)
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left:', key, leftPresences)
          })
          .subscribe(async (status) => {
            console.log('Presence subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Presence tracking enabled for room:', roomId)
              // Track current user
              try {
                await channel.track({
                  user_id: currentUser.id,
                  username: currentUser.user_metadata?.name || currentUser.email,
                  avatar_url: currentUser.user_metadata?.avatar_url || null,
                  last_seen: new Date().toISOString()
                })
              } catch (error) {
                console.error('Error tracking presence:', error)
              }
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Presence tracking failed - continuing without it')
            } else if (status === 'TIMED_OUT') {
              console.warn('⏰ Presence subscription timed out')
            }
          })
      } catch (error) {
        console.error('Presence setup error:', error)
      }
    }
    
    setupPresence()
    
    return () => {
      if (channel) {
        channel.untrack()
        supabase.removeChannel(channel)
      }
    }
  }, [roomId, currentUser])
  
  return onlineUsers
}
