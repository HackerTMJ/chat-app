/**
 * React hook for cache system integration
 * Provides real-time cache updates and bandwidth optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cacheSystem, type Message, type User, type Room, type CacheStats } from '../cache/CacheSystemManager'

export function useCacheSystem() {
  const [stats, setStats] = useState<CacheStats>(cacheSystem.getStats())
  const [isOnline, setIsOnline] = useState(navigator.onLine !== false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Subscribe to cache updates
    unsubscribeRef.current = cacheSystem.subscribe(() => {
      setStats(cacheSystem.getStats())
    })

    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribeRef.current?.()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const cacheMessage = useCallback(async (message: Message, fromNetwork = false) => {
    await cacheSystem.cacheMessage(message, fromNetwork)
  }, [])

  const getCachedMessage = useCallback(async (id: string) => {
    return await cacheSystem.getMessage(id)
  }, [])

  const getCachedMessagesByRoom = useCallback(async (roomId: string, limit = 50, offset = 0) => {
    return await cacheSystem.getMessagesByRoom(roomId, limit, offset)
  }, [])

  const cacheUser = useCallback((user: User) => {
    cacheSystem.cacheUser(user)
  }, [])

  const getCachedUser = useCallback((id: string) => {
    return cacheSystem.getUser(id)
  }, [])

  const cacheRoom = useCallback((room: Room) => {
    cacheSystem.cacheRoom(room)
  }, [])

  const getCachedRoom = useCallback((id: string) => {
    return cacheSystem.getRoom(id)
  }, [])

  const prefetchRoomMessages = useCallback(async (roomId: string, count = 20) => {
    await cacheSystem.prefetchRoomMessages(roomId, count)
  }, [])

  const clearCache = useCallback(() => {
    cacheSystem.clear()
  }, [])

  const clearMessages = useCallback(() => {
    cacheSystem.clearMessages()
  }, [])

  const exportCache = useCallback(() => {
    return cacheSystem.export()
  }, [])

  const importCache = useCallback(async (data: ReturnType<typeof cacheSystem.export>) => {
    await cacheSystem.import(data)
  }, [])

  const optimizeCache = useCallback(() => {
    return cacheSystem.optimize()
  }, [])

  const deepCleanCache = useCallback(() => {
    return cacheSystem.deepClean()
  }, [])

  const warmCache = useCallback(async (roomId: string, userId: string) => {
    await cacheSystem.warmCache(roomId, userId)
  }, [])

  return {
    stats,
    isOnline,
    cacheMessage,
    getCachedMessage,
    getCachedMessagesByRoom,
    cacheUser,
    getCachedUser,
    cacheRoom,
    getCachedRoom,
    prefetchRoomMessages,
    warmCache,
    clearCache,
    clearMessages,
    exportCache,
    importCache,
    optimizeCache,
    deepCleanCache,
    // Utility functions
    getBandwidthSaved: () => stats.bandwidthSaved,
    getHitRate: () => stats.hitRate,
    getTotalSize: () => stats.totalSize,
    getMessageCount: () => stats.messagesCount
  }
}

export function useMessageCache(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const { getCachedMessagesByRoom, cacheMessage, getCachedMessage, prefetchRoomMessages } = useCacheSystem()

  const loadMessages = useCallback(async (limit = 50, offset = 0, fromNetwork = false) => {
    setLoading(true)
    try {
      let cachedMessages: Message[] = []
      
      if (!fromNetwork) {
        // Try to get from cache first
        cachedMessages = await getCachedMessagesByRoom(roomId, limit, offset)
      }

      if (cachedMessages.length === 0 || fromNetwork) {
        // If no cached messages or explicitly requesting from network
        // This would be replaced with actual Supabase call
        const networkMessages = await fetchMessagesFromNetwork(roomId, limit, offset)
        
        // Cache the network messages
        for (const message of networkMessages) {
          await cacheMessage(message, true)
        }
        
        setMessages(networkMessages)
        setHasMore(networkMessages.length === limit)
      } else {
        setMessages(cachedMessages)
        setHasMore(cachedMessages.length === limit)
        
        // Prefetch more messages in background if needed
        if (cachedMessages.length < limit / 2) {
          prefetchRoomMessages(roomId, limit)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [roomId, getCachedMessagesByRoom, cacheMessage, prefetchRoomMessages])

  const addMessage = useCallback(async (message: Message) => {
    await cacheMessage(message)
    setMessages(prev => [message, ...prev])
  }, [cacheMessage])

  const updateMessage = useCallback(async (messageId: string, updates: Partial<Message>) => {
    const cachedMessage = await getCachedMessage(messageId)
    if (cachedMessage) {
      const updatedMessage = { ...cachedMessage, ...updates, edited_at: new Date().toISOString() }
      await cacheMessage(updatedMessage)
      setMessages(prev => prev.map(msg => msg.id === messageId ? updatedMessage : msg))
    }
  }, [getCachedMessage, cacheMessage])

  useEffect(() => {
    loadMessages()
  }, [roomId, loadMessages])

  return {
    messages,
    loading,
    hasMore,
    loadMessages,
    addMessage,
    updateMessage,
    refreshFromNetwork: () => loadMessages(50, 0, true)
  }
}

// Mock function - would be replaced with actual Supabase call
async function fetchMessagesFromNetwork(roomId: string, limit: number, offset: number): Promise<Message[]> {
  // This would be replaced with actual Supabase query
  return []
}

export function useUserCache() {
  const { cacheUser, getCachedUser } = useCacheSystem()
  const [users, setUsers] = useState<Map<string, User>>(new Map())

  const loadUser = useCallback(async (userId: string) => {
    let user = getCachedUser(userId)
    
    if (!user) {
      // Fetch from network
      user = await fetchUserFromNetwork(userId)
      if (user) {
        cacheUser(user)
      }
    }
    
    if (user) {
      setUsers(prev => new Map(prev).set(userId, user))
    }
    
    return user
  }, [getCachedUser, cacheUser])

  const updateUserStatus = useCallback((userId: string, status: User['status']) => {
    const user = getCachedUser(userId)
    if (user) {
      const updatedUser = { ...user, status, last_seen: new Date().toISOString() }
      cacheUser(updatedUser)
      setUsers(prev => new Map(prev).set(userId, updatedUser))
    }
  }, [getCachedUser, cacheUser])

  return {
    users: Array.from(users.values()),
    loadUser,
    updateUserStatus,
    getUser: (id: string) => users.get(id) || null
  }
}

// Mock function - would be replaced with actual Supabase call
async function fetchUserFromNetwork(userId: string): Promise<User | null> {
  // This would be replaced with actual Supabase query
  return null
}