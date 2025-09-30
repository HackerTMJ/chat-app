/**
 * React hook for couple message caching
 * Provides intelligent caching for friend/couple chat messages
 */

import { useState, useEffect, useCallback } from 'react'
import { cacheSystem, type CoupleMessage } from '../cache/CacheSystemManager'
import { getCoupleMessages, sendCoupleMessage } from '../friends/api'
import type { CoupleMessageData } from '@/types/friends'

export function useCoupleMessageCache(roomId: string | null) {
  const [messages, setMessages] = useState<CoupleMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadMessages = useCallback(async (limit = 50, offset = 0, fromNetwork = false) => {
    if (!roomId) return

    setLoading(true)
    try {
      let cachedMessages: CoupleMessage[] = []
      
      if (!fromNetwork) {
        // Try to get from cache first
        cachedMessages = await cacheSystem.getCoupleMessagesByRoom(roomId, limit, offset)
      }

      if (cachedMessages.length === 0 || fromNetwork) {
        // If no cached messages or explicitly requesting from network
        console.log(`📡 Fetching couple messages from network for room ${roomId}`)
        const networkMessages = await getCoupleMessages(roomId)
        
        // Cache the network messages
        for (const message of networkMessages) {
          await cacheSystem.cacheCoupleMessage(message, true)
        }
        
        setMessages(networkMessages)
        setHasMore(networkMessages.length === limit)
      } else {
        console.log(`✅ Loaded ${cachedMessages.length} couple messages from cache`)
        setMessages(cachedMessages)
        setHasMore(cachedMessages.length === limit)
      }
    } catch (error) {
      console.error('Error loading couple messages:', error)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  const addMessage = useCallback(async (message: CoupleMessage) => {
    await cacheSystem.cacheCoupleMessage(message)
    setMessages(prev => [...prev, message])
  }, [])

  const sendMessage = useCallback(async (messageData: CoupleMessageData) => {
    try {
      const newMessage = await sendCoupleMessage(messageData)
      if (newMessage) {
        await addMessage(newMessage)
      }
      return newMessage
    } catch (error) {
      console.error('Error sending couple message:', error)
      throw error
    }
  }, [addMessage])

  useEffect(() => {
    if (roomId) {
      loadMessages()
    }
  }, [roomId, loadMessages])

  return {
    messages,
    loading,
    hasMore,
    loadMessages,
    addMessage,
    sendMessage,
    refreshFromNetwork: () => loadMessages(50, 0, true)
  }
}
