/**
 * Room Data Cache System
 * Optimizes room settings with in-memory caching and real-time updates
 */

import { createClient } from '@/lib/supabase/client'
import type { RoomMember, RoomBannedUser, Room } from '@/types/rooms'

const supabase = createClient()

interface CacheEntry<T> {
  data: T
  timestamp: number
  promise?: Promise<T>
}

class RoomCache {
  private membersCache = new Map<string, CacheEntry<RoomMember[]>>()
  private bannedCache = new Map<string, CacheEntry<RoomBannedUser[]>>()
  private roomDetailsCache = new Map<string, CacheEntry<Room>>()
  private subscriptions = new Map<string, () => void>()
  
  // Cache duration: 5 minutes
  private readonly CACHE_TTL = 5 * 60 * 1000
  
  /**
   * Get room members with caching
   */
  async getMembers(roomId: string, forceRefresh = false): Promise<RoomMember[]> {
    const cached = this.membersCache.get(roomId)
    const now = Date.now()

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.data
    }

    // Return in-flight promise if one exists
    if (cached?.promise) {
      return cached.promise
    }

    // Fetch fresh data
    const promise = this.fetchMembers(roomId)
    this.membersCache.set(roomId, { data: [], timestamp: now, promise })

    try {
      const data = await promise
      this.membersCache.set(roomId, { data, timestamp: now })
      this.setupMembersSubscription(roomId)
      return data
    } catch (error) {
      this.membersCache.delete(roomId)
      throw error
    }
  }

  /**
   * Get banned users with caching
   */
  async getBanned(roomId: string, forceRefresh = false): Promise<RoomBannedUser[]> {
    const cached = this.bannedCache.get(roomId)
    const now = Date.now()

    if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.data
    }

    if (cached?.promise) {
      return cached.promise
    }

    const promise = this.fetchBanned(roomId)
    this.bannedCache.set(roomId, { data: [], timestamp: now, promise })

    try {
      const data = await promise
      this.bannedCache.set(roomId, { data, timestamp: now })
      this.setupBannedSubscription(roomId)
      return data
    } catch (error) {
      this.bannedCache.delete(roomId)
      throw error
    }
  }

  /**
   * Get room details with caching
   */
  async getRoomDetails(roomId: string, forceRefresh = false): Promise<Room> {
    const cached = this.roomDetailsCache.get(roomId)
    const now = Date.now()

    if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.data
    }

    if (cached?.promise) {
      return cached.promise
    }

    const promise = this.fetchRoomDetails(roomId)
    this.roomDetailsCache.set(roomId, { data: {} as Room, timestamp: now, promise })

    try {
      const data = await promise
      this.roomDetailsCache.set(roomId, { data, timestamp: now })
      this.setupRoomSubscription(roomId)
      return data
    } catch (error) {
      this.roomDetailsCache.delete(roomId)
      throw error
    }
  }

  /**
   * Invalidate specific cache
   */
  invalidate(type: 'members' | 'banned' | 'room', roomId: string) {
    switch (type) {
      case 'members':
        this.membersCache.delete(roomId)
        break
      case 'banned':
        this.bannedCache.delete(roomId)
        break
      case 'room':
        this.roomDetailsCache.delete(roomId)
        break
    }
  }

  /**
   * Invalidate all caches for a room
   */
  invalidateAll(roomId: string) {
    this.membersCache.delete(roomId)
    this.bannedCache.delete(roomId)
    this.roomDetailsCache.delete(roomId)
    
    // Cleanup subscription
    const unsubscribe = this.subscriptions.get(roomId)
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(roomId)
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.membersCache.clear()
    this.bannedCache.clear()
    this.roomDetailsCache.clear()
    
    // Cleanup all subscriptions
    this.subscriptions.forEach(unsub => unsub())
    this.subscriptions.clear()
  }

  /**
   * Optimistic update for members
   */
  updateMemberOptimistic(roomId: string, userId: string, updates: Partial<RoomMember>) {
    const cached = this.membersCache.get(roomId)
    if (!cached) return

    const updatedMembers = cached.data.map(member =>
      member.user_id === userId ? { ...member, ...updates } : member
    )
    
    this.membersCache.set(roomId, {
      data: updatedMembers,
      timestamp: cached.timestamp
    })
  }

  /**
   * Optimistic remove member
   */
  removeMemberOptimistic(roomId: string, userId: string) {
    const cached = this.membersCache.get(roomId)
    if (!cached) return

    const updatedMembers = cached.data.filter(member => member.user_id !== userId)
    this.membersCache.set(roomId, {
      data: updatedMembers,
      timestamp: cached.timestamp
    })
  }

  /**
   * Optimistic add banned user
   */
  addBannedOptimistic(roomId: string, bannedUser: RoomBannedUser) {
    const cached = this.bannedCache.get(roomId)
    if (!cached) return

    this.bannedCache.set(roomId, {
      data: [...cached.data, bannedUser],
      timestamp: cached.timestamp
    })
  }

  /**
   * Optimistic remove banned user
   */
  removeBannedOptimistic(roomId: string, userId: string) {
    const cached = this.bannedCache.get(roomId)
    if (!cached) return

    const updatedBanned = cached.data.filter(ban => ban.user_id !== userId)
    this.bannedCache.set(roomId, {
      data: updatedBanned,
      timestamp: cached.timestamp
    })
  }

  // Private fetch methods
  private async fetchMembers(roomId: string): Promise<RoomMember[]> {
    const { data, error } = await supabase
      .from('room_memberships')
      .select(`
        *,
        profile:profiles!room_memberships_user_id_fkey (
          id,
          email,
          username,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })

    if (error) throw error
    return (data || []) as RoomMember[]
  }

  private async fetchBanned(roomId: string): Promise<RoomBannedUser[]> {
    const { data, error } = await supabase
      .from('room_banned_users')
      .select(`
        *,
        banned_user_profile:profiles!room_banned_users_user_id_fkey (
          id,
          email,
          username,
          avatar_url
        ),
        banned_by_profile:profiles!room_banned_users_banned_by_fkey (
          id,
          email,
          username,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('banned_at', { ascending: false })

    if (error) throw error
    return (data || []) as RoomBannedUser[]
  }

  private async fetchRoomDetails(roomId: string): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error) throw error
    return data as Room
  }

  // Real-time subscriptions
  private setupMembersSubscription(roomId: string) {
    if (this.subscriptions.has(`members-${roomId}`)) return

    const channel = supabase
      .channel(`room-members-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_memberships',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          // Invalidate cache on any change
          this.invalidate('members', roomId)
        }
      )
      .subscribe()

    this.subscriptions.set(`members-${roomId}`, () => {
      supabase.removeChannel(channel)
    })
  }

  private setupBannedSubscription(roomId: string) {
    if (this.subscriptions.has(`banned-${roomId}`)) return

    const channel = supabase
      .channel(`room-banned-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_banned_users',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          this.invalidate('banned', roomId)
        }
      )
      .subscribe()

    this.subscriptions.set(`banned-${roomId}`, () => {
      supabase.removeChannel(channel)
    })
  }

  private setupRoomSubscription(roomId: string) {
    if (this.subscriptions.has(`room-${roomId}`)) return

    const channel = supabase
      .channel(`room-details-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        () => {
          this.invalidate('room', roomId)
        }
      )
      .subscribe()

    this.subscriptions.set(`room-${roomId}`, () => {
      supabase.removeChannel(channel)
    })
  }
}

// Singleton instance
export const roomCache = new RoomCache()

/**
 * Debounce utility for input fields
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
