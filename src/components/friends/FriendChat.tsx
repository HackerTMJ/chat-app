'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Heart, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { FriendshipWithProfile, CoupleRoomWithDetails, CoupleMessage } from '@/types/friends'
import { useCoupleMessageCache } from '@/lib/hooks/useCoupleMessageCache'
import { createClient } from '@/lib/supabase/client'

interface FriendChatProps {
  friendship: FriendshipWithProfile
  coupleRoom?: CoupleRoomWithDetails
  currentUserId: string
  onBack: () => void
}

const supabase = createClient()

export default function FriendChat({ friendship, coupleRoom, currentUserId, onBack }: FriendChatProps) {
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Use the cache hook for messages
  const { messages, loading: isLoading, addMessage, sendMessage } = useCoupleMessageCache(coupleRoom?.id || null)

  const friend = friendship.friend_profile
  const relationshipIcon = friendship.relationship_type === 'couple' ? '💕' : 
                         friendship.relationship_type === 'bestfriend' ? '👯' : '👫'

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !coupleRoom || isSending) return

    try {
      setIsSending(true)
      
      await sendMessage({
        room_id: coupleRoom.id,
        content: messageText.trim(),
        message_type: 'text'
      })

      setMessageText('')
      
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <Button
          onClick={onBack}
          size="sm"
          variant="outline"
          className="lg:hidden"
          aria-label="Go back to chat list"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <Avatar
          avatarUrl={friend?.avatar_url}
          email={friend?.email}
          username={friend?.username}
          size="md"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{relationshipIcon}</span>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {friend?.username || friend?.email}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {coupleRoom?.room_name || 'Private Chat'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <Heart className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">Start your conversation!</p>
            <p className="text-sm">Send your first message to {friend?.username || friend?.email}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === currentUserId
              const showDate = index === 0 || 
                formatDate(messages[index - 1].created_at) !== formatDate(message.created_at)

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 my-4">
                      <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <Avatar
                      avatarUrl={isCurrentUser ? undefined : friend?.avatar_url}
                      email={isCurrentUser ? undefined : friend?.email}
                      username={isCurrentUser ? undefined : friend?.username}
                      size="sm"
                    />
                    
                    <div className={`max-w-[70%] ${isCurrentUser ? 'text-right' : ''}`}>
                      <div className={`rounded-2xl px-4 py-2 ${
                        isCurrentUser 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
                        isCurrentUser ? 'text-right' : 'text-left'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Message ${friend?.username || friend?.email}...`}
              className="w-full px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!coupleRoom || isSending}
            />
          </div>
          <Button
            type="submit"
            disabled={!messageText.trim() || !coupleRoom || isSending}
            className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        {!coupleRoom && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Chat room will be created when you send your first message
          </p>
        )}
      </div>
    </div>
  )
}