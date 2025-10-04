/**
 * React hook for cache system integration
 * Provides real-time cache updates and bandwidth optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cacheSystem, type Message, type CoupleMessage, type User, type Room, type RoomMember, type RoomInfo, type CacheStats } from '../cache/CacheSystemManager'

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

  const cacheCoupleMessage = useCallback(async (message: CoupleMessage, fromNetwork = false) => {
    await cacheSystem.cacheCoupleMessage(message, fromNetwork)
  }, [])

  const getCachedCoupleMessage = useCallback(async (id: string) => {
    return await cacheSystem.getCoupleMessage(id)
  }, [])

  const getCachedCoupleMessagesByRoom = useCallback(async (roomId: string, limit = 50, offset = 0) => {
    return await cacheSystem.getCoupleMessagesByRoom(roomId, limit, offset)
  }, [])

  const cacheRoomInfo = useCallback(async (roomInfo: RoomInfo, fromNetwork = false) => {
    await cacheSystem.cacheRoomInfo(roomInfo, fromNetwork)
  }, [])

  const getCachedRoomInfo = useCallback(async (roomId: string) => {
    return await cacheSystem.getCachedRoomInfo(roomId)
  }, [])

  const getCachedRoomMembers = useCallback(async (roomId: string) => {
    return await cacheSystem.getCachedRoomMembers(roomId)
  }, [])

  const updateRoomMemberStatus = useCallback(async (memberId: string, roomId: string, status: string) => {
    await cacheSystem.updateRoomMemberStatus(memberId, roomId, status)
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
    cacheCoupleMessage,
    getCachedCoupleMessage,
    getCachedCoupleMessagesByRoom,
    cacheUser,
    getCachedUser,
    cacheRoom,
    getCachedRoom,
    cacheRoomInfo,
    getCachedRoomInfo,
    getCachedRoomMembers,
    updateRoomMemberStatus,
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

// Room Info Cache Hook with optimized loading
export function useRoomInfoCache(roomId: string | null) {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { cacheRoomInfo, getCachedRoomInfo, getCachedRoomMembers, updateRoomMemberStatus } = useCacheSystem()

  const loadRoomInfo = useCallback(async (fromNetwork: boolean = false) => {
    if (!roomId) {
      setRoomInfo(null)
      setMembers([])
      setLoading(false)
      return
    }

    setError(null)
    
    try {
      // OPTIMIZATION: Check cache synchronously first
      const cachedRoomInfo = await getCachedRoomInfo(roomId)
      
      if (cachedRoomInfo && !fromNetwork) {
        // Immediately show cached data (no loading state!)
        console.log(`⚡ Instantly loaded room info from cache: ${cachedRoomInfo.room.name}`)
        setRoomInfo(cachedRoomInfo)
        setMembers(cachedRoomInfo.members)
        setLoading(false)
        
        // Optional: Fetch fresh data in background if cache is old (stale-while-revalidate)
        const cacheAge = Date.now() - new Date(cachedRoomInfo.lastUpdated).getTime()
        if (cacheAge > 60000) { // If cache is older than 1 minute
          console.log(`� Cache is old, refreshing in background...`)
          fetchRoomInfoFromNetwork(roomId).then(async networkRoomInfo => {
            if (networkRoomInfo) {
              await cacheRoomInfo(networkRoomInfo, true)
              setRoomInfo(networkRoomInfo)
              setMembers(networkRoomInfo.members)
            }
          }).catch(err => console.error('Background refresh failed:', err))
        }
      } else {
        // No cache or force network - show loading
        setLoading(true)
        console.log(`📡 Fetching room info from server...`)
        const networkRoomInfo = await fetchRoomInfoFromNetwork(roomId)
        if (networkRoomInfo) {
          await cacheRoomInfo(networkRoomInfo, true)
          setRoomInfo(networkRoomInfo)
          setMembers(networkRoomInfo.members)
        }
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Error loading room info:', err)
      setError(err.message || 'Failed to load room info')
      setLoading(false)
    }
  }, [roomId, getCachedRoomInfo, cacheRoomInfo])

  useEffect(() => {
    loadRoomInfo()
  }, [loadRoomInfo])

  const updateMemberStatus = useCallback(async (memberId: string, status: string) => {
    if (!roomId) return
    
    try {
      await updateRoomMemberStatus(memberId, roomId, status)
      
      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, status } : member
      ))
      
      // Update room info if it exists
      setRoomInfo(prev => prev ? {
        ...prev,
        members: prev.members.map(member => 
          member.id === memberId ? { ...member, status } : member
        ),
        lastUpdated: new Date().toISOString()
      } : null)
      
      console.log(`🔄 Updated member status: ${memberId} -> ${status}`)
    } catch (err: any) {
      console.error('Error updating member status:', err)
    }
  }, [roomId, updateRoomMemberStatus])

  const refreshRoomInfo = useCallback(() => {
    loadRoomInfo()
  }, [loadRoomInfo])

  return {
    roomInfo,
    members,
    loading,
    error,
    updateMemberStatus,
    refreshRoomInfo
  }
}

// Mock function - would be replaced with actual Supabase call
async function fetchUserFromNetwork(userId: string): Promise<User | null> {
  // This would be replaced with actual Supabase query
  return null
}

// Actual Supabase query for room info and members
async function fetchRoomInfoFromNetwork(roomId: string): Promise<RoomInfo | null> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    // Get room info
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    
    if (roomError || !room) {
      console.error('Error fetching room:', roomError)
      return null
    }
    
    // First, check if room_memberships table exists, if not use messages table
    let members: RoomMember[] = []
    
    // Try to get from room_memberships first
    const { data: memberships, error: membersError } = await supabase
      .from('room_memberships')
      .select('user_id, role, joined_at')
      .eq('room_id', roomId)
    
    if (membersError) {
      console.log('room_memberships table not found, using messages table:', membersError)
      
      // Fallback: get unique users from messages in this room
      const { data: messageUsers, error: msgError } = await supabase
        .from('messages')
        .select(`
          user_id,
          profiles!inner (
            id,
            username,
            avatar_url,
            status,
            last_seen
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
      
      if (!msgError && messageUsers) {
        // Get unique users
        const uniqueUsers = new Map()
        messageUsers.forEach((msg: any) => {
          if (msg.profiles && !uniqueUsers.has(msg.user_id)) {
            uniqueUsers.set(msg.user_id, {
              id: msg.profiles.id,
              username: msg.profiles.username || 'Unknown User',
              avatar_url: msg.profiles.avatar_url,
              status: msg.profiles.status || 'offline',
              last_seen: msg.profiles.last_seen || new Date().toISOString(),
              role: msg.user_id === room.created_by ? 'owner' : 'member',
              joined_at: new Date().toISOString()
            })
          }
        })
        members = Array.from(uniqueUsers.values())
      }
    } else if (memberships && memberships.length > 0) {
      // Get profile data for each member
      const userIds = memberships.map(m => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status, last_seen')
        .in('id', userIds)
      
      members = memberships.map((membership: any) => {
        const profile = profiles?.find(p => p.id === membership.user_id)
        return {
          id: membership.user_id,
          username: profile?.username || 'Unknown User',
          email: '',
          avatar_url: profile?.avatar_url,
          status: profile?.status || 'offline',
          last_seen: profile?.last_seen || new Date().toISOString(),
          role: membership.role || 'member',
          joined_at: membership.joined_at || new Date().toISOString()
        }
      })
    }
    
    const roomInfo: RoomInfo = {
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        created_by: room.created_by,
        created_at: room.created_at,
        updated_at: room.updated_at || room.created_at
      },
      members,
      memberCount: members.length,
      lastUpdated: new Date().toISOString()
    }
    
    console.log(`📡 Fetched room info from network: ${room.name} (${members.length} members)`)
    return roomInfo
  } catch (error) {
    console.error('Error in fetchRoomInfoFromNetwork:', error)
    return null
  }
}