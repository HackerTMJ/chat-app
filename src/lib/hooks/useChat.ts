// Real-time chat hooks
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore, Message, Room } from '@/lib/stores/chat'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealTimeMessages(roomId: string | null) {
  const { addMessage, setError } = useChatStore()
  
  useEffect(() => {
    if (!roomId) return
    
    const supabase = createClient()
    let channel: RealtimeChannel
    
    const setupRealtime = async () => {
      try {
        channel = supabase
          .channel(`room:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              console.log('New message received:', payload)
              const newMessage = payload.new as Message
              
              // Fetch the profile data for the new message since real-time doesn't include joins
              const fetchProfileAndAddMessage = async () => {
                try {
                  const supabase = createClient()
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', newMessage.user_id)
                    .single()
                  
                  // Add profile data to the message
                  const messageWithProfile = {
                    ...newMessage,
                    profiles: profile || undefined
                  }
                  
                  addMessage(messageWithProfile as Message)
                } catch (error) {
                  console.error('Error fetching profile for new message:', error)
                  // Add message without profile as fallback
                  addMessage(newMessage)
                }
              }
              
              fetchProfileAndAddMessage()
            }
          )
          .subscribe((status) => {
            console.log('Real-time subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to real-time messages for room:', roomId)
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Real-time subscription error for room:', roomId)
              // Don't show error to user, just log it - app still works without real-time
            } else if (status === 'TIMED_OUT') {
              console.warn('⏰ Real-time subscription timed out, retrying...')
            } else if (status === 'CLOSED') {
              console.log('🔒 Real-time subscription closed')
            }
          })
      } catch (error) {
        console.error('Real-time setup error:', error)
        // Don't show error to user - app works without real-time
      }
    }
    
    setupRealtime()
    
    return () => {
      if (channel) {
        console.log('Cleaning up real-time subscription for room:', roomId)
        supabase.removeChannel(channel)
      }
    }
  }, [roomId, addMessage, setError])
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
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('name', { ascending: true })
        
        if (error) throw error
        
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
      setError(`Failed to send message: ${error.message}`)
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
      
      // First, find the room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.trim().toUpperCase())
        .single()
      
      if (roomError) {
        if (roomError.code === 'PGRST116') {
          setError('Room not found. Please check the room code.')
        } else {
          throw roomError
        }
        return null
      }
      
      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('room_memberships')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single()
      
      if (existingMembership) {
        // Already a member, just return the room
        addRoom(room)
        return room
      }
      
      // Join the room
      const { error: joinError } = await supabase
        .from('room_memberships')
        .insert({
          room_id: room.id,
          user_id: userId
        })
      
      if (joinError) throw joinError
      
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
