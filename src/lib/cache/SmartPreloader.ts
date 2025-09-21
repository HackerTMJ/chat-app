// Smart preloader for intelligent data fetching
// Predicts and preloads data based on user behavior patterns

import { messageCache } from './MessageCache'
import { getOfflineStorage } from './OfflineStorage'
import { Room, Message } from '@/lib/stores/chat'

export interface UserBehaviorPattern {
  roomVisitFrequency: { [roomId: string]: number }
  messageReadingSpeed: number // messages per minute
  activeHours: number[] // hours when user is most active (0-23)
  preferredRooms: string[] // rooms user visits most
  lastActiveTime: number
}

export interface PreloadStrategy {
  maxRoomsToPreload: number
  messagesPerRoom: number
  preloadOnVisit: boolean
  preloadActiveRooms: boolean
  maxBandwidthUsage: number // bytes per minute
}

export class SmartPreloader {
  private behaviorPattern: UserBehaviorPattern = {
    roomVisitFrequency: {},
    messageReadingSpeed: 10, // default 10 messages per minute
    activeHours: [],
    preferredRooms: [],
    lastActiveTime: Date.now()
  }
  
  private strategy: PreloadStrategy = {
    maxRoomsToPreload: 5,
    messagesPerRoom: 50,
    preloadOnVisit: true,
    preloadActiveRooms: true,
    maxBandwidthUsage: 1024 * 1024 // 1MB per minute
  }
  
  private preloadQueue: Array<{
    roomId: string
    priority: number
    estimatedSize: number
  }> = []
  
  private currentBandwidthUsage = 0
  private lastBandwidthReset = Date.now()

  constructor() {
    this.loadBehaviorPattern()
    this.setupBandwidthTracking()
  }

  // Track user behavior when they visit a room
  trackRoomVisit(roomId: string): void {
    const now = Date.now()
    const hour = new Date().getHours()
    
    // Update room visit frequency
    this.behaviorPattern.roomVisitFrequency[roomId] = 
      (this.behaviorPattern.roomVisitFrequency[roomId] || 0) + 1
    
    // Track active hours
    if (!this.behaviorPattern.activeHours.includes(hour)) {
      this.behaviorPattern.activeHours.push(hour)
    }
    
    // Update last active time
    this.behaviorPattern.lastActiveTime = now
    
    // Update preferred rooms (top 5 most visited)
    const sortedRooms = Object.entries(this.behaviorPattern.roomVisitFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([roomId]) => roomId)
    
    this.behaviorPattern.preferredRooms = sortedRooms
    
    // Save updated pattern
    this.saveBehaviorPattern()
    
    // Trigger smart preloading
    if (this.strategy.preloadOnVisit) {
      this.schedulePreloading()
    }
  }

  // Track message reading speed
  trackMessageReading(messagesRead: number, timeSpent: number): void {
    if (timeSpent > 0) {
      const readingSpeed = (messagesRead / timeSpent) * 60000 // messages per minute
      
      // Use weighted average to smooth out the reading speed
      this.behaviorPattern.messageReadingSpeed = 
        (this.behaviorPattern.messageReadingSpeed * 0.8) + (readingSpeed * 0.2)
      
      this.saveBehaviorPattern()
    }
  }

  // Predict which rooms to preload
  predictRoomsToPreload(availableRooms: Room[]): string[] {
    const currentHour = new Date().getHours()
    const predictions: Array<{ roomId: string; score: number }> = []
    
    for (const room of availableRooms) {
      let score = 0
      
      // Base score from visit frequency
      const visitFreq = this.behaviorPattern.roomVisitFrequency[room.id] || 0
      score += visitFreq * 10
      
      // Boost if it's a preferred room
      if (this.behaviorPattern.preferredRooms.includes(room.id)) {
        score += 50
      }
      
      // Boost if user is typically active at this hour
      if (this.behaviorPattern.activeHours.includes(currentHour)) {
        score += 20
      }
      
      // Boost recent rooms
      const lastActivity = room.last_message_at ? 
        new Date(room.last_message_at).getTime() : 0
      const hoursSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60)
      if (hoursSinceActivity < 24) {
        score += Math.max(0, 30 - hoursSinceActivity)
      }
      
      // Reduce score if already cached
      if (messageCache.getRoomMessages(room.id)) {
        score *= 0.3
      }
      
      predictions.push({ roomId: room.id, score })
    }
    
    // Sort by score and return top rooms
    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, this.strategy.maxRoomsToPreload)
      .map(p => p.roomId)
  }

  // Schedule intelligent preloading
  async schedulePreloading(): Promise<void> {
    // Check bandwidth limits
    if (!this.canUseMoreBandwidth()) {
      console.log('⏳ Delaying preload due to bandwidth limits')
      return
    }
    
    // Check if we're in an active hour
    const currentHour = new Date().getHours()
    if (!this.behaviorPattern.activeHours.includes(currentHour) && 
        this.behaviorPattern.activeHours.length > 0) {
      console.log('😴 User typically inactive at this hour, skipping preload')
      return
    }
    
    // Start preloading queue processing
    this.processPreloadQueue()
  }

  // Add room to preload queue with priority
  queueRoomForPreload(roomId: string, priority: number = 1): void {
    // Check if already in queue
    if (this.preloadQueue.some(item => item.roomId === roomId)) {
      return
    }
    
    // Estimate size (rough approximation)
    const estimatedSize = this.strategy.messagesPerRoom * 500 // ~500 bytes per message
    
    this.preloadQueue.push({
      roomId,
      priority,
      estimatedSize
    })
    
    // Sort by priority
    this.preloadQueue.sort((a, b) => b.priority - a.priority)
  }

  // Process the preload queue
  private async processPreloadQueue(): Promise<void> {
    while (this.preloadQueue.length > 0 && this.canUseMoreBandwidth()) {
      const item = this.preloadQueue.shift()!
      
      try {
        await this.preloadRoom(item.roomId)
        this.currentBandwidthUsage += item.estimatedSize
        
        console.log(`📦 Preloaded room ${item.roomId} (${item.estimatedSize} bytes)`)
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Failed to preload room ${item.roomId}:`, error)
      }
    }
  }

  // Preload a specific room
  private async preloadRoom(roomId: string): Promise<void> {
    // Check if already cached
    if (messageCache.getRoomMessages(roomId)) {
      return
    }
    
    // This would integrate with your actual data fetching
    // For now, we'll simulate the preloading
    console.log(`🔄 Preloading room ${roomId}...`)
    
    // In a real implementation, you'd fetch from Supabase here
    // const { data: messages } = await supabase
    //   .from('messages')
    //   .select('*')
    //   .eq('room_id', roomId)
    //   .order('created_at', { ascending: true })
    //   .limit(this.strategy.messagesPerRoom)
    
    // For demo, create mock messages
    const messages: Message[] = []
    
    // Cache the messages
    messageCache.cacheRoomMessages(roomId, messages)
    
    // Store offline for later
    await getOfflineStorage().storeMessages(roomId, messages)
  }

  // Check bandwidth limits
  private canUseMoreBandwidth(): boolean {
    const now = Date.now()
    const timeSinceReset = now - this.lastBandwidthReset
    
    // Reset bandwidth counter every minute
    if (timeSinceReset > 60000) {
      this.currentBandwidthUsage = 0
      this.lastBandwidthReset = now
    }
    
    return this.currentBandwidthUsage < this.strategy.maxBandwidthUsage
  }

  // Setup bandwidth tracking
  private setupBandwidthTracking(): void {
    setInterval(() => {
      this.currentBandwidthUsage = 0
    }, 60000) // Reset every minute
  }

  // Get preload recommendations for a user
  getPreloadRecommendations(rooms: Room[]): {
    immediate: string[]
    background: string[]
    lowPriority: string[]
  } {
    const predicted = this.predictRoomsToPreload(rooms)
    
    return {
      immediate: predicted.slice(0, 2), // Top 2 for immediate loading
      background: predicted.slice(2, 4), // Next 2 for background loading
      lowPriority: predicted.slice(4) // Rest for low priority
    }
  }

  // Update preload strategy
  updateStrategy(newStrategy: Partial<PreloadStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy }
  }

  // Get current behavior pattern
  getBehaviorPattern(): UserBehaviorPattern {
    return { ...this.behaviorPattern }
  }

  // Save behavior pattern to storage
  private async saveBehaviorPattern(): Promise<void> {
    try {
      // TODO: Implement metadata storage in OfflineStorage
      // await getOfflineStorage().setMetadata('behaviorPattern', this.behaviorPattern)
      console.log('Saving behavior pattern:', this.behaviorPattern)
    } catch (error) {
      console.error('Failed to save behavior pattern:', error)
    }
  }

  // Load behavior pattern from storage
  private async loadBehaviorPattern(): Promise<void> {
    try {
      // TODO: Implement metadata storage in OfflineStorage
      // const saved = await getOfflineStorage().getMetadata('behaviorPattern')
      const saved: UserBehaviorPattern | null = null // Temporary
      if (saved) {
        // this.behaviorPattern = { ...this.behaviorPattern, ...saved }
        console.log('Loaded behavior pattern:', saved)
      }
    } catch (error) {
      console.error('Failed to load behavior pattern:', error)
    }
  }

  // Get preload statistics
  getStats() {
    return {
      queueLength: this.preloadQueue.length,
      bandwidthUsage: this.currentBandwidthUsage,
      bandwidthLimit: this.strategy.maxBandwidthUsage,
      behaviorPattern: this.behaviorPattern,
      strategy: this.strategy
    }
  }

  // Clear all preload data
  clear(): void {
    this.preloadQueue = []
    this.currentBandwidthUsage = 0
    this.behaviorPattern = {
      roomVisitFrequency: {},
      messageReadingSpeed: 10,
      activeHours: [],
      preferredRooms: [],
      lastActiveTime: Date.now()
    }
  }
}

// Global preloader instance
export const smartPreloader = new SmartPreloader()