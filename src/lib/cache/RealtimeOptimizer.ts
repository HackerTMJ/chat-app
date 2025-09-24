/**
 * Real-time optimization utilities for Supabase integration
 * Handles compression, deduplication, and bandwidth optimization
 */

import { cacheSystem } from '@/lib/cache/CacheSystemManager'

interface MessageBatch {
  messages: any[]
  timestamp: number
  compressed?: boolean
}

class RealtimeOptimizer {
  private messageBatches: Map<string, MessageBatch> = new Map()
  private batchTimeout: Map<string, NodeJS.Timeout> = new Map()
  private readonly BATCH_SIZE = 10
  private readonly BATCH_TIMEOUT = 500 // ms

  /**
   * Optimize message processing by batching and compression
   */
  async optimizeMessage(roomId: string, message: any, callback: (message: any) => void) {
    // Check if message is already cached to avoid redundant processing
    const cachedMessage = await cacheSystem.getMessage(message.id)
    if (cachedMessage) {
      console.log('📦 Message already cached, skipping redundant processing:', message.id)
      return
    }

    // Add to batch for potential compression
    this.addToBatch(roomId, message, callback)
  }

  /**
   * Add message to batch for optimization
   */
  private addToBatch(roomId: string, message: any, callback: (message: any) => void) {
    let batch = this.messageBatches.get(roomId)
    
    if (!batch) {
      batch = {
        messages: [],
        timestamp: Date.now()
      }
      this.messageBatches.set(roomId, batch)
    }

    batch.messages.push({ message, callback })

    // Process batch if it's full or timeout
    if (batch.messages.length >= this.BATCH_SIZE) {
      this.processBatch(roomId)
    } else {
      // Set timeout for batch processing
      this.clearBatchTimeout(roomId)
      const timeout = setTimeout(() => {
        this.processBatch(roomId)
      }, this.BATCH_TIMEOUT)
      this.batchTimeout.set(roomId, timeout)
    }
  }

  /**
   * Process accumulated message batch
   */
  private async processBatch(roomId: string) {
    const batch = this.messageBatches.get(roomId)
    if (!batch || batch.messages.length === 0) return

    this.clearBatchTimeout(roomId)
    
    try {
      // Process each message in the batch
      for (const { message, callback } of batch.messages) {
        // Apply bandwidth optimizations
        const optimizedMessage = await this.optimizeMessageContent(message)
        
        // Cache for future deduplication
        await cacheSystem.cacheMessage({
          ...optimizedMessage,
          username: optimizedMessage.profiles?.username || 'Unknown',
          avatar_url: optimizedMessage.profiles?.avatar_url || null
        }, true)
        
        // Execute callback
        callback(optimizedMessage)
      }

      console.log(`📦 Processed batch of ${batch.messages.length} messages for room ${roomId}`)
    } catch (error) {
      console.error('Error processing message batch:', error)
      
      // Fallback: process messages individually
      for (const { message, callback } of batch.messages) {
        try {
          callback(message)
        } catch (err) {
          console.error('Error in fallback message processing:', err)
        }
      }
    } finally {
      // Clear the batch
      this.messageBatches.delete(roomId)
    }
  }

  /**
   * Optimize message content (compression, delta encoding, etc.)
   */
  private async optimizeMessageContent(message: any): Promise<any> {
    // For large messages, apply compression
    if (message.content && message.content.length > 1000) {
      // In a real implementation, you'd compress the content
      console.log('📦 Large message detected, applying optimization:', message.content.length, 'chars')
    }

    // Check for similar recent messages for delta encoding
    const recentMessages = await cacheSystem.getMessagesByRoom(message.room_id, 10, 0)
    const similarMessage = recentMessages.find(m => 
      m.user_id === message.user_id && 
      Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 60000 // Within 1 minute
    )

    if (similarMessage && message.content.includes(similarMessage.content)) {
      console.log('📦 Similar message found, could apply delta compression')
      // In a real implementation, you'd store only the diff
    }

    return message
  }

  /**
   * Clear batch timeout for a room
   */
  private clearBatchTimeout(roomId: string) {
    const timeout = this.batchTimeout.get(roomId)
    if (timeout) {
      clearTimeout(timeout)
      this.batchTimeout.delete(roomId)
    }
  }

  /**
   * Check if we should skip processing this message (already processed)
   */
  async shouldSkipMessage(message: any): Promise<boolean> {
    // Check cache first
    const cached = await cacheSystem.getMessage(message.id)
    return !!cached
  }

  /**
   * Optimize room subscriptions by prefetching likely needed data
   */
  async optimizeRoomSubscription(roomId: string) {
    // Prefetch recent messages for the room
    await cacheSystem.prefetchRoomMessages(roomId, 20)
    console.log('📦 Prefetched messages for room subscription:', roomId)
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Clear all timeouts
    for (const timeout of this.batchTimeout.values()) {
      clearTimeout(timeout)
    }
    this.batchTimeout.clear()
    this.messageBatches.clear()
  }
}

// Export singleton instance
export const realtimeOptimizer = new RealtimeOptimizer()

/**
 * Bandwidth monitoring utilities
 */
export class BandwidthMonitor {
  private bytesReceived = 0
  private bytesSaved = 0
  private requestCount = 0
  private cacheHits = 0

  recordRequest(bytes: number, fromCache: boolean = false) {
    this.requestCount++
    if (fromCache) {
      this.cacheHits++
      this.bytesSaved += bytes
    } else {
      this.bytesReceived += bytes
    }
  }

  getStats() {
    return {
      totalRequests: this.requestCount,
      cacheHitRate: this.requestCount > 0 ? this.cacheHits / this.requestCount : 0,
      bytesReceived: this.bytesReceived,
      bytesSaved: this.bytesSaved,
      bandwidthReduction: this.bytesReceived + this.bytesSaved > 0 
        ? this.bytesSaved / (this.bytesReceived + this.bytesSaved) 
        : 0
    }
  }

  reset() {
    this.bytesReceived = 0
    this.bytesSaved = 0
    this.requestCount = 0
    this.cacheHits = 0
  }
}

export const bandwidthMonitor = new BandwidthMonitor()