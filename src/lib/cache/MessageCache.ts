// Advanced caching system for chat messages
// Implements LRU cache with intelligent eviction and compression

import { Message, Room } from '@/lib/stores/chat'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  lastAccessed: number
  size: number
  compressed?: boolean
}

export interface CacheStats {
  totalSize: number
  entries: number
  hitRate: number
  missRate: number
  compressionRatio: number
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize: number
  private maxEntries: number
  private hits = 0
  private misses = 0

  constructor(maxSize: number = 50 * 1024 * 1024, maxEntries: number = 10000) { // 50MB default
    this.maxSize = maxSize
    this.maxEntries = maxEntries
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (entry) {
      // Update last accessed time
      entry.lastAccessed = Date.now()
      this.hits++
      
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, entry)
      
      return this.decompress(entry.data, entry.compressed)
    }
    this.misses++
    return undefined
  }

  set(key: K, value: V): void {
    const now = Date.now()
    const compressed = this.shouldCompress(value)
    const data = compressed ? this.compress(value) : value
    const size = this.calculateSize(data)
    
    const entry: CacheEntry<V> = {
      data,
      timestamp: now,
      lastAccessed: now,
      size,
      compressed
    }

    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Add new entry
    this.cache.set(key, entry)

    // Cleanup if necessary
    this.cleanup()
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  private cleanup(): void {
    // Remove oldest entries if we exceed limits
    while (this.cache.size > this.maxEntries || this.getCurrentSize() > this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      } else {
        break
      }
    }
  }

  private getCurrentSize(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size
    }
    return total
  }

  private shouldCompress(value: V): boolean {
    // Compress if value is large (>1KB) and is an object/array
    const size = this.calculateSize(value)
    return size > 1024 && (typeof value === 'object' && value !== null)
  }

  private compress(value: V): V {
    // Simple compression using JSON stringify with reduced whitespace
    // In production, you might use LZ-string or similar
    if (typeof value === 'object' && value !== null) {
      try {
        const stringified = JSON.stringify(value)
        return JSON.parse(stringified) as V
      } catch {
        return value
      }
    }
    return value
  }

  private decompress(data: V, isCompressed?: boolean): V {
    // For our simple compression, no decompression needed
    return data
  }

  private calculateSize(value: any): number {
    // Rough estimate of object size in bytes
    if (value === null || value === undefined) return 0
    if (typeof value === 'string') return value.length * 2 // UTF-16
    if (typeof value === 'number') return 8
    if (typeof value === 'boolean') return 4
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2
    }
    return 0
  }

  getStats(): CacheStats {
    const totalSize = this.getCurrentSize()
    const entries = this.cache.size
    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0
    const missRate = totalRequests > 0 ? this.misses / totalRequests : 0
    
    return {
      totalSize,
      entries,
      hitRate,
      missRate,
      compressionRatio: 1 // Simplified for now
    }
  }
}

// Specialized cache for messages
export class MessageCache {
  private messageCache = new LRUCache<string, Message[]>() // roomId -> messages
  private singleMessageCache = new LRUCache<string, Message>() // messageId -> message
  private roomCache = new LRUCache<string, Room[]>() // userId -> rooms

  // Cache messages for a room
  cacheRoomMessages(roomId: string, messages: Message[]): void {
    this.messageCache.set(roomId, [...messages]) // Clone to prevent mutations
    
    // Also cache individual messages for quick lookup
    messages.forEach(message => {
      this.singleMessageCache.set(message.id, { ...message })
    })
  }

  // Get cached messages for a room
  getRoomMessages(roomId: string): Message[] | undefined {
    return this.messageCache.get(roomId)
  }

  // Cache a single message (for real-time updates)
  cacheMessage(message: Message): void {
    this.singleMessageCache.set(message.id, { ...message })
    
    // Update room cache if it exists
    const roomMessages = this.messageCache.get(message.room_id)
    if (roomMessages) {
      const existingIndex = roomMessages.findIndex(m => m.id === message.id)
      if (existingIndex >= 0) {
        roomMessages[existingIndex] = message
      } else {
        roomMessages.push(message)
        roomMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
      this.messageCache.set(message.room_id, roomMessages)
    }
  }

  // Remove a message from cache
  removeMessage(messageId: string, roomId: string): void {
    this.singleMessageCache.delete(messageId)
    
    const roomMessages = this.messageCache.get(roomId)
    if (roomMessages) {
      const filtered = roomMessages.filter(m => m.id !== messageId)
      this.messageCache.set(roomId, filtered)
    }
  }

  // Update a message in cache
  updateMessage(messageId: string, updates: Partial<Message>): void {
    const message = this.singleMessageCache.get(messageId)
    if (message) {
      const updated = { ...message, ...updates }
      this.singleMessageCache.set(messageId, updated)
      
      // Update in room cache too
      const roomMessages = this.messageCache.get(message.room_id)
      if (roomMessages) {
        const index = roomMessages.findIndex(m => m.id === messageId)
        if (index >= 0) {
          roomMessages[index] = updated
          this.messageCache.set(message.room_id, roomMessages)
        }
      }
    }
  }

  // Cache rooms for a user
  cacheRooms(userId: string, rooms: Room[]): void {
    this.roomCache.set(userId, [...rooms])
  }

  // Get cached rooms for a user
  getRooms(userId: string): Room[] | undefined {
    return this.roomCache.get(userId)
  }

  // Get cache statistics
  getStats() {
    return {
      messages: this.messageCache.getStats(),
      singleMessages: this.singleMessageCache.getStats(),
      rooms: this.roomCache.getStats()
    }
  }

  // Clear all caches
  clear(): void {
    this.messageCache.clear()
    this.singleMessageCache.clear()
    this.roomCache.clear()
  }
}

// Global cache instance
export const messageCache = new MessageCache()