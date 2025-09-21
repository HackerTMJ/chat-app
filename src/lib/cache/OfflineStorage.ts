// Offline storage manager for persistent caching
// Handles IndexedDB storage with fallback to localStorage

import { Message, Room } from '../stores/chat'

export interface OfflineData {
  messages: { [roomId: string]: Message[] }
  rooms: Room[]
  lastSync: number
  user: any
}

export interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  pendingOperations: number
  syncInProgress: boolean
}

export class OfflineStorageManager {
  private dbName = 'ChatAppOfflineDB'
  private dbVersion = 10 // Significantly incremented to force complete recreation
  private db: IDBDatabase | null = null
  private pendingOperations: Array<() => Promise<void>> = []
  private syncInProgress = false

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initDB()
      this.setupOnlineListener()
    }
  }

  // Force clear the old database for clean start
  private async clearOldDatabase(): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return
    }

    try {
      // Delete the old database completely
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log('🗑️ Old IndexedDB database deleted successfully')
          resolve()
        }
        deleteRequest.onerror = () => {
          console.warn('⚠️ Could not delete old database:', deleteRequest.error)
          resolve() // Continue anyway
        }
        deleteRequest.onblocked = () => {
          console.warn('⚠️ Database deletion blocked - continuing anyway')
          resolve()
        }
      })
    } catch (error) {
      console.warn('⚠️ Error clearing old database:', error)
    }
  }

  private async initDB(): Promise<void> {
    // Skip if not in browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return
    }

    // Clear old database first to ensure clean slate
    await this.clearOldDatabase()

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Delete existing stores if they exist to ensure clean recreation
        if (db.objectStoreNames.contains('messages')) {
          db.deleteObjectStore('messages')
        }
        if (db.objectStoreNames.contains('rooms')) {
          db.deleteObjectStore('rooms')
        }
        if (db.objectStoreNames.contains('metadata')) {
          db.deleteObjectStore('metadata')
        }
        if (db.objectStoreNames.contains('pending')) {
          db.deleteObjectStore('pending')
        }
        
        // Create messages store without keyPath - use explicit keys only
        const messageStore = db.createObjectStore('messages')
        messageStore.createIndex('room_id', 'room_id')
        messageStore.createIndex('created_at', 'created_at')
        
        // Create rooms store without keyPath - use explicit keys only
        const roomStore = db.createObjectStore('rooms')
        
        // Create metadata store with keyPath (this one can use keyPath safely)
        const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' })
        
        // Create pending operations store with auto-increment
        const pendingStore = db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
        pendingStore.createIndex('timestamp', 'timestamp')
        
        console.log('🔄 IndexedDB schema upgraded to version', db.version)
      }
    })
  }

  private setupOnlineListener(): void {
    // Only setup listeners in browser environment
    if (typeof window === 'undefined') return
    
    window.addEventListener('online', () => {
      console.log('🟢 Back online - syncing pending operations')
      this.syncPendingOperations()
    })
    
    window.addEventListener('offline', () => {
      console.log('🔴 Gone offline - operations will be queued')
    })
  }

  // Store messages in IndexedDB with comprehensive error handling
  async storeMessages(roomId: string, messages: Message[]): Promise<void> {
    // Early validation - reject completely empty arrays
    if (!messages || messages.length === 0) {
      console.log('📦 No messages to store for room:', roomId)
      return
    }
    // Primary storage: Try IndexedDB first
    if (this.db) {
      try {
        await this.storeMessagesInIndexedDB(roomId, messages)
        return
      } catch (error) {
        console.error('❌ IndexedDB storage failed, falling back to localStorage:', error)
      }
    }

    // Fallback: Use localStorage
    this.fallbackStoreMessages(roomId, messages)
  }

  // Separate IndexedDB storage method
  private async storeMessagesInIndexedDB(roomId: string, messages: Message[]): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not available')
    }

    try {
      const transaction = this.db.transaction(['messages'], 'readwrite')
      const store = transaction.objectStore('messages')
      
      console.log('📦 Attempting to store messages:', messages)
      let storedCount = 0
      
      for (const message of messages) {
        // Skip completely empty objects or objects with no meaningful data
        if (!message || typeof message !== 'object' || Object.keys(message).length === 0) {
          console.warn('Skipping empty or invalid message object:', message)
          continue
        }
        
        // Create a copy to avoid mutating original
        const messageToStore = { ...message }
        
        // Debug: Log the original message structure
        console.log('📦 Processing message:', { 
          id: messageToStore.id, 
          type: typeof messageToStore.id, 
          hasId: 'id' in messageToStore,
          keys: Object.keys(messageToStore),
          hasRequiredFields: !!(messageToStore.id && messageToStore.room_id && messageToStore.user_id && messageToStore.content)
        })
        
        // Validate essential message fields exist
        if (!messageToStore.room_id || !messageToStore.user_id || !messageToStore.content) {
          console.warn('Message missing essential fields (room_id, user_id, or content), skipping:', messageToStore)
          continue
        }
        
        // Ensure message has required fields for IndexedDB - be more aggressive
        if (!messageToStore.hasOwnProperty('id') || 
            messageToStore.id === undefined || 
            messageToStore.id === null || 
            messageToStore.id === '' || 
            (typeof messageToStore.id === 'number' && messageToStore.id === 0)) {
          console.warn('Message missing or invalid id field, generating one:', messageToStore)
          // Generate a fallback ID if missing
          messageToStore.id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        // Additional validation to ensure id is a valid string and not empty
        if (typeof messageToStore.id !== 'string' || messageToStore.id.trim() === '') {
          console.warn('Message id is not a valid string, converting:', messageToStore.id)
          messageToStore.id = `fixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        // Ensure created_at exists
        if (!messageToStore.created_at) {
          messageToStore.created_at = new Date().toISOString()
        }
        
        // Final validation before storing
        console.log('📦 About to store message with id:', messageToStore.id, 'type:', typeof messageToStore.id)
        
        await new Promise<void>((resolve, reject) => {
          try {
            // Ensure we have a valid key for storage
            const messageKey = messageToStore.id || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            // Use put with explicit key instead of keyPath to avoid evaluation errors
            const request = store.put(messageToStore, messageKey)
            request.onsuccess = () => {
              storedCount++
              resolve()
            }
            request.onerror = () => {
              console.error('Failed to store message:', messageToStore, 'Error:', request.error)
              console.error('Message keys:', Object.keys(messageToStore))
              console.error('Message key used:', messageKey)
              reject(request.error)
            }
          } catch (syncError) {
            console.error('Synchronous error during put operation:', syncError)
            console.error('Message that caused error:', messageToStore)
            reject(syncError)
          }
        })
      }
      
      console.log(`📦 Successfully stored ${storedCount} out of ${messages.length} messages for room ${roomId}`)
    } catch (error) {
      console.error('IndexedDB storage error:', error)
      throw error // Re-throw to trigger fallback in parent method
    }
  }

  // Retrieve messages from IndexedDB
  async getMessages(roomId: string, limit?: number): Promise<Message[]> {
    if (!this.db) {
      return this.fallbackGetMessages(roomId, limit)
    }

    try {
      const transaction = this.db.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const index = store.index('room_id')
      
      return new Promise<Message[]>((resolve, reject) => {
        const messages: Message[] = []
        const request = index.openCursor(IDBKeyRange.only(roomId), 'prev')
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor && (!limit || messages.length < limit)) {
            messages.push(cursor.value)
            cursor.continue()
          } else {
            resolve(messages.reverse()) // Reverse to get chronological order
          }
        }
        
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get messages from IndexedDB:', error)
      return this.fallbackGetMessages(roomId, limit)
    }
  }

  // Store rooms in IndexedDB
  async storeRooms(rooms: Room[]): Promise<void> {
    // Re-enable IndexedDB with proper schema
    if (!this.db) {
      this.fallbackStoreRooms(rooms)
      return
    }

    try {
      const transaction = this.db.transaction(['rooms'], 'readwrite')
      const store = transaction.objectStore('rooms')
      
      for (const room of rooms) {
        // Create a copy to avoid mutating original
        const roomToStore = { ...room }
        
        // Ensure room has required fields for IndexedDB
        if (!roomToStore.id || roomToStore.id === '' || roomToStore.id === null || roomToStore.id === undefined) {
          console.warn('Room missing or invalid id field, generating one:', roomToStore)
          // Generate a fallback ID if missing
          roomToStore.id = `temp_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        // Additional validation to ensure id is a valid string
        if (typeof roomToStore.id !== 'string') {
          console.warn('Room id is not a string, converting:', roomToStore.id)
          roomToStore.id = String(roomToStore.id)
        }
        
        await new Promise<void>((resolve, reject) => {
          // Ensure we have a valid key for storage
          const roomKey = roomToStore.id || `fallback_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // Use put with explicit key instead of keyPath
          const request = store.put(roomToStore, roomKey)
          request.onsuccess = () => resolve()
          request.onerror = () => {
            console.error('Failed to store room:', roomToStore, 'Error:', request.error)
            reject(request.error)
          }
        })
      }
      
      console.log(`📦 Stored ${rooms.length} rooms`)
    } catch (error) {
      console.error('Failed to store rooms in IndexedDB:', error)
      this.fallbackStoreRooms(rooms)
    }
  }

  // Retrieve rooms from IndexedDB
  async getRooms(): Promise<Room[]> {
    // Re-enable IndexedDB with proper schema
    if (!this.db) {
      return this.fallbackGetRooms()
    }

    try {
      const transaction = this.db.transaction(['rooms'], 'readonly')
      const store = transaction.objectStore('rooms')
      
      return new Promise<Room[]>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get rooms from IndexedDB:', error)
      return this.fallbackGetRooms()
    }
  }

  // Store operation for later sync
  async queueOperation(operation: any): Promise<void> {
    if (!this.db) {
      // Store in memory for now
      this.pendingOperations.push(async () => {
        console.log('Executing queued operation:', operation)
      })
      return
    }

    try {
      const transaction = this.db.transaction(['pending'], 'readwrite')
      const store = transaction.objectStore('pending')
      
      const pendingOp = {
        operation,
        timestamp: Date.now(),
        retries: 0
      }
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(pendingOp)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      
      console.log('📝 Queued operation for sync:', operation.type)
    } catch (error) {
      console.error('Failed to queue operation:', error)
    }
  }

  // Sync pending operations when back online
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !this.db) return
    
    this.syncInProgress = true
    
    try {
      const transaction = this.db.transaction(['pending'], 'readwrite')
      const store = transaction.objectStore('pending')
      
      const operations = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
      
      console.log(`🔄 Syncing ${operations.length} pending operations`)
      
      for (const op of operations) {
        try {
          // Execute the operation
          await this.executeOperation(op.operation)
          
          // Remove from pending if successful
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(op.id)
            deleteRequest.onsuccess = () => resolve()
            deleteRequest.onerror = () => reject(deleteRequest.error)
          })
          
          console.log('✅ Synced operation:', op.operation.type)
        } catch (error) {
          console.error('❌ Failed to sync operation:', op.operation.type, error)
          
          // Increment retry count
          op.retries = (op.retries || 0) + 1
          
          if (op.retries < 3) {
            // Update retry count
            await new Promise<void>((resolve, reject) => {
              const updateRequest = store.put(op)
              updateRequest.onsuccess = () => resolve()
              updateRequest.onerror = () => reject(updateRequest.error)
            })
          } else {
            // Max retries reached, remove operation
            await new Promise<void>((resolve, reject) => {
              const deleteRequest = store.delete(op.id)
              deleteRequest.onsuccess = () => resolve()
              deleteRequest.onerror = () => reject(deleteRequest.error)
            })
            console.warn('🗑️ Removed operation after max retries:', op.operation.type)
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync pending operations:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  private async executeOperation(operation: any): Promise<void> {
    // This would integrate with your actual API calls
    // For now, just log the operation
    console.log('Executing operation:', operation)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSync: new Date(), // Would track actual last sync
      pendingOperations: this.pendingOperations.length,
      syncInProgress: this.syncInProgress
    }
  }

  // Fallback methods using localStorage
  private fallbackStoreMessages(roomId: string, messages: Message[]): void {
    if (typeof localStorage === 'undefined') return
    
    try {
      const key = `messages_${roomId}`
      localStorage.setItem(key, JSON.stringify(messages))
      console.log(`📦 Stored ${messages.length} messages in localStorage for room ${roomId}`)
    } catch (error) {
      console.error('Failed to store messages in localStorage:', error)
    }
  }

  private fallbackGetMessages(roomId: string, limit?: number): Message[] {
    if (typeof localStorage === 'undefined') return []
    
    try {
      const key = `messages_${roomId}`
      const stored = localStorage.getItem(key)
      if (!stored) return []
      
      const messages = JSON.parse(stored) as Message[]
      return limit ? messages.slice(-limit) : messages
    } catch (error) {
      console.error('Failed to get messages from localStorage:', error)
      return []
    }
  }

  private fallbackStoreRooms(rooms: Room[]): void {
    if (typeof localStorage === 'undefined') return
    
    try {
      localStorage.setItem('rooms', JSON.stringify(rooms))
      console.log(`📦 Stored ${rooms.length} rooms in localStorage`)
    } catch (error) {
      console.error('Failed to store rooms in localStorage:', error)
    }
  }

  private fallbackGetRooms(): Room[] {
    if (typeof localStorage === 'undefined') return []
    
    try {
      const stored = localStorage.getItem('rooms')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get rooms from localStorage:', error)
      return []
    }
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    if (this.db) {
      try {
        const transaction = this.db.transaction(['messages', 'rooms', 'metadata', 'pending'], 'readwrite')
        
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            const request = transaction.objectStore('messages').clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          }),
          new Promise<void>((resolve, reject) => {
            const request = transaction.objectStore('rooms').clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          }),
          new Promise<void>((resolve, reject) => {
            const request = transaction.objectStore('metadata').clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          }),
          new Promise<void>((resolve, reject) => {
            const request = transaction.objectStore('pending').clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          })
        ])
        
        console.log('🗑️ Cleared all offline data from IndexedDB')
      } catch (error) {
        console.error('Failed to clear IndexedDB data:', error)
      }
    }
    
    // Also clear localStorage fallback
    if (typeof localStorage !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith('messages_') || key === 'rooms'
        )
        keys.forEach(key => localStorage.removeItem(key))
        console.log('🗑️ Cleared offline data from localStorage')
      } catch (error) {
        console.error('Failed to clear localStorage data:', error)
      }
    }
  }
}

// Export singleton instance
let offlineStorage: OfflineStorageManager | null = null

export const getOfflineStorage = (): OfflineStorageManager => {
  if (!offlineStorage) {
    offlineStorage = new OfflineStorageManager()
  }
  return offlineStorage
}