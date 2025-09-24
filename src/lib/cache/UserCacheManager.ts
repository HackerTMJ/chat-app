// User Cache Manager - Manages user profiles and presence data caching
'use client'

import { User } from '@supabase/supabase-js'

export interface CachedUser {
  id: string
  username: string
  avatar_url?: string
  status?: 'online' | 'offline' | 'away'
  last_seen?: string
  cached_at: string
  expires_at: string
}

export interface UserPresence {
  user_id: string
  room_id: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

export class UserCacheManager {
  private userCache = new Map<string, CachedUser>()
  private presenceCache = new Map<string, UserPresence[]>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_USERS = 1000 // Prevent memory overflow

  constructor() {
    this.startCleanupTimer()
  }

  // Cache user profile
  cacheUser(userId: string, userData: {
    username: string
    avatar_url?: string
    status?: 'online' | 'offline' | 'away'
    last_seen?: string
  }): CachedUser {
    const now = new Date().toISOString()
    const cachedUser: CachedUser = {
      id: userId,
      username: userData.username,
      avatar_url: userData.avatar_url,
      status: userData.status || 'offline',
      last_seen: userData.last_seen || now,
      cached_at: now,
      expires_at: new Date(Date.now() + this.CACHE_DURATION).toISOString()
    }

    // Prevent cache overflow
    if (this.userCache.size >= this.MAX_USERS) {
      this.cleanupExpiredUsers()
    }

    this.userCache.set(userId, cachedUser)
    console.log(`👤 Cached user: ${userData.username} (${userId})`)
    return cachedUser
  }

  // Get user from cache
  getUser(userId: string): CachedUser | null {
    const cached = this.userCache.get(userId)
    
    if (!cached) {
      return null
    }

    // Check if expired
    if (new Date(cached.expires_at) < new Date()) {
      this.userCache.delete(userId)
      console.log(`⏰ User cache expired for ${userId}`)
      return null
    }

    console.log(`✅ Retrieved user from cache: ${cached.username}`)
    return cached
  }

  // Cache multiple users
  cacheUsers(users: Array<{
    id: string
    username: string
    avatar_url?: string
    status?: 'online' | 'offline' | 'away'
    last_seen?: string
  }>): CachedUser[] {
    return users.map(user => this.cacheUser(user.id, user))
  }

  // Update user status
  updateUserStatus(userId: string, status: 'online' | 'offline' | 'away'): boolean {
    const cached = this.userCache.get(userId)
    if (!cached) {
      return false
    }

    cached.status = status
    cached.last_seen = new Date().toISOString()
    this.userCache.set(userId, cached)
    console.log(`🔄 Updated user status: ${cached.username} is now ${status}`)
    return true
  }

  // Cache room presence
  cacheRoomPresence(roomId: string, presence: UserPresence[]): void {
    this.presenceCache.set(roomId, presence.map(p => ({
      ...p,
      last_seen: p.last_seen || new Date().toISOString()
    })))
    console.log(`🏠 Cached presence for room ${roomId}: ${presence.length} users`)
  }

  // Get room presence
  getRoomPresence(roomId: string): UserPresence[] {
    const presence = this.presenceCache.get(roomId) || []
    console.log(`📍 Retrieved presence for room ${roomId}: ${presence.length} users`)
    return presence
  }

  // Update user presence in room
  updateUserPresence(roomId: string, userId: string, status: 'online' | 'offline' | 'away'): void {
    const presence = this.presenceCache.get(roomId) || []
    const existingIndex = presence.findIndex(p => p.user_id === userId)
    
    const updatedPresence: UserPresence = {
      user_id: userId,
      room_id: roomId,
      status,
      last_seen: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      presence[existingIndex] = updatedPresence
    } else {
      presence.push(updatedPresence)
    }

    this.presenceCache.set(roomId, presence)
    console.log(`👥 Updated presence: User ${userId} is ${status} in room ${roomId}`)
  }

  // Get online users in room
  getOnlineUsersInRoom(roomId: string): UserPresence[] {
    const presence = this.getRoomPresence(roomId)
    return presence.filter(p => p.status === 'online')
  }

  // Get user statistics
  getUserStats(): {
    totalCachedUsers: number
    onlineUsers: number
    totalRooms: number
    cacheHitRate: number
    memoryUsage: string
  } {
    const totalUsers = this.userCache.size
    const onlineUsers = Array.from(this.userCache.values())
      .filter(user => user.status === 'online').length
    
    const totalRooms = this.presenceCache.size
    
    // Estimate memory usage
    const userDataSize = totalUsers * 200 // Rough estimate per user
    const presenceDataSize = totalRooms * 100 // Rough estimate per room
    const totalSize = userDataSize + presenceDataSize
    
    return {
      totalCachedUsers: totalUsers,
      onlineUsers,
      totalRooms,
      cacheHitRate: totalUsers > 0 ? (onlineUsers / totalUsers) : 0,
      memoryUsage: `${(totalSize / 1024).toFixed(1)} KB`
    }
  }

  // Search users by username
  searchUsers(query: string): CachedUser[] {
    const searchTerm = query.toLowerCase()
    return Array.from(this.userCache.values())
      .filter(user => 
        user.username.toLowerCase().includes(searchTerm) &&
        new Date(user.expires_at) > new Date()
      )
      .sort((a, b) => {
        // Online users first, then by username
        if (a.status === 'online' && b.status !== 'online') return -1
        if (b.status === 'online' && a.status !== 'online') return 1
        return a.username.localeCompare(b.username)
      })
  }

  // Clean up expired users
  private cleanupExpiredUsers(): void {
    const now = new Date()
    let removedCount = 0

    for (const [userId, user] of this.userCache.entries()) {
      if (new Date(user.expires_at) < now) {
        this.userCache.delete(userId)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired users from cache`)
    }
  }

  // Clear all user cache
  clearAllUsers(): void {
    const userCount = this.userCache.size
    const roomCount = this.presenceCache.size
    
    this.userCache.clear()
    this.presenceCache.clear()
    
    console.log(`🧹 Cleared all user cache: ${userCount} users, ${roomCount} rooms`)
  }

  // Clear specific room presence
  clearRoomPresence(roomId: string): void {
    this.presenceCache.delete(roomId)
    console.log(`🧹 Cleared presence cache for room ${roomId}`)
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return // Skip on server

    setInterval(() => {
      this.cleanupExpiredUsers()
    }, 60 * 1000) // Clean up every minute
  }

  // Export cache for debugging
  exportCache(): {
    users: CachedUser[]
    presence: Record<string, UserPresence[]>
    stats: {
      totalCachedUsers: number
      onlineUsers: number
      totalRooms: number
      cacheHitRate: number
      memoryUsage: string
    }
  } {
    return {
      users: Array.from(this.userCache.values()),
      presence: Object.fromEntries(this.presenceCache.entries()),
      stats: this.getUserStats()
    }
  }
}

// Global user cache manager instance
export const userCacheManager = new UserCacheManager()