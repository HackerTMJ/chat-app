// Chat store using Zustand for state management with intelligent caching
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { cacheSystem } from '@/lib/cache/CacheSystemManager'

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
  edited_at?: string
  username?: string
  avatar_url?: string | null
  profiles?: {
    username: string
    avatar_url: string | null
  }
}

export interface Room {
  id: string
  code: string
  name: string
  created_by: string
  created_at: string
  updated_at?: string
  last_message_at?: string
  latest_message_timestamp?: string // For sorting by latest message
}

export interface TypingUser {
  userId: string
  username: string
  timestamp: number
}

interface ChatState {
  // Current state
  currentRoom: Room | null
  messages: Message[]
  rooms: Room[]
  isLoading: boolean
  error: string | null
  typingUsers: TypingUser[]
  
  // Caching state
  cacheStatus: {
    isOnline: boolean
    lastSync: Date | null
    pendingOperations: number
  }
  
  // Actions
  setCurrentRoom: (room: Room | null) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  deleteMessage: (messageId: string) => void
  setMessages: (messages: Message[]) => void
  addRoom: (room: Room) => void
  setRooms: (rooms: Room[]) => void
  removeRoom: (roomId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  addTypingUser: (user: TypingUser) => void
  removeTypingUser: (userId: string) => void
  clearTypingUsers: () => void
  
  // Cache actions
  loadMessagesWithCache: (roomId: string) => Promise<Message[]>
  loadRoomsWithCache: (userId: string) => Promise<Room[]>
  updateCacheStatus: () => Promise<void>
  clearCache: () => Promise<void>
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentRoom: null,
    messages: [],
    rooms: [],
    isLoading: false,
    error: null,
    typingUsers: [],
    cacheStatus: {
      isOnline: navigator.onLine,
      lastSync: null,
      pendingOperations: 0
    },
    
    // Actions
    setCurrentRoom: (room) => {
      set({ currentRoom: room })
      // Clear messages when switching rooms
      if (room?.id !== get().currentRoom?.id) {
        set({ messages: [] })
        
        // Load messages from cache for the new room
        if (room) {
          get().loadMessagesWithCache(room.id)
        }
      }
    },
    
    addMessage: async (message) => {
      // Transform message for cache system
      const cacheMessage = {
        ...message,
        username: message.profiles?.username || message.username || 'Unknown',
        avatar_url: message.profiles?.avatar_url || message.avatar_url || null
      }
      
      // Cache the message immediately
      await cacheSystem.cacheMessage(cacheMessage, true)
      
      set((state) => {
        // Check if message already exists to prevent duplicates
        const existingMessage = state.messages.find(m => m.id === message.id)
        if (existingMessage) {
          console.log('🔄 Message already exists, updating:', message.id)
          // Update existing message (in case profile data was added)
          return {
            messages: state.messages.map(m => 
              m.id === message.id ? message : m
            ).sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
            // Update the room's latest message timestamp and re-sort rooms
            rooms: state.rooms.map(room => 
              room.id === message.room_id 
                ? { ...room, latest_message_timestamp: message.created_at }
                : room
            ).sort((a, b) => {
              const aTime = new Date(
                a.latest_message_timestamp || a.last_message_at || a.created_at
              ).getTime()
              const bTime = new Date(
                b.latest_message_timestamp || b.last_message_at || b.created_at
              ).getTime()
              return bTime - aTime // Most recent first
            })
          }
        }
        
        console.log('➕ Adding new message:', message.id)
        const newState = {
          messages: [...state.messages, message].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
          // Update the room's latest message timestamp and re-sort rooms
          rooms: state.rooms.map(room => 
            room.id === message.room_id 
              ? { ...room, latest_message_timestamp: message.created_at }
              : room
          ).sort((a, b) => {
            const aTime = new Date(
              a.latest_message_timestamp || a.last_message_at || a.created_at
            ).getTime()
            const bTime = new Date(
              b.latest_message_timestamp || b.last_message_at || b.created_at
            ).getTime()
            return bTime - aTime // Most recent first
          })
        }
        return newState
      })
    },

    updateMessage: async (messageId, updates) => {
      // Get current message for cache update
      const currentMessage = get().messages.find(m => m.id === messageId)
      if (currentMessage) {
        const updatedMessage = {
          ...currentMessage,
          ...updates,
          username: currentMessage.profiles?.username || currentMessage.username || 'Unknown',
          avatar_url: currentMessage.profiles?.avatar_url || currentMessage.avatar_url || null
        }
        await cacheSystem.cacheMessage(updatedMessage, true)
      }
      
      set((state) => {
        // Handle ID changes (optimistic → real reconciliation)
        if (updates.id && updates.id !== messageId) {
          console.log(`🔄 Store: ID change ${messageId} → ${updates.id}`)
          // Remove old message and add updated one with new ID
          const oldMessage = state.messages.find(m => m.id === messageId)
          if (oldMessage) {
            const updatedMessage = { ...oldMessage, ...updates }
            return {
              messages: state.messages
                .filter(m => m.id !== messageId) // Remove temp
                .filter(m => m.id !== updates.id) // Remove any existing with real ID
                .concat(updatedMessage) // Add reconciled
                .sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            }
          }
        }
        
        // Normal update without ID change
        return {
          messages: state.messages.map(m => 
            m.id === messageId ? { ...m, ...updates } : m
          )
        }
      })
    },

    deleteMessage: async (messageId) => {
      // Note: CacheSystemManager doesn't have a direct delete method
      // The message will expire via TTL or be evicted via LRU
      
      set((state) => ({
        messages: state.messages.filter(m => m.id !== messageId)
      }))
    },
    
    setMessages: async (messages) => {
      // Filter out invalid messages before processing
      const validMessages = messages.filter(msg => {
        // Basic validation
        if (!msg || typeof msg !== 'object' || Object.keys(msg).length === 0) {
          console.warn('Store: Filtering out empty message object:', msg)
          return false
        }
        
        // Check for essential fields
        if (!msg.id || !msg.room_id || !msg.user_id || !msg.content) {
          console.warn('Store: Filtering out message with missing essential fields:', msg)
          return false
        }
        
        // Additional check for valid string values
        if (typeof msg.id !== 'string' || typeof msg.room_id !== 'string' || 
            typeof msg.user_id !== 'string' || typeof msg.content !== 'string') {
          console.warn('Store: Filtering out message with invalid field types:', msg)
          return false
        }
        
        return true
      })
      
      if (validMessages.length !== messages.length) {
        console.log(`Store: Filtered out ${messages.length - validMessages.length} invalid messages`)
      }
      
      // Only cache if we have valid messages
      const currentRoom = get().currentRoom
      if (currentRoom && validMessages.length > 0) {
        try {
          // Cache the messages with the new cache system
          for (const message of validMessages) {
            const cacheMessage = {
              ...message,
              username: message.profiles?.username || message.username || 'Unknown',
              avatar_url: message.profiles?.avatar_url || message.avatar_url || null
            }
            await cacheSystem.cacheMessage(cacheMessage, true)
          }
        } catch (error) {
          console.error('Store: Failed to cache messages:', error)
        }
      }
      
      set({ 
        messages: validMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ) 
      })
    },
    
    addRoom: (room) => set((state) => ({
      rooms: [...state.rooms, room].sort((a, b) => {
        const aTime = new Date(
          a.latest_message_timestamp || a.last_message_at || a.created_at
        ).getTime()
        const bTime = new Date(
          b.latest_message_timestamp || b.last_message_at || b.created_at
        ).getTime()
        return bTime - aTime // Most recent first
      })
    })),
    
    setRooms: async (rooms) => {
      const sortedRooms = rooms.sort((a, b) => {
        const aTime = new Date(
          a.latest_message_timestamp || a.last_message_at || a.created_at
        ).getTime()
        const bTime = new Date(
          b.latest_message_timestamp || b.last_message_at || b.created_at
        ).getTime()
        return bTime - aTime // Most recent first
      })
      
      set({ rooms: sortedRooms })
      
      // Cache rooms in the new cache system
      for (const room of rooms) {
        const cacheRoom = {
          ...room,
          updated_at: room.updated_at || room.created_at || new Date().toISOString()
        }
        cacheSystem.cacheRoom(cacheRoom)
      }
      
      // Prefetch messages for active rooms (optional)
      for (const room of rooms.slice(0, 3)) { // Only first 3 rooms
        await cacheSystem.prefetchRoomMessages(room.id, 20)
      }
    },
    
    removeRoom: (roomId) => set((state) => ({
      rooms: state.rooms.filter(room => room.id !== roomId)
    })),
    
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    clearMessages: () => set({ messages: [] }),
    
    // Typing indicator actions
    addTypingUser: (user) => set((state) => {
      // Remove existing entry for this user and add new one
      const filteredUsers = state.typingUsers.filter(u => u.userId !== user.userId)
      return {
        typingUsers: [...filteredUsers, user]
      }
    }),
    
    removeTypingUser: (userId) => set((state) => ({
      typingUsers: state.typingUsers.filter(u => u.userId !== userId)
    })),
    
    clearTypingUsers: () => set({ typingUsers: [] }),
    
    // Cache methods
    loadMessagesWithCache: async (roomId: string): Promise<Message[]> => {
      console.log(`🔍 Loading messages for room ${roomId} with cache`)
      
      try {
        // Try to get from cache first
        const cachedMessages = await cacheSystem.getMessagesByRoom(roomId, 100, 0)
        
        if (cachedMessages.length > 0) {
          console.log(`✅ Found ${cachedMessages.length} cached messages`)
          // Transform cache messages back to store format
          const storeMessages = cachedMessages.map(msg => ({
            ...msg,
            profiles: msg.username ? {
              username: msg.username,
              avatar_url: msg.avatar_url || null
            } : undefined
          }))
          set({ messages: storeMessages })
          return storeMessages
        }
        
        // If no cached messages, this would fetch from server
        // For now, return empty array
        console.log('📭 No cached messages found')
        return []
        
      } catch (error) {
        console.error('❌ Error loading messages with cache:', error)
        set({ error: 'Failed to load messages' })
        return []
      }
    },
    
    loadRoomsWithCache: async (userId: string): Promise<Room[]> => {
      console.log(`🔍 Loading rooms for user ${userId} with cache`)
      
      try {
        // For now, the cache system doesn't have user-specific room caching
        // We'll just return empty array and let the regular loading handle it
        console.log('📭 Room caching not implemented in new cache system yet')
        return []
        
      } catch (error) {
        console.error('❌ Error loading rooms with cache:', error)
        set({ error: 'Failed to load rooms' })
        return []
      }
    },
    
    updateCacheStatus: async (): Promise<void> => {
      try {
        const stats = cacheSystem.getStats()
        set({
          cacheStatus: {
            isOnline: navigator.onLine,
            lastSync: new Date(),
            pendingOperations: 0
          }
        })
      } catch (error) {
        console.error('❌ Error updating cache status:', error)
      }
    },
    
    clearCache: async (): Promise<void> => {
      try {
        cacheSystem.clear()
        console.log('🧹 Cache cleared successfully')
      } catch (error) {
        console.error('❌ Error clearing cache:', error)
      }
    }
  }))
)
