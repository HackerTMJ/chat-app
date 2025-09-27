'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Heart, Send, Smile, MoreVertical, Gift, Calendar, Camera } from 'lucide-react'
import { CoupleRoom, CoupleMessage, RelationshipStatus } from '@/types/friends'
import { getCoupleMessages, sendCoupleMessage, subscribeToCoupleRoom } from '@/lib/friends/api'
import Avatar from '@/components/ui/Avatar'

interface CoupleChatProps {
  room: CoupleRoom
  currentUserId: string
  partnerProfile: {
    id: string
    full_name: string
    avatar_url?: string
  }
  relationshipStatus: RelationshipStatus
}

interface MessageWithHearts extends CoupleMessage {
  heart_reactions?: number
  user_hearted?: boolean
}

export default function CoupleChat({ 
  room, 
  currentUserId, 
  partnerProfile, 
  relationshipStatus 
}: CoupleChatProps) {
  // Friend List Popup State
  const [showFriendList, setShowFriendList] = useState(false)
  const [messages, setMessages] = useState<MessageWithHearts[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Chat themes based on relationship type
  const getThemeStyles = () => {
    const baseTheme = room.room_theme || 'default'
    
    const themes = {
      default: 'bg-gray-50 dark:bg-gray-800',
      couple: 'bg-gradient-to-b from-rose-50 via-pink-50 to-red-50 dark:from-rose-900/20 dark:via-pink-900/20 dark:to-red-900/20',
      bestfriend: 'bg-gradient-to-b from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-amber-900/20',
      romantic: 'bg-gradient-to-b from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20',
      cozy: 'bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20'
    }
    
    return themes[baseTheme as keyof typeof themes] || themes.default
  }

  // Load messages on component mount
  useEffect(() => {
    loadMessages()
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToCoupleRoom(room.id, (message) => {
      setMessages(prev => [...prev, message as MessageWithHearts])
      scrollToBottom()
    })
    
    return () => {
      unsubscribe?.unsubscribe()
    }
  }, [room.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      const roomMessages = await getCoupleMessages(room.id)
      setMessages(roomMessages.map(msg => ({
        ...msg,
        heart_reactions: Math.floor(Math.random() * 3), // Mock data for now
        user_hearted: false
      })))
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      await sendCoupleMessage({
        room_id: room.id,
        content: newMessage.trim()
      })
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleHeartReaction = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId
        ? {
            ...msg,
            heart_reactions: (msg.heart_reactions || 0) + (msg.user_hearted ? -1 : 1),
            user_hearted: !msg.user_hearted
          }
        : msg
    ))
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const quickEmojis = ['❤️', '😍', '🥰', '😘', '💕', '🌹', '✨', '🔥']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${getThemeStyles()}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Avatar 
            avatarUrl={partnerProfile.avatar_url}
            username={partnerProfile.full_name}
            size="sm"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{partnerProfile.full_name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{relationshipStatus.total_messages} messages</span>
              {relationshipStatus.streak_days > 0 && (
                <span className="flex items-center">
                  <span>🔥</span>
                  <span>{relationshipStatus.streak_days} day streak</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-full hover:bg-pink-100 transition-colors"
            title="Anniversary"
          >
            <Calendar className="h-5 w-5 text-pink-600" />
          </button>
          <button 
            className="p-2 rounded-full hover:bg-pink-100 transition-colors"
            title="Send Gift"
          >
            <Gift className="h-5 w-5 text-pink-600" />
          </button>
          <button 
            className="p-2 rounded-full hover:bg-pink-100 transition-colors"
            title="More Options"
          >
            <MoreVertical className="h-5 w-5 text-pink-600" />
          </button>
          {/* Friend List Popup Trigger */}
          <button
            className="p-2 rounded-full hover:bg-blue-100 transition-colors"
            title="Show Friend List"
            aria-label="Show Friend List"
            onClick={() => setShowFriendList(true)}
          >
            <span role="img" aria-label="Friends">👥</span>
          </button>
        </div>
      </div>

      {/* Friend List Popup Modal */}
      {showFriendList && (
        <Dialog open={showFriendList} onClose={() => setShowFriendList(false)}>
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-md p-6 relative">
              <button
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Close Friend List"
                onClick={() => setShowFriendList(false)}
              >
                ✖
              </button>
              <h2 className="text-lg font-bold mb-4">Your Friends</h2>
              {/* TODO: Replace with actual friend list from props/context */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                  <Avatar avatarUrl={partnerProfile.avatar_url} username={partnerProfile.full_name} size="xs" />
                  <span className="font-medium">{partnerProfile.full_name}</span>
                </div>
                {/* Add more friends here */}
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search friends..."
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-pink-300 mx-auto mb-4" />
            <p className="text-gray-600">Start your conversation with {partnerProfile.full_name}</p>
            <p className="text-sm text-gray-500 mt-2">Send the first message to begin your chat!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md`}>
                  {!isOwn && (
                    <div className="flex items-center space-x-2 mb-1">
                      <Avatar 
                        avatarUrl={partnerProfile.avatar_url}
                        username={partnerProfile.full_name}
                        size="xs"
                      />
                      <span className="text-xs text-gray-600">{partnerProfile.full_name}</span>
                    </div>
                  )}
                  <div
                    className={`relative group px-4 py-3 rounded-2xl ${
                      isOwn
                        ? 'bg-pink-500 text-white ml-auto'
                        : 'bg-white text-gray-900 shadow-sm border'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {/* Heart reaction button */}
                    <button
                      onClick={() => handleHeartReaction(message.id)}
                      className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                        message.user_hearted 
                          ? 'bg-red-500 text-white scale-110' 
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-500'
                      } opacity-0 group-hover:opacity-100`}
                      aria-label={message.user_hearted ? 'Unheart message' : 'Heart message'}
                    >
                      <Heart 
                        className={`h-3 w-3 ${message.user_hearted ? 'fill-current' : ''}`} 
                      />
                    </button>
                    {/* Heart count */}
                    {(message.heart_reactions || 0) > 0 && (
                      <div className="absolute -bottom-2 -left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <Heart className="h-3 w-3 fill-current" />
                        <span>{message.heart_reactions}</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 ${
                    isOwn ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{formatMessageTime(message.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="p-2 bg-white/90 backdrop-blur-sm border-t border-pink-200">
          <div className="flex space-x-2 overflow-x-auto">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setNewMessage(prev => prev + emoji)
                  setShowEmojiPicker(false)
                }}
                className="flex-shrink-0 p-2 text-lg hover:bg-pink-100 rounded-lg transition-colors"
                aria-label={`Add emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-pink-200">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${partnerProfile.full_name}...`}
              className="w-full px-4 py-3 border border-pink-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              aria-label={`Message input for ${partnerProfile.full_name}`}
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-3 rounded-2xl transition-colors ${
                showEmojiPicker 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
              }`}
              title="Add Emoji"
              aria-label="Add Emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-3 bg-pink-100 text-pink-600 rounded-2xl hover:bg-pink-200 transition-colors"
              title="Add Photo"
              aria-label="Add Photo"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`p-3 rounded-2xl transition-colors ${
                newMessage.trim()
                  ? 'bg-pink-500 text-white hover:bg-pink-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Send Message"
              aria-label="Send Message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}