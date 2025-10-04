'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Heart, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { FriendshipWithProfile, CoupleRoomWithDetails, CoupleMessage, CoupleRoom } from '@/types/friends'
import { useCoupleMessageCache } from '@/lib/hooks/useCoupleMessageCache'
import { createClient } from '@/lib/supabase/client'
import { showMessageNotification } from '@/lib/notifications/NotificationManager'
import { soundManager } from '@/lib/sounds/SoundManager'
import { createOrGetCoupleRoom } from '@/lib/friends/api'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import { useChatStore } from '@/lib/stores/chat'

interface FriendChatProps {
  friendship: FriendshipWithProfile
  coupleRoom?: CoupleRoomWithDetails
  currentUserId: string
  currentUser: any
  onBack: () => void
}

const supabase = createClient()

export default function FriendChat({ friendship, coupleRoom: initialCoupleRoom, currentUserId, currentUser, onBack }: FriendChatProps) {
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [coupleRoom, setCoupleRoom] = useState<CoupleRoom | CoupleRoomWithDetails | null>(initialCoupleRoom || null)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Use the cache hook for messages
  const { messages, loading: isLoading, addMessage, sendMessage } = useCoupleMessageCache(coupleRoom?.id || null)
  
  // Typing indicator
  const { startTyping, stopTyping } = useTypingIndicator(coupleRoom?.id || null, currentUser)
  const { typingUsers } = useChatStore()

  const friend = friendship.friend_profile
  const relationshipIcon = friendship.relationship_type === 'couple' ? '💕' : 
                         friendship.relationship_type === 'bestfriend' ? '👯' : '👫'

  // Auto-create couple room if it doesn't exist
  useEffect(() => {
    const ensureCoupleRoom = async () => {
      if (coupleRoom || isCreatingRoom) return
      
      setIsCreatingRoom(true)
      try {
        const room = await createOrGetCoupleRoom(friendship.id)
        if (room) {
          setCoupleRoom(room)
          console.log('✅ Couple room ready:', room.id)
        }
      } catch (error) {
        console.error('Error ensuring couple room:', error)
      } finally {
        setIsCreatingRoom(false)
      }
    }

    ensureCoupleRoom()
  }, [friendship.id, coupleRoom, isCreatingRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up real-time subscription for new messages with notifications
  useEffect(() => {
    if (!coupleRoom?.id) {
      console.log('⏸️ FriendChat: Waiting for couple room...', { friendshipId: friendship.id })
      return
    }

    console.log('🔔 FriendChat: Setting up real-time subscription for room:', coupleRoom.id)

    const channel = supabase
      .channel(`couple_room:${coupleRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'couple_messages',
          filter: `room_id=eq.${coupleRoom.id}`
        },
        async (payload) => {
          const newMessage = payload.new as CoupleMessage
          console.log('📨 FriendChat: New message received!', { 
            messageId: newMessage.id, 
            senderId: newMessage.sender_id,
            currentUserId,
            isOwnMessage: newMessage.sender_id === currentUserId
          })
          
          // Add to local state first (for both own and received messages)
          await addMessage(newMessage)
          
          // Don't notify for own messages
          if (newMessage.sender_id !== currentUserId) {
            console.log('🔔 Playing notification for message from friend')
            // Play sound
            soundManager.playMessageSound({ isOwnMessage: false })
            
            // Show notification (NotificationManager will check if app is focused)
            showMessageNotification({
              sender_name: friend.username || friend.email,
              content: newMessage.content,
              room_name: 'Friend Chat',
              message_id: newMessage.id
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 FriendChat subscription status:', status)
      })

    return () => {
      console.log('🔌 FriendChat: Unsubscribing from room:', coupleRoom.id)
      channel.unsubscribe()
    }
  }, [coupleRoom?.id, currentUserId, friend, addMessage, friendship.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !coupleRoom || isSending) return

    // Check if blocked
    if (friendship.status === 'blocked') {
      alert('You cannot send messages to a blocked user.')
      return
    }

    try {
      setIsSending(true)
      
      console.log('📤 Sending message to room:', coupleRoom.id)
      const sentMessage = await sendMessage({
        room_id: coupleRoom.id,
        content: messageText.trim(),
        message_type: 'text'
      })
      console.log('✅ Message sent successfully:', sentMessage?.id)

      setMessageText('')
      stopTyping() // Stop typing indicator after sending
      
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. The user may have blocked you.')
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
                      <div className={`rounded-2xl px-4 py-2 backdrop-blur-xl shadow-lg border transition-all duration-300 hover:scale-[1.02] ${
                        isCurrentUser 
                          ? 'bg-blue-500/20 dark:bg-blue-600/30 text-gray-900 dark:text-gray-100 border-blue-400/40 dark:border-blue-500/50 shadow-blue-500/20' 
                          : 'bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white border-gray-200/60 dark:border-gray-700/60 shadow-gray-300/20'
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

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 bg-white/30 dark:bg-gray-900/30">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
          </div>
          <span>
            {typingUsers[0].username} {typingUsers.length > 1 && `and ${typingUsers.length - 1} other${typingUsers.length > 2 ? 's' : ''}`} typing...
          </span>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value)
                // Trigger typing indicator
                if (e.target.value.length > 0) {
                  startTyping()
                }
              }}
              onBlur={() => {
                // Stop typing when input loses focus
                stopTyping()
              }}
              placeholder={isCreatingRoom ? 'Setting up chat...' : `Message ${friend?.username || friend?.email}...`}
              className="w-full px-4 py-2 rounded-full border border-gray-300/70 dark:border-gray-600 bg-white/90 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl shadow-lg"
              disabled={!coupleRoom || isSending || isCreatingRoom}
            />
          </div>
          <Button
            type="submit"
            disabled={!messageText.trim() || !coupleRoom || isSending || isCreatingRoom}
            className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        {isCreatingRoom && (
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 text-center">
            🔄 Setting up chat room...
          </p>
        )}
        {!coupleRoom && !isCreatingRoom && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Preparing chat...
          </p>
        )}
      </div>
    </div>
  )
}