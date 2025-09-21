// Cache Demo Component - Demonstrates caching capabilities
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cacheManager } from '@/lib/cache/CacheManager'
import { Message, Room } from '@/lib/stores/chat'

export function CacheDemo() {
  const [isVisible, setIsVisible] = useState(false)
  const [demoResults, setDemoResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setDemoResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const generateMockMessage = (roomId: string, index: number): Message => ({
    id: `mock-${roomId}-${index}-${Date.now()}`,
    room_id: roomId,
    user_id: 'demo-user',
    content: `Demo message ${index} - ${Math.random().toString(36).substring(7)}`,
    created_at: new Date().toISOString(),
    profiles: {
      username: 'Demo User',
      avatar_url: null
    }
  })

  const generateMockRoom = (index: number): Room => ({
    id: `room-${index}`,
    code: `DEMO${index}`,
    name: `Demo Room ${index}`,
    created_by: 'demo-user',
    created_at: new Date().toISOString()
  })

  const testBasicCaching = async () => {
    addResult('🧪 Testing basic caching...')
    
    const roomId = 'test-room-1'
    const messages = Array.from({ length: 10 }, (_, i) => generateMockMessage(roomId, i))
    
    // Cache messages
    await cacheManager.cacheMessages(roomId, messages)
    addResult(`✅ Cached ${messages.length} messages`)
    
    // Retrieve from cache
    const cached = await cacheManager.getMessages(roomId)
    addResult(`📥 Retrieved ${cached.length} messages from cache`)
    
    // Test cache hit
    const metrics = cacheManager.getMetrics()
    addResult(`📊 Cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`)
  }

  const testDeduplication = async () => {
    addResult('🔍 Testing deduplication...')
    
    const roomId = 'test-room-2'
    const originalMessages = Array.from({ length: 5 }, (_, i) => generateMockMessage(roomId, i))
    
    // Create duplicates
    const duplicateMessages = [...originalMessages, ...originalMessages]
    addResult(`📝 Created ${duplicateMessages.length} messages (with duplicates)`)
    
    // Cache with deduplication
    const deduplicated = await cacheManager.cacheMessages(roomId, duplicateMessages)
    addResult(`🧹 Deduplicated to ${deduplicated.length} unique messages`)
    
    const metrics = cacheManager.getMetrics()
    addResult(`💾 Deduplication savings: ${metrics.deduplicationSavings} messages`)
  }

  const testSmartPreloading = async () => {
    addResult('🧠 Testing smart preloading...')
    
    const rooms = Array.from({ length: 3 }, (_, i) => generateMockRoom(i + 1))
    
    // Cache rooms and trigger preloading
    await cacheManager.cacheRooms('demo-user', rooms)
    addResult(`📦 Cached ${rooms.length} rooms`)
    
    // Trigger smart preloading
    await cacheManager.triggerSmartPreloading(rooms)
    addResult('🚀 Triggered smart preloading')
    
    const metrics = cacheManager.getMetrics()
    addResult(`⏳ Preload queue size: ${metrics.preloadQueueSize}`)
  }

  const testOfflineStorage = async () => {
    addResult('📱 Testing offline storage...')
    
    try {
      const roomId = 'offline-test-room'
      const messages = Array.from({ length: 5 }, (_, i) => generateMockMessage(roomId, i))
      
      // Test offline storage
      await cacheManager.cacheMessages(roomId, messages, { storeOffline: true })
      addResult(`💾 Stored ${messages.length} messages offline`)
      
      // Test offline retrieval
      const retrieved = await cacheManager.getMessages(roomId, { fallbackToOffline: true })
      addResult(`📤 Retrieved ${retrieved.length} messages from offline storage`)
      
    } catch (error) {
      addResult(`❌ Offline storage error: ${error}`)
    }
  }

  const testCachePerformance = async () => {
    addResult('⚡ Testing cache performance...')
    
    const roomId = 'performance-test'
    const largeMessageSet = Array.from({ length: 100 }, (_, i) => generateMockMessage(roomId, i))
    
    // Measure cache time
    const startTime = performance.now()
    await cacheManager.cacheMessages(roomId, largeMessageSet)
    const cacheTime = performance.now() - startTime
    
    // Measure retrieval time
    const retrievalStart = performance.now()
    await cacheManager.getMessages(roomId)
    const retrievalTime = performance.now() - retrievalStart
    
    addResult(`⏱️ Cache time: ${cacheTime.toFixed(2)}ms`)
    addResult(`⏱️ Retrieval time: ${retrievalTime.toFixed(2)}ms`)
    addResult(`📈 Messages per second: ${(largeMessageSet.length / (cacheTime / 1000)).toFixed(0)}`)
  }

  const runAllTests = async () => {
    setDemoResults([])
    addResult('🚀 Starting comprehensive cache tests...')
    
    await testBasicCaching()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testDeduplication()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testSmartPreloading()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testOfflineStorage()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testCachePerformance()
    
    addResult('✅ All tests completed!')
    
    // Show final metrics
    const finalMetrics = cacheManager.getMetrics()
    addResult('📊 Final Metrics:')
    addResult(`   Hit Rate: ${(finalMetrics.hitRate * 100).toFixed(1)}%`)
    addResult(`   Total Size: ${(finalMetrics.totalSize / 1024).toFixed(1)} KB`)
    addResult(`   Deduplication Savings: ${finalMetrics.deduplicationSavings}`)
  }

  const clearCache = async () => {
    await cacheManager.clearAll()
    addResult('🧹 Cache cleared!')
    setDemoResults([])
  }

  if (!isVisible) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          🧪 Cache Demo
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-4 w-96 max-h-96 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          🧪 Cache System Demo
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={testBasicCaching} size="sm" variant="outline">
            Basic Cache
          </Button>
          <Button onClick={testDeduplication} size="sm" variant="outline">
            Deduplication
          </Button>
          <Button onClick={testSmartPreloading} size="sm" variant="outline">
            Preloading
          </Button>
          <Button onClick={testOfflineStorage} size="sm" variant="outline">
            Offline
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={runAllTests} size="sm" className="bg-green-600 hover:bg-green-700">
            Run All Tests
          </Button>
          <Button onClick={clearCache} size="sm" variant="outline">
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 h-48 overflow-y-auto text-xs font-mono">
        {demoResults.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            Click a test button to see results...
          </div>
        ) : (
          demoResults.map((result, index) => (
            <div key={index} className="mb-1 text-gray-700 dark:text-gray-300">
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  )
}