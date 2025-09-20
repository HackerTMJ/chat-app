// Real-time chat hooks
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore, Message, Room } from '@/lib/stores/chat'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealTimeMessages(roomId: string | null) {
  const { addMessage, updateMessage, deleteMessage, setError } = useChatStore()
  
  useEffect(() => {
    if (!roomId) return
    
    const supabase = createClient()
    let channel: RealtimeChannel
    let reconnectTimeout: NodeJS.Timeout
    let isConnected = false
    
    const setupRealtime = async () => {
      try {
        console.log('🚀 Setting up real-time for room:', roomId)
        
        // Clear any existing error when attempting to connect
        setError(null)
        
        // Simple channel name without complex formatting
        channel = supabase
          .channel(`messages-${roomId}`, {
            config: {
              presence: {
                key: 'user'
              },
              broadcast: {
                self: true
              }
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              console.log('🔥 REAL-TIME MESSAGE INSERT!', payload)
              console.log('🔥 Message data:', payload.new)
              
              const newMessage = payload.new as Message
              
              // Fetch profile and add message (addMessage will handle duplicates)
              const fetchProfileAndAddMessage = async () => {
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', newMessage.user_id)
                    .single()
                  
                  console.log('✅ Adding real-time message with profile')
                  addMessage({
                    ...newMessage,
                    profiles: profile || { username: 'Unknown User', avatar_url: null }
                  } as Message)
                } catch (error) {
                  console.log('Profile fetch error, adding message without profile:', error)
                  addMessage({
                    ...newMessage,
                    profiles: { username: 'Unknown User', avatar_url: null }
                  } as Message)
                }
              }
              
              fetchProfileAndAddMessage()
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              console.log('🔄 REAL-TIME MESSAGE UPDATE!', payload)
              console.log('🔄 Updated message data:', payload.new)
              
              const updatedMessage = payload.new as Message
              updateMessage(updatedMessage.id, updatedMessage)
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              console.log('🗑️ REAL-TIME MESSAGE DELETE!', payload)
              console.log('🗑️ Deleted message data:', payload.old)
              
              const deletedMessage = payload.old as Message
              deleteMessage(deletedMessage.id)
            }
          )
          .subscribe((status) => {
            console.log('📡 Real-time status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ SUCCESSFULLY SUBSCRIBED to room:', roomId)
              isConnected = true
              setError(null) // Clear any previous errors
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ CHANNEL ERROR for room:', roomId)
              isConnected = false
              setError('Connection lost. Attempting to reconnect...')
              
              // Attempt to reconnect after 3 seconds
              reconnectTimeout = setTimeout(() => {
                console.log('🔄 Attempting to reconnect...')
                setupRealtime()
              }, 3000)
            } else if (status === 'TIMED_OUT') {
              console.warn('⏰ SUBSCRIPTION TIMED OUT')
              isConnected = false
              setError('Connection timed out. Reconnecting...')
              
              // Attempt to reconnect after 2 seconds
              reconnectTimeout = setTimeout(() => {
                console.log('🔄 Reconnecting after timeout...')
                setupRealtime()
              }, 2000)
            } else if (status === 'CLOSED') {
              console.warn('🔌 CONNECTION CLOSED')
              isConnected = false
              if (document.visibilityState === 'visible') {
                setError('Connection closed. Reconnecting...')
                reconnectTimeout = setTimeout(() => {
                  console.log('🔄 Reconnecting after close...')
                  setupRealtime()
                }, 1000)
              }
            }
          })
      } catch (error) {
        console.error('Real-time setup error:', error)
        setError('Failed to setup real-time connection')
        
        // Retry setup after 5 seconds
        reconnectTimeout = setTimeout(() => {
          console.log('🔄 Retrying real-time setup...')
          setupRealtime()
        }, 5000)
      }
    }
    
    // Handle page visibility changes (when user comes back from AFK)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('👁️ Page became visible, checking connection...')
        setError('Reconnecting...')
        setTimeout(() => {
          setupRealtime()
        }, 500)
      }
    }
    
    // Handle online/offline events
    const handleOnline = () => {
      console.log('🌐 Back online, reconnecting...')
      if (!isConnected) {
        setError('Back online. Reconnecting...')
        setTimeout(() => {
          setupRealtime()
        }, 1000)
      }
    }
    
    const handleOffline = () => {
      console.log('📴 Gone offline')
      setError('No internet connection')
    }
    
    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setupRealtime()
    
    return () => {
      // Clean up
      if (channel) {
        console.log('🧹 Cleaning up real-time subscription for room:', roomId)
        supabase.removeChannel(channel)
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [roomId, addMessage, updateMessage, deleteMessage, setError])
}

export function useLoadMessages(roomId: string | null) {
  const { setMessages, setLoading, setError } = useChatStore()
  
  useEffect(() => {
    if (!roomId) return
    
    const loadMessages = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100) // Limit to last 100 messages
        
        if (error) throw error
        
        console.log('Loaded messages:', data)
        console.log('First message structure:', data?.[0])
        
        setMessages(data || [])
      } catch (error: any) {
        console.error('Error loading messages:', error)
        setError(`Failed to load messages: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }
    
    loadMessages()
  }, [roomId, setMessages, setLoading, setError])
}

export function useLoadRooms() {
  const { setRooms, setError } = useChatStore()
  
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        // Only load rooms the user is a member of
        const { data, error } = await supabase
          .from('rooms')
          .select(`
            *,
            room_memberships!inner(user_id)
          `)
          .eq('room_memberships.user_id', user.id)
          .order('name', { ascending: true })
        
        if (error) throw error
        
        console.log('Loaded rooms for user:', data)
        setRooms(data || [])
      } catch (error: any) {
        console.error('Error loading rooms:', error)
        setError(`Failed to load rooms: ${error.message}`)
      }
    }
    
    loadRooms()
  }, [setRooms, setError])
}

export function useSendMessage() {
  const { currentRoom, addMessage, setError } = useChatStore()
  
  const sendMessage = async (content: string, userId: string) => {
    if (!currentRoom || !content.trim()) return false
    
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoom.id,
          user_id: userId,
          content: content.trim()
        })
        .select()
        .single()
      
      if (error) throw error
      
      // The message will be added via real-time subscription
      return true
    } catch (error: any) {
      console.error('Error sending message:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred'
      setError(`Failed to send message: ${errorMessage}`)
      return false
    }
  }
  
  return sendMessage
}

export function useCreateRoom() {
  const { addRoom, setError } = useChatStore()
  
  const createRoom = async (name: string, userId: string) => {
    if (!name.trim()) return null
    
    try {
      const supabase = createClient()
      
      // Generate a unique room code
      const code = `ROOM_${Date.now()}`
      
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          code,
          name: name.trim(),
          created_by: userId
        })
        .select()
        .single()
      
      if (error) throw error
      
      addRoom(data)
      return data
    } catch (error: any) {
      console.error('Error creating room:', error)
      setError(`Failed to create room: ${error.message}`)
      return null
    }
  }
  
  return createRoom
}

export function useJoinRoom() {
  const { addRoom, setError } = useChatStore()
  
  const joinRoom = async (roomCode: string, userId: string) => {
    if (!roomCode.trim()) return null
    
    try {
      const supabase = createClient()
      
      // Debug: Log what we're searching for
      console.log('🔍 Searching for room with code:', roomCode.trim().toUpperCase())
      
      // Use the special function to find room by code (bypasses RLS)
      const { data: rooms, error: roomError } = await supabase
        .rpc('find_room_by_code', { room_code: roomCode.trim() })
      
      // Debug: Log the result
      console.log('🔍 Room search result:', { rooms, roomError })
      
      if (roomError) {
        console.log('❌ Room search error:', roomError)
        throw roomError
      }
      
      if (!rooms || rooms.length === 0) {
        console.log('❌ Room not found with code:', roomCode.trim().toUpperCase())
        setError('Room not found. Please check the room code.')
        return null
      }
      
      const room = rooms[0]
      console.log('✅ Room found:', room)
      
      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('room_memberships')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single()
      
      if (existingMembership) {
        console.log('✅ User already a member, returning room')
        // Already a member, just return the room
        addRoom(room)
        return room
      }
      
      console.log('🔗 Joining room as new member')
      
      // Join the room
      const { error: joinError } = await supabase
        .from('room_memberships')
        .insert({
          room_id: room.id,
          user_id: userId
        })
      
      if (joinError) {
        console.log('❌ Error joining room:', joinError)
        throw joinError
      }
      
      console.log('✅ Successfully joined room')
      addRoom(room)
      return room
    } catch (error: any) {
      console.error('Error joining room:', error)
      setError(`Failed to join room: ${error.message}`)
      return null
    }
  }
  
  return joinRoom
}

export function useDeleteRoom() {
  const { removeRoom, setCurrentRoom, setError } = useChatStore()
  
  const deleteRoom = async (roomId: string, userId: string) => {
    try {
      const supabase = createClient()
      
      // Check if user is the room creator (admin)
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('created_by')
        .eq('id', roomId)
        .single()
      
      if (roomError) throw roomError
      
      if (room.created_by !== userId) {
        setError('Only room creators can delete rooms')
        return false
      }
      
      // Delete the room (cascade will delete memberships and messages)
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
      
      if (error) throw error
      
      // Remove room from local state immediately
      removeRoom(roomId)
      
      // If current room was deleted, clear it
      setCurrentRoom(null)
      
      return true
    } catch (error: any) {
      console.error('Error deleting room:', error)
      setError(`Failed to delete room: ${error.message}`)
      return false
    }
  }
  
  return deleteRoom
}

export function useLeaveRoom() {
  const { removeRoom, setCurrentRoom, setError } = useChatStore()
  
  const leaveRoom = async (roomId: string, userId: string) => {
    try {
      const supabase = createClient()
      
      // Check if it's the PUBLIC room (can't leave)
      const { data: room } = await supabase
        .from('rooms')
        .select('code, created_by')
        .eq('id', roomId)
        .single()
      
      if (room?.code === 'PUBLIC') {
        setError('Cannot leave the PUBLIC room')
        return false
      }
      
      // Check if user is the room creator
      if (room?.created_by === userId) {
        setError('Room creators cannot leave their own rooms. Delete the room instead.')
        return false
      }
      
      // Remove membership
      const { error } = await supabase
        .from('room_memberships')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId)
      
      if (error) throw error
      
      // Remove room from local state immediately
      removeRoom(roomId)
      
      // If current room was left, clear it
      setCurrentRoom(null)
      
      return true
    } catch (error: any) {
      console.error('Error leaving room:', error)
      setError(`Failed to leave room: ${error.message}`)
      return false
    }
  }
  
  return leaveRoom
}
