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
    let channel: RealtimeChannel | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isConnected = false
    let isMounted = true
    let reconnectAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 5
    
    const setupRealtime = async () => {
      try {
        console.log('🚀 Setting up real-time for room:', roomId)
        
        // Don't setup if component is unmounted
        if (!isMounted) return
        
        // Clear any existing error when attempting to connect
        if (isMounted) {
          setError(null)
        }
        
        // Clean up existing channel if any
        if (channel) {
          try {
            await supabase.removeChannel(channel)
            channel = null
          } catch (e) {
            console.warn('Error removing existing channel:', e)
          }
        }
        
        // Check auth status before setting up realtime
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.error('Auth error before realtime setup:', authError)
          if (isMounted) {
            setError('Authentication error. Please refresh and login again.')
          }
          return
        }
        
        if (!user) {
          console.warn('No authenticated user for realtime setup')
          if (isMounted) {
            setError('Please login to receive real-time updates.')
          }
          return
        }
        
        console.log('✅ User authenticated for realtime:', user.id)
        
        // Test basic connectivity before setting up channels
        try {
          const testQuery = await supabase.from('rooms').select('id').limit(1)
          if (testQuery.error) {
            console.error('Connectivity test failed:', testQuery.error)
            if (isMounted) {
              setError('Database connection issue. Please check your internet connection.')
            }
            return
          }
          console.log('✅ Database connectivity verified')
        } catch (connectivityError) {
          console.error('Connectivity test error:', connectivityError)
          if (isMounted) {
            setError('Network connectivity issue. Please check your internet connection.')
          }
          return
        }
        
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
              try {
                if (!isMounted) return
                
                console.log('🔥 REAL-TIME MESSAGE INSERT!', payload)
                console.log('🔥 Message data:', payload.new)
                
                const newMessage = payload.new as Message
                
                // Check if we already have this exact message (from optimistic update)
                // Look for messages with same content, user_id, and similar timestamp
                const existingOptimistic = useChatStore.getState().messages.find(m => 
                  m.content === newMessage.content &&
                  m.user_id === newMessage.user_id &&
                  m.room_id === newMessage.room_id &&
                  m.id.startsWith('temp-') &&
                  Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000 // Within 5 seconds
                )
                
                if (existingOptimistic) {
                  console.log('🔄 Real-time found matching optimistic message, reconciling:', existingOptimistic.id, '→', newMessage.id)
                  // Update the optimistic message with real data instead of adding duplicate
                  const { updateMessage } = useChatStore.getState()
                  updateMessage(existingOptimistic.id, newMessage)
                  return // Skip adding duplicate
                }
                
                // Fetch profile and add message (addMessage will handle duplicates)
                const fetchProfileAndAddMessage = async () => {
                  try {
                    if (!isMounted) return
                    
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('username, avatar_url')
                      .eq('id', newMessage.user_id)
                      .single()
                    
                    if (!isMounted) return
                    
                    console.log('✅ Adding real-time message with profile')
                    addMessage({
                      ...newMessage,
                      profiles: profile || { username: 'Unknown User', avatar_url: null }
                    } as Message)
                  } catch (error) {
                    if (!isMounted) return
                    
                    console.log('Profile fetch error, adding message without profile:', error)
                    addMessage({
                      ...newMessage,
                      profiles: { username: 'Unknown User', avatar_url: null }
                    } as Message)
                  }
                }
                
                fetchProfileAndAddMessage().catch(e => {
                  console.warn('Error in fetchProfileAndAddMessage:', e)
                })
              } catch (error) {
                console.warn('Error in INSERT handler:', error)
              }
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
              try {
                if (!isMounted) return
                
                console.log('🔄 REAL-TIME MESSAGE UPDATE!', payload)
                console.log('🔄 Updated message data:', payload.new)
                
                const updatedMessage = payload.new as Message
                updateMessage(updatedMessage.id, updatedMessage)
              } catch (error) {
                console.warn('Error in UPDATE handler:', error)
              }
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
              try {
                if (!isMounted) return
                
                console.log('🗑️ REAL-TIME MESSAGE DELETE!', payload)
                console.log('🗑️ Deleted message data:', payload.old)
                
                if (payload.old && payload.old.id) {
                  const deletedMessage = payload.old as Message
                  console.log('🗑️ Deleting message with ID via real-time:', deletedMessage.id)
                  
                  // Check if message still exists in store before deleting
                  const currentMessages = useChatStore.getState().messages
                  const messageExists = currentMessages.find(m => m.id === deletedMessage.id)
                  
                  if (messageExists) {
                    console.log('🗑️ Message found in store, removing via real-time...')
                    deleteMessage(deletedMessage.id)
                  } else {
                    console.log('🗑️ Message already removed from store (probably by immediate deletion)')
                  }
                } else {
                  console.error('🗑️ No message ID in DELETE payload:', payload)
                }
              } catch (error) {
                console.warn('Error in DELETE handler:', error)
              }
            }
          )
          .subscribe((status) => {
            try {
              if (!isMounted) return
              
              console.log('📡 Real-time status:', status)
              if (status === 'SUBSCRIBED') {
                console.log('✅ SUCCESSFULLY SUBSCRIBED to room:', roomId)
                isConnected = true
                reconnectAttempts = 0 // Reset reconnect attempts on successful connection
                if (isMounted) {
                  setError(null) // Clear any previous errors
                }
              } else if (status === 'CHANNEL_ERROR') {
                // Silently handle channel errors - they're usually temporary connection issues
                // Only log when page is visible and we have multiple failures
                if (document.visibilityState === 'visible' && reconnectAttempts > 2) {
                  console.log('Connection issue detected, attempting reconnection...')
                }
                
                // Check if it's an auth issue (silently)
                supabase.auth.getUser().then(({ data: { user }, error }) => {
                  if (error || !user) {
                    if (isMounted && document.visibilityState === 'visible') {
                      setError('Authentication expired. Please refresh and login again.')
                    }
                  }
                })
                
                isConnected = false
                
                // Only show error messages when page is visible and after multiple attempts
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && isMounted && document.visibilityState === 'visible' && reconnectAttempts > 1) {
                  const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000)
                  setError(`Connection lost. Reconnecting in ${Math.round(delay/1000)}s... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
                  
                  // Clear existing timeout
                  if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout)
                    reconnectTimeout = null
                  }
                  
                  reconnectTimeout = setTimeout(() => {
                    if (isMounted) {
                      reconnectAttempts++
                      console.log(`🔄 Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`)
                      setupRealtime().catch(e => {
                        console.warn('Reconnect attempt failed:', e)
                      })
                    }
                  }, delay)
                } else if (isMounted && document.visibilityState === 'visible') {
                  setError('Connection failed after multiple attempts. Please check your internet connection and refresh the page.')
                  console.error('Max reconnection attempts reached')
                }
              } else if (status === 'TIMED_OUT') {
                if (document.visibilityState === 'visible') {
                  console.warn('⏰ SUBSCRIPTION TIMED OUT')
                }
                isConnected = false
                
                if (isMounted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && document.visibilityState === 'visible') {
                  setError('Connection timed out. Reconnecting...')
                  
                  reconnectTimeout = setTimeout(() => {
                    if (isMounted) {
                      reconnectAttempts++
                      console.log('🔄 Reconnecting after timeout...')
                      setupRealtime().catch(e => {
                        console.warn('Timeout reconnect failed:', e)
                      })
                    }
                  }, 2000)
                }
              } else if (status === 'CLOSED') {
                if (document.visibilityState === 'visible') {
                  console.warn('🔌 CONNECTION CLOSED')
                }
                isConnected = false
                if (isMounted && document.visibilityState === 'visible' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                  setError('Connection closed. Reconnecting...')
                  reconnectTimeout = setTimeout(() => {
                    if (isMounted) {
                      reconnectAttempts++
                      console.log('🔄 Reconnecting after close...')
                      setupRealtime().catch(e => {
                        console.warn('Close reconnect failed:', e)
                      })
                    }
                  }, 1000)
                }
              }
            } catch (error) {
              console.warn('Error in subscription status handler:', error)
            }
          })
      } catch (error) {
        console.error('Real-time setup error:', error)
        
        // Check if it's a network issue
        if (!navigator.onLine) {
          if (isMounted) {
            setError('No internet connection. Real-time updates disabled.')
          }
          return
        }
        
        if (isMounted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setError(`Failed to setup real-time connection. Retrying in 5s... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
          
          // Retry setup after 5 seconds
          reconnectTimeout = setTimeout(() => {
            if (isMounted) {
              reconnectAttempts++
              console.log('🔄 Retrying real-time setup...')
              setupRealtime().catch(e => {
                console.warn('Setup retry failed:', e)
              })
            }
          }, 5000)
        } else if (isMounted) {
          setError('Unable to establish real-time connection. Messages will still be sent, but you may need to refresh to see new messages from others.')
        }
      }
    }
    
    // Handle page visibility changes (when user comes back from AFK)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible, checking connection...')
        
        // Clear any existing error messages when coming back from AFK
        if (isMounted) {
          setError(null)
        }
        
        // If connection is lost, try to reconnect
        if (!isConnected && isMounted) {
          console.log('🔄 Reconnecting after returning from AFK...')
          // Reset reconnect attempts when user returns
          reconnectAttempts = 0
          
          // Small delay to ensure page is fully active
          setTimeout(() => {
            if (isMounted && document.visibilityState === 'visible') {
              setupRealtime().catch(e => {
                console.warn('Visibility reconnect failed:', e)
              })
            }
          }, 500)
        }
      } else {
        console.log('👁️ Page became hidden (AFK mode)')
        // Don't show error messages when going AFK
        if (isMounted) {
          setError(null)
        }
      }
    }
    
    // Handle online/offline events
    const handleOnline = () => {
      console.log('🌐 Back online, reconnecting...')
      if (!isConnected && isMounted) {
        // Reset reconnect attempts when back online
        reconnectAttempts = 0
        setError('Back online. Reconnecting...')
        setTimeout(() => {
          if (isMounted) {
            setupRealtime().catch(e => {
              console.warn('Online reconnect failed:', e)
            })
          }
        }, 1000)
      }
    }
    
    const handleOffline = () => {
      console.log('📴 Gone offline')
      if (isMounted) {
        setError('No internet connection')
      }
    }
    
    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setupRealtime().catch(e => {
      console.warn('Initial setup failed:', e)
      if (isMounted) {
        setError('Failed to establish connection. Retrying...')
      }
    })
    
    // Health check every 30 seconds
    const healthCheckInterval = setInterval(() => {
      if (!isMounted) return
      
      if (channel && !isConnected && navigator.onLine) {
        console.log('🏥 Health check: Connection lost, attempting reconnect...')
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setupRealtime().catch(e => {
            console.warn('Health check reconnect failed:', e)
          })
        }
      }
    }, 30000)
    
    // Global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('CHANNEL ERROR')) {
        // Silently handle channel errors - prevent console spam
        event.preventDefault() // Prevent the error from bubbling up
        return false
      }
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'string' && event.reason.includes('CHANNEL ERROR')) {
        // Silently handle channel error rejections - prevent console spam
        event.preventDefault() // Prevent the error from bubbling up
      }
    }
    
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      // Mark as unmounted to prevent any further operations
      isMounted = false
      
      // Clean up health check
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
      }
      
      // Clean up channel with better error handling
      if (channel) {
        console.log('🧹 Cleaning up real-time subscription for room:', roomId)
        try {
          // Unsubscribe from channel first
          const unsubscribeResult = channel.unsubscribe()
          console.log('📴 Channel unsubscribe result:', unsubscribeResult)
          
          // Then remove from client
          const removeResult = supabase.removeChannel(channel)
          console.log('🗑️ Channel remove result:', removeResult)
          
          // Reset channel reference
          channel = null
          isConnected = false
          
        } catch (e) {
          console.warn('Error during channel cleanup:', e)
          // Force reset even if cleanup failed
          channel = null
          isConnected = false
        }
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [roomId, addMessage, updateMessage, deleteMessage, setError])
}

export function useLoadMessages(roomId: string | null) {
  const { setMessages, setLoading, setError, loadMessagesWithCache } = useChatStore()
  
  useEffect(() => {
    if (!roomId) return
    
    const loadMessages = async () => {
      try {
        setLoading(true)
        
        // First try to load from cache
        const cachedMessages = await loadMessagesWithCache(roomId)
        
        if (cachedMessages.length > 0) {
          console.log(`✅ Loaded ${cachedMessages.length} messages from cache`)
          setMessages(cachedMessages)
          setLoading(false)
          return
        }
        
        // If no cached messages, fetch from Supabase
        console.log('📡 No cached messages, fetching from server...')
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
        
        console.log('Loaded messages from server:', data)
        console.log('First message structure:', data?.[0])
        
        // Validate and log message data before setting
        const validatedData = (data || []).map((msg, index) => {
          console.log(`Message ${index}:`, {
            id: msg?.id,
            room_id: msg?.room_id,
            user_id: msg?.user_id,
            content: msg?.content,
            keys: Object.keys(msg || {}),
            isEmpty: !msg || Object.keys(msg || {}).length === 0
          })
          return msg
        }).filter(msg => {
          // Filter out any obviously invalid messages
          if (!msg || typeof msg !== 'object' || Object.keys(msg).length === 0) {
            console.error('Found empty message object from Supabase:', msg)
            return false
          }
          return true
        })
        
        console.log(`Hook: Validated ${validatedData.length} out of ${(data || []).length} messages`)
        setMessages(validatedData)
        
        // Cache the messages for future use
        if (validatedData.length > 0) {
          const { cacheManager } = await import('@/lib/cache/CacheManager')
          await cacheManager.cacheMessages(roomId, validatedData)
          console.log(`💾 Cached ${validatedData.length} messages for room ${roomId}`)
        }
        
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
  const { setRooms, setError, loadRoomsWithCache } = useChatStore()
  
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('No user found, skipping room loading')
          return
        }

        console.log('Loading rooms for user:', user.id)
        
        // First try to load from cache
        const cachedRooms = await loadRoomsWithCache(user.id)
        
        if (cachedRooms.length > 0) {
          console.log(`✅ Loaded ${cachedRooms.length} rooms from cache`)
          setRooms(cachedRooms)
          return
        }
        
        // If no cached rooms, fetch from Supabase
        console.log('📡 No cached rooms, fetching from server...')
        
        // Try a simpler approach - first get user's memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('user_id', user.id)
        
        if (membershipError) {
          console.error('Error loading memberships:', membershipError)
          throw membershipError
        }

        console.log('User memberships:', memberships)

        if (!memberships || memberships.length === 0) {
          console.log('User has no room memberships')
          setRooms([])
          return
        }

        // Get room IDs
        const roomIds = memberships.map(m => m.room_id)
        console.log('Room IDs:', roomIds)

        // Now get the actual rooms
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .order('name', { ascending: true })
        
        if (roomsError) {
          console.error('Error loading rooms:', roomsError)
          throw roomsError
        }
        
        console.log('Loaded rooms from server:', rooms)
        setRooms(rooms || [])
        
        // Cache the rooms for future use
        if (rooms && rooms.length > 0) {
          const { cacheManager } = await import('@/lib/cache/CacheManager')
          await cacheManager.cacheRooms(user.id, rooms)
          console.log(`💾 Cached ${rooms.length} rooms for user ${user.id}`)
        }
        
      } catch (error: any) {
        console.error('Error loading rooms - Full error object:', error)
        console.error('Error message:', error?.message)
        console.error('Error details:', error?.details)
        console.error('Error hint:', error?.hint)
        console.error('Error code:', error?.code)
        setError(`Failed to load rooms: ${error?.message || 'Unknown error'}`)
      }
    }
    
    loadRooms()
  }, [setRooms, setError, loadRoomsWithCache])
}

export function useSendMessage() {
  const { currentRoom, addMessage, updateMessage, deleteMessage, setError } = useChatStore()

  const sendMessage = async (content: string, userId: string) => {
    if (!currentRoom || !content.trim()) return false

    // Create an optimistic message so the UI updates immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticMessage = {
      id: tempId,
      room_id: currentRoom.id,
      user_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    } as Message

    try {
      // Show immediately
      await addMessage(optimisticMessage)

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

      // Cache the new message and reconcile optimistic entry to real ID
      if (data) {
        const { cacheManager } = await import('@/lib/cache/CacheManager')
        await cacheManager.cacheMessages(currentRoom.id, [data])
        console.log(`💾 Cached new message for room ${currentRoom.id}`)

        // Replace the optimistic message with the authoritative server message
        // First update the temp message to have the real ID and data
        console.log(`🔄 Reconciling optimistic message ${tempId} → ${data.id}`)
        try { 
          await updateMessage(tempId, { ...data })
        } catch (reconcileError) {
          console.warn('Error reconciling optimistic message:', reconcileError)
          // Fallback: delete temp and add real message
          try { await deleteMessage(tempId) } catch {}
          await addMessage(data)
        }
      }      // Real-time will further enrich with profile if needed
      return true
    } catch (error: any) {
      console.error('Error sending message:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred'
      setError(`Failed to send message: ${errorMessage}`)

      // Roll back optimistic message on failure
      try { await deleteMessage(tempId) } catch {}
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
