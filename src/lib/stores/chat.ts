// Chat store using Zustand for state management with intelligent caching
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { cacheManager } from '@/lib/cache/CacheManager'

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
  edited_at?: string
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
  last_message_at?: string
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
      // Cache the message immediately
      const cached = await cacheManager.cacheMessage(message)
      
      if (cached) {
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
              )
            }
          }
          
          console.log('➕ Adding new message:', message.id)
          return {
            messages: [...state.messages, message].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          }
        })
      }
    },

    updateMessage: async (messageId, updates) => {
      // Update in cache
      await cacheManager.updateMessage(messageId, updates)
      
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
      const currentRoom = get().currentRoom
      if (currentRoom) {
        // Remove from cache
        await cacheManager.removeMessage(messageId, currentRoom.id)
      }
      
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
          // Cache the messages
          await cacheManager.cacheMessages(currentRoom.id, validMessages)
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
      rooms: [...state.rooms, room].sort((a, b) => a.name.localeCompare(b.name))
    })),
    
    setRooms: async (rooms) => {
      // This would need the current user ID - for now we'll skip caching
      // In practice, you'd get the user ID from your auth system
      // await cacheManager.cacheRooms(currentUserId, rooms)
      
      set({ 
        rooms: rooms.sort((a, b) => a.name.localeCompare(b.name)) 
      })
      
      // Trigger smart preloading
      await cacheManager.triggerSmartPreloading(rooms)
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
        const cachedMessages = await cacheManager.getMessages(roomId)
        
        if (cachedMessages.length > 0) {
          console.log(`✅ Found ${cachedMessages.length} cached messages`)
          set({ messages: cachedMessages })
          return cachedMessages
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
        // Try to get from cache first
        const cachedRooms = await cacheManager.getRooms(userId)
        
        if (cachedRooms && cachedRooms.length > 0) {
          console.log(`✅ Found ${cachedRooms.length} cached rooms`)
          set({ rooms: cachedRooms })
          
          // Trigger smart preloading
          await cacheManager.triggerSmartPreloading(cachedRooms)
          
          return cachedRooms
        }
        
        // If no cached rooms, this would fetch from server
        // For now, return empty array
        console.log('📭 No cached rooms found')
        return []
        
      } catch (error) {
        console.error('❌ Error loading rooms with cache:', error)
        set({ error: 'Failed to load rooms' })
        return []
      }
    },
    
    updateCacheStatus: async (): Promise<void> => {
      try {
        const status = await cacheManager.getStatus()
        set({
          cacheStatus: {
            isOnline: status.isOnline,
            lastSync: status.syncStatus.lastSync,
            pendingOperations: status.syncStatus.pendingOperations
          }
        })
      } catch (error) {
        console.error('❌ Error updating cache status:', error)
      }
    },
    
    clearCache: async (): Promise<void> => {
      try {
        await cacheManager.clearAll()
        console.log('🧹 Cache cleared successfully')
      } catch (error) {
        console.error('❌ Error clearing cache:', error)
      }
    }
  }))
)
