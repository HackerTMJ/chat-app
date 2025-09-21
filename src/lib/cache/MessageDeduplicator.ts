// Message deduplication and delta sync system
// Prevents duplicate messages and optimizes bandwidth usage

import { Message } from '@/lib/stores/chat'

export interface MessageFingerprint {
  id: string
  contentHash: string
  timestamp: number
  userId: string
  roomId: string
}

export interface DeltaUpdate {
  type: 'add' | 'update' | 'delete'
  messageId: string
  changes?: Partial<Message>
  fullMessage?: Message
  timestamp: number
}

export interface SyncManifest {
  roomId: string
  lastSyncTimestamp: number
  messageCount: number
  latestMessageId: string
  fingerprints: MessageFingerprint[]
}

export class MessageDeduplicator {
  private fingerprintCache = new Map<string, MessageFingerprint>()
  private syncManifests = new Map<string, SyncManifest>()
  private pendingDeltas = new Map<string, DeltaUpdate[]>() // roomId -> deltas
  
  constructor() {
    this.loadFromStorage()
  }

  // Generate a unique fingerprint for a message
  generateFingerprint(message: Message): MessageFingerprint {
    const contentToHash = `${message.content}${message.user_id}${message.room_id}${message.created_at}`
    const contentHash = this.simpleHash(contentToHash)
    
    return {
      id: message.id,
      contentHash,
      timestamp: new Date(message.created_at).getTime(),
      userId: message.user_id,
      roomId: message.room_id
    }
  }

  // Check if a message is a duplicate
  isDuplicate(message: Message): boolean {
    const fingerprint = this.generateFingerprint(message)
    
    // Check exact ID match first
    if (this.fingerprintCache.has(message.id)) {
      return true
    }
    
    // Check for content duplicates within the same room and user
    for (const [, existingFingerprint] of this.fingerprintCache) {
      if (
        existingFingerprint.roomId === fingerprint.roomId &&
        existingFingerprint.userId === fingerprint.userId &&
        existingFingerprint.contentHash === fingerprint.contentHash &&
        Math.abs(existingFingerprint.timestamp - fingerprint.timestamp) < 5000 // Within 5 seconds
      ) {
        console.log('🔍 Detected duplicate message content:', message.content.substring(0, 50))
        return true
      }
    }
    
    return false
  }

  // Add a message fingerprint to prevent duplicates
  addFingerprint(message: Message): void {
    const fingerprint = this.generateFingerprint(message)
    this.fingerprintCache.set(message.id, fingerprint)
    
    // Update sync manifest for the room
    this.updateSyncManifest(message.room_id, fingerprint)
    
    // Cleanup old fingerprints (keep last 1000 per room)
    this.cleanupFingerprints(message.room_id)
  }

  // Remove a message fingerprint
  removeFingerprint(messageId: string): void {
    const fingerprint = this.fingerprintCache.get(messageId)
    if (fingerprint) {
      this.fingerprintCache.delete(messageId)
      
      // Update sync manifest
      const manifest = this.syncManifests.get(fingerprint.roomId)
      if (manifest) {
        manifest.fingerprints = manifest.fingerprints.filter(f => f.id !== messageId)
        manifest.messageCount = manifest.fingerprints.length
      }
    }
  }

  // Create delta updates for efficient syncing
  createDelta(type: DeltaUpdate['type'], message: Message, changes?: Partial<Message>): DeltaUpdate {
    const delta: DeltaUpdate = {
      type,
      messageId: message.id,
      timestamp: Date.now()
    }
    
    if (type === 'add') {
      delta.fullMessage = message
    } else if (type === 'update' && changes) {
      delta.changes = changes
    }
    
    return delta
  }

  // Queue delta for batch processing
  queueDelta(roomId: string, delta: DeltaUpdate): void {
    if (!this.pendingDeltas.has(roomId)) {
      this.pendingDeltas.set(roomId, [])
    }
    
    const deltas = this.pendingDeltas.get(roomId)!
    
    // Check for conflicting deltas and merge if necessary
    const existingIndex = deltas.findIndex(d => d.messageId === delta.messageId)
    
    if (existingIndex >= 0) {
      const existing = deltas[existingIndex]
      
      // Merge updates
      if (existing.type === 'update' && delta.type === 'update') {
        existing.changes = { ...existing.changes, ...delta.changes }
        existing.timestamp = delta.timestamp
      } else {
        // Replace with newer delta
        deltas[existingIndex] = delta
      }
    } else {
      deltas.push(delta)
    }
    
    console.log(`📝 Queued ${delta.type} delta for message ${delta.messageId}`)
  }

  // Get pending deltas for a room
  getPendingDeltas(roomId: string): DeltaUpdate[] {
    return this.pendingDeltas.get(roomId) || []
  }

  // Clear pending deltas after successful sync
  clearPendingDeltas(roomId: string): void {
    this.pendingDeltas.delete(roomId)
  }

  // Generate sync manifest for a room
  generateSyncManifest(roomId: string, messages: Message[]): SyncManifest {
    const fingerprints = messages.map(m => this.generateFingerprint(m))
    const latestMessage = messages[messages.length - 1]
    
    const manifest: SyncManifest = {
      roomId,
      lastSyncTimestamp: Date.now(),
      messageCount: messages.length,
      latestMessageId: latestMessage?.id || '',
      fingerprints
    }
    
    this.syncManifests.set(roomId, manifest)
    return manifest
  }

  // Compare manifests to determine what needs syncing
  compareManifests(localManifest: SyncManifest, remoteManifest: SyncManifest): {
    needsFullSync: boolean
    missingMessages: string[]
    extraMessages: string[]
    changedMessages: string[]
  } {
    const localIds = new Set(localManifest.fingerprints.map(f => f.id))
    const remoteIds = new Set(remoteManifest.fingerprints.map(f => f.id))
    const localHashes = new Map(localManifest.fingerprints.map(f => [f.id, f.contentHash]))
    const remoteHashes = new Map(remoteManifest.fingerprints.map(f => [f.id, f.contentHash]))
    
    const missingMessages: string[] = []
    const extraMessages: string[] = []
    const changedMessages: string[] = []
    
    // Find missing messages (in remote but not local)
    for (const id of remoteIds) {
      if (!localIds.has(id)) {
        missingMessages.push(id)
      }
    }
    
    // Find extra messages (in local but not remote)
    for (const id of localIds) {
      if (!remoteIds.has(id)) {
        extraMessages.push(id)
      }
    }
    
    // Find changed messages (different content hashes)
    for (const id of localIds) {
      if (remoteIds.has(id)) {
        const localHash = localHashes.get(id)
        const remoteHash = remoteHashes.get(id)
        if (localHash !== remoteHash) {
          changedMessages.push(id)
        }
      }
    }
    
    // Determine if we need a full sync
    const changeRatio = (missingMessages.length + extraMessages.length + changedMessages.length) / 
                        Math.max(localManifest.messageCount, remoteManifest.messageCount, 1)
    const needsFullSync = changeRatio > 0.3 || Math.abs(localManifest.messageCount - remoteManifest.messageCount) > 100
    
    return {
      needsFullSync,
      missingMessages,
      extraMessages,
      changedMessages
    }
  }

  // Optimize message list by removing duplicates
  deduplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>()
    const contentHashes = new Map<string, Message>()
    const result: Message[] = []
    
    for (const message of messages) {
      // Skip exact ID duplicates
      if (seen.has(message.id)) {
        continue
      }
      
      // Check content duplicates
      const fingerprint = this.generateFingerprint(message)
      const contentKey = `${fingerprint.roomId}:${fingerprint.userId}:${fingerprint.contentHash}`
      
      const existing = contentHashes.get(contentKey)
      if (existing) {
        // Keep the message with the earlier timestamp
        if (fingerprint.timestamp < new Date(existing.created_at).getTime()) {
          // Replace existing with this one
          const existingIndex = result.findIndex(m => m.id === existing.id)
          if (existingIndex >= 0) {
            result[existingIndex] = message
          }
          contentHashes.set(contentKey, message)
        }
        // Skip this duplicate
      } else {
        contentHashes.set(contentKey, message)
        result.push(message)
      }
      
      seen.add(message.id)
    }
    
    console.log(`🧹 Deduplicated ${messages.length} messages to ${result.length}`)
    return result
  }

  // Simple hash function for content
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  // Update sync manifest for a room
  private updateSyncManifest(roomId: string, fingerprint: MessageFingerprint): void {
    let manifest = this.syncManifests.get(roomId)
    
    if (!manifest) {
      manifest = {
        roomId,
        lastSyncTimestamp: Date.now(),
        messageCount: 0,
        latestMessageId: '',
        fingerprints: []
      }
    }
    
    // Add or update fingerprint
    const existingIndex = manifest.fingerprints.findIndex(f => f.id === fingerprint.id)
    if (existingIndex >= 0) {
      manifest.fingerprints[existingIndex] = fingerprint
    } else {
      manifest.fingerprints.push(fingerprint)
    }
    
    // Update metadata
    manifest.messageCount = manifest.fingerprints.length
    manifest.latestMessageId = fingerprint.id
    manifest.lastSyncTimestamp = Date.now()
    
    this.syncManifests.set(roomId, manifest)
  }

  // Cleanup old fingerprints to prevent memory bloat
  private cleanupFingerprints(roomId: string): void {
    const manifest = this.syncManifests.get(roomId)
    if (!manifest) return
    
    const maxFingerprints = 1000
    if (manifest.fingerprints.length > maxFingerprints) {
      // Sort by timestamp and keep the latest ones
      manifest.fingerprints.sort((a, b) => b.timestamp - a.timestamp)
      const removed = manifest.fingerprints.splice(maxFingerprints)
      
      // Remove from fingerprint cache
      removed.forEach(fp => this.fingerprintCache.delete(fp.id))
      
      console.log(`🧹 Cleaned up ${removed.length} old fingerprints for room ${roomId}`)
    }
  }

  // Save state to storage
  private async saveToStorage(): Promise<void> {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('📱 MessageDeduplicator: localStorage not available for saving (SSR mode)')
        return
      }
      
      const state = {
        syncManifests: Array.from(this.syncManifests.entries()),
        pendingDeltas: Array.from(this.pendingDeltas.entries())
      }
      
      localStorage.setItem('messageDeduplicator', JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save deduplicator state:', error)
    }
  }

  // Load state from storage
  private async loadFromStorage(): Promise<void> {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('📱 MessageDeduplicator: localStorage not available (SSR mode)')
        return
      }
      
      const saved = localStorage.getItem('messageDeduplicator')
      if (saved) {
        const state = JSON.parse(saved)
        this.syncManifests = new Map(state.syncManifests || [])
        this.pendingDeltas = new Map(state.pendingDeltas || [])
        console.log('📱 MessageDeduplicator: Loaded state from localStorage')
      }
    } catch (error) {
      console.error('Failed to load deduplicator state:', error)
    }
  }

  // Get deduplication statistics
  getStats() {
    let totalFingerprints = 0
    let totalPendingDeltas = 0
    
    for (const manifest of this.syncManifests.values()) {
      totalFingerprints += manifest.fingerprints.length
    }
    
    for (const deltas of this.pendingDeltas.values()) {
      totalPendingDeltas += deltas.length
    }
    
    return {
      totalFingerprints,
      totalManifests: this.syncManifests.size,
      totalPendingDeltas,
      roomsWithPendingDeltas: this.pendingDeltas.size,
      cacheSize: this.fingerprintCache.size
    }
  }

  // Clear all deduplication data
  clear(): void {
    this.fingerprintCache.clear()
    this.syncManifests.clear()
    this.pendingDeltas.clear()
    localStorage.removeItem('messageDeduplicator')
  }
}

// Global deduplicator instance
export const messageDeduplicator = new MessageDeduplicator()