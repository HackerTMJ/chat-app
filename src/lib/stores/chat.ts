// Chat store using Zustand for state management
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
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
}

interface ChatState {
  // Current state
  currentRoom: Room | null
  messages: Message[]
  rooms: Room[]
  isLoading: boolean
  error: string | null
  
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
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentRoom: null,
    messages: [],
    rooms: [],
    isLoading: false,
    error: null,
    
    // Actions
    setCurrentRoom: (room) => {
      set({ currentRoom: room })
      // Clear messages when switching rooms
      if (room?.id !== get().currentRoom?.id) {
        set({ messages: [] })
      }
    },
    
    addMessage: (message) => set((state) => {
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
    }),

    updateMessage: (messageId, updates) => set((state) => ({
      messages: state.messages.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      )
    })),

    deleteMessage: (messageId) => set((state) => ({
      messages: state.messages.filter(m => m.id !== messageId)
    })),
    
    setMessages: (messages) => set({ 
      messages: messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ) 
    }),
    
    addRoom: (room) => set((state) => ({
      rooms: [...state.rooms, room].sort((a, b) => a.name.localeCompare(b.name))
    })),
    
    setRooms: (rooms) => set({ 
      rooms: rooms.sort((a, b) => a.name.localeCompare(b.name)) 
    }),
    
    removeRoom: (roomId) => set((state) => ({
      rooms: state.rooms.filter(room => room.id !== roomId)
    })),
    
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    clearMessages: () => set({ messages: [] })
  }))
)
