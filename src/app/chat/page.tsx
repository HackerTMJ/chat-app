'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { RoomShare } from '@/components/ui/RoomShare'
import { OnlineUsers } from '@/components/ui/OnlineUsers'
import { RoomInfo } from '@/components/ui/RoomInfo'
import { MessageSearch } from '@/components/ui/MessageSearch'
import { MessageReactions } from '@/components/ui/MessageReactions'
import { TypingIndicator } from '@/components/ui/TypingIndicator'
import { StatusSelector } from '@/components/ui/StatusSelector'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'
import { userCacheManager } from '@/lib/cache/UserCacheManager'
import { useChatStore } from '@/lib/stores/chat'
import { useRealTimeMessages, useLoadMessages, useLoadRooms, useSendMessage, useCreateRoom, useJoinRoom, useDeleteRoom, useLeaveRoom } from '@/lib/hooks/useChat'
import { useRoomPresence } from '@/lib/hooks/usePresence'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import { useUserStatus } from '@/lib/hooks/useUserStatus'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Plus, Link2, Hash, LogOut, Settings, Phone, Share2, RefreshCw, Edit3, Trash2, Save, X, Check, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt'
import { useGlobalNotifications } from '@/lib/hooks/useGlobalNotifications'
import { SimpleThemeToggle } from '@/components/ui/SimpleThemeToggle'
import { CacheMonitor } from '@/components/cache/CacheMonitor'

export default function ChatPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [messageText, setMessageText] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showRoomShare, setShowRoomShare] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [typingStatus, setTypingStatus] = useState<{ [key: string]: boolean }>({})
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const {
    currentRoom,
    rooms,
    messages,
    isLoading,
    setCurrentRoom,
  } = useChatStore()

  // Hooks
  const sendMessage = useSendMessage()
  const createRoom = useCreateRoom()
  const deleteRoom = useDeleteRoom()
  const leaveRoom = useLeaveRoom()
  const onlineUsers = useRoomPresence(currentRoom?.id || null, user) || []
  const { startTyping: broadcastStartTyping, stopTyping: broadcastStopTyping } = useTypingIndicator(currentRoom?.id || null, user)
  const { userStatus } = useUserStatus(user)
  const { showConfirmation, ConfirmationComponent } = useConfirmation()

  // Initialize notifications
  useGlobalNotifications(user)

  // Load user and set up authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }
      
      setUser(user)
    }
    
    checkUser()
  }, [router, supabase.auth])

  // Load data functions
  const loadMessages = useLoadMessages(currentRoom?.id || null)
  const loadRooms = useLoadRooms()

  // Real-time subscriptions
  useRealTimeMessages(currentRoom?.id || null)

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      // loadRooms is handled by the hook
    }
  }, [user])

  // Handle URL parameters for room navigation and message highlighting
  useEffect(() => {
    if (!user || !rooms.length) return

    const urlParams = new URLSearchParams(window.location.search)
    const roomId = urlParams.get('room')
    const highlightMessageId = urlParams.get('highlight')
    const shouldReply = urlParams.get('reply')

    if (roomId) {
      // Find and switch to the specified room
      const targetRoom = rooms.find(room => room.id === roomId)
      if (targetRoom && currentRoom?.id !== roomId) {
        console.log('🔗 Navigating to room from notification:', targetRoom.name)
        setCurrentRoom(targetRoom)

        // Clear URL parameters after navigation
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)

        // Handle message highlighting
        if (highlightMessageId) {
          setTimeout(() => {
            const messageElement = document.querySelector(`[data-message-id="${highlightMessageId}"]`)
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              setHighlightedMessageId(highlightMessageId)
              setTimeout(() => setHighlightedMessageId(null), 3000)
            }
          }, 1000)
        }
      }
    }

    // Handle pending notification replies
    if (shouldReply) {
      const pendingReply = localStorage.getItem('pending_notification_reply')
      if (pendingReply) {
        try {
          const replyData = JSON.parse(pendingReply)
          console.log('📱 Processing pending notification reply:', replyData)
          
          // Set the reply text in the input
          setMessageText(`@${replyData.sender || 'someone'} ${replyData.reply_text}`)
          
          // Clear the pending reply
          localStorage.removeItem('pending_notification_reply')
          
          // Focus the input after a delay
          setTimeout(() => {
            const messageInput = document.querySelector('input[placeholder="Type your message..."]') as HTMLInputElement
            if (messageInput) {
              messageInput.focus()
              messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length)
            }
          }, 500)
        } catch (error) {
          console.error('Error processing pending reply:', error)
          localStorage.removeItem('pending_notification_reply')
        }
      }
    }
  }, [user, rooms, currentRoom, setCurrentRoom])

  // Listen for messages from service worker (notification replies)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('📱 Received message from service worker:', event.data)
      
      if (event.data.type === 'NOTIFICATION_REPLY') {
        const replyData = event.data.data
        console.log('💬 Processing notification reply:', replyData)
        
        // Navigate to the correct room if needed
        if (replyData.room_id && currentRoom?.id !== replyData.room_id) {
          const targetRoom = rooms.find(room => room.id === replyData.room_id)
          if (targetRoom) {
            setCurrentRoom(targetRoom)
          }
        }
        
        // Set the reply text in the input
        const replyText = replyData.reply_text
        if (replyText) {
          setMessageText(replyText)
          
          // Focus the input after a delay
          setTimeout(() => {
            const messageInput = document.querySelector('input[placeholder="Type your message..."]') as HTMLInputElement
            if (messageInput) {
              messageInput.focus()
              messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length)
            }
          }, 500)
        }
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage)
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
    }
  }, [currentRoom, rooms, setCurrentRoom])

  // Auto-scroll functions
  const scrollToBottom = (smooth = true) => {
    // Try multiple approaches to ensure scrolling works
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
    }
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return
    
    const container = messagesContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    
    // Show button if user has scrolled up more than 100px from bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
    
    // Update auto-scroll preference based on user behavior
    setAutoScroll(isNearBottom)
  }

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (messages.length > 0 && autoScroll) {
      scrollToBottom()
      // Additional scroll attempt after a short delay
      setTimeout(() => scrollToBottom(false), 50)
    }
  }, [messages, autoScroll])

  // Scroll to bottom on initial load and room change
  useEffect(() => {
    if (currentRoom && messages.length > 0) {
      // Always scroll to bottom when entering a room or on refresh
      setTimeout(() => scrollToBottom(false), 100)
      setAutoScroll(true)
      setShowScrollButton(false)
    }
  }, [currentRoom?.id, messages.length])

  // Enhanced auto-scroll on page load/refresh - triggers when messages are actually loaded
  useEffect(() => {
    if (messages.length > 0 && currentRoom?.id) {
      // Force scroll to bottom on initial load with multiple attempts
      const scrollAttempts = [0, 50, 100, 200, 500, 1000]
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
          }
          if (messagesContainerRef.current) {
            const container = messagesContainerRef.current
            container.scrollTop = container.scrollHeight
          }
          setAutoScroll(true)
          setShowScrollButton(false)
        }, delay)
      })
    }
  }, [messages.length, currentRoom?.id]) // Fixed dependency - trigger when messages change or room changes

  // Additional effect for initial page load - ensure scroll on very first load
  useEffect(() => {
    if (currentRoom?.id && messages.length === 0) {
      // Wait a bit longer for messages to load on fresh page load
      const timeout = setTimeout(() => {
        scrollToBottom(false)
        setAutoScroll(true)
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [currentRoom?.id])

  // Add scroll listener to messages container
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScrollPosition)
    return () => container.removeEventListener('scroll', checkScrollPosition)
  }, [currentRoom])

  // Auto-join PUBLIC room for first-time users
  useEffect(() => {
    if (user && rooms.length > 0 && !currentRoom) {
      const publicRoom = rooms.find((room: any) => room.code === 'PUBLIC')
      if (publicRoom) {
        setCurrentRoom(publicRoom)
      }
    }
  }, [user, rooms, currentRoom, setCurrentRoom])

  // Cache users and presence data
  useEffect(() => {
    if (!currentRoom?.id || !onlineUsers.length) return

    // Cache current room presence
    const presenceData = onlineUsers.map(user => ({
      user_id: user.user_id,
      room_id: currentRoom.id,
      status: 'online' as const,
      last_seen: user.last_seen || new Date().toISOString()
    }))
    
    userCacheManager.cacheRoomPresence(currentRoom.id, presenceData)

    // Cache individual users
    onlineUsers.forEach(user => {
      if (user.user_id && user.username) {
        userCacheManager.cacheUser(user.user_id, {
          username: user.username,
          avatar_url: user.avatar_url || undefined,
          status: 'online',
          last_seen: user.last_seen || new Date().toISOString()
        })
      }
    })
  }, [currentRoom?.id, onlineUsers])

  // Cache current user
  useEffect(() => {
    if (!user) return
    
    const mappedStatus = (() => {
      switch (userStatus) {
        case 'busy': return 'away' as const
        case 'away': return 'away' as const
        case 'offline': return 'offline' as const
        default: return 'online' as const
      }
    })()
    
    userCacheManager.cacheUser(user.id, {
      username: user.email?.split('@')[0] || user.id,
      avatar_url: user.user_metadata?.avatar_url,
      status: mappedStatus,
      last_seen: new Date().toISOString()
    })
  }, [user, userStatus])

  const startTyping = () => {
    if (!user || !currentRoom) return
    
    // Local typing state
    setTypingStatus(prev => ({ ...prev, [user.id]: true }))
    
    // Broadcast to other users
    broadcastStartTyping()
    
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    const timeout = setTimeout(() => {
      stopTyping()
    }, 2000)
    
    setTypingTimeout(timeout)
  }

  const stopTyping = () => {
    if (!user) return
    
    // Local typing state
    setTypingStatus(prev => ({ ...prev, [user.id]: false }))
    
    // Broadcast to other users
    broadcastStopTyping()
    
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !currentRoom || !user) return

    // Stop typing indicator when sending message
    stopTyping()

    const success = await sendMessage(messageText, user.id)
    if (success) {
      setMessageText('')
    }
  }

  // Handle typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)
    
    if (e.target.value.length > 0) {
      startTyping()
    } else {
      stopTyping()
    }
  }

  const handleInputBlur = () => {
    stopTyping()
  }
  
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim() || !user) return
    
    const room = await createRoom(newRoomName, user.id)
    if (room) {
      setNewRoomName('')
      setShowCreateRoom(false)
    }
  }

  const handleRefreshMessages = () => {
    if (currentRoom) {
      // Refresh is handled automatically by the real-time subscription
      window.location.reload()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingText(content)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editingText.trim() || isSavingEdit) return
    
    setIsSavingEdit(true)
    
    try {
      console.log('💾 Saving edited message:', messageId, 'New content:', editingText)
      
      // Try to update with edited_at first, fallback to just content if column doesn't exist
      let { error } = await supabase
        .from('messages')
        .update({ content: editingText, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user can only edit their own messages
      
      // If edited_at column doesn't exist, try without it
      if (error && error.message.includes('edited_at')) {
        console.log('⚠️ edited_at column not found, updating without it')
        const { error: fallbackError } = await supabase
          .from('messages')
          .update({ content: editingText })
          .eq('id', messageId)
          .eq('user_id', user.id)
        error = fallbackError
      }
      
      if (error) {
        console.error('❌ Error updating message:', error)
        alert(`Failed to save message: ${error.message}`)
        return
      }
      
      console.log('✅ Message updated successfully')
      
      // Also update the store immediately for instant UI feedback
      const { updateMessage } = useChatStore.getState()
      const updateData: any = { content: editingText }
      // Only add edited_at if we know the column exists (successful DB update)
      if (!error) {
        updateData.edited_at = new Date().toISOString()
      }
      updateMessage(messageId, updateData)
      
      // Clear editing state
      setEditingMessageId(null)
      setEditingText('')
      
    } catch (error) {
      console.error('Error editing message:', error)
      alert('Failed to save message. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingText('')
    setIsSavingEdit(false)
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const confirmed = await showConfirmation({
        title: 'Delete Message',
        message: 'Are you sure you want to delete this message? This action cannot be undone.',
        type: 'delete'
      })
      
      if (confirmed) {
        console.log('🗑️ Attempting to delete message:', messageId)
        
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
        
        if (!error) {
          console.log('✅ Message deleted successfully from database')
          
          // IMMEDIATE UI UPDATE: Don't wait for real-time, update immediately
          // Import the store methods
          const { deleteMessage: deleteFromStore } = useChatStore.getState()
          deleteFromStore(messageId)
          console.log('✅ Message removed from UI immediately')
          
        } else {
          console.error('❌ Failed to delete message:', error)
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    try {
      const confirmed = await showConfirmation({
        title: 'Delete Room',
        message: `Are you sure you want to delete the room "${roomName}"? This will permanently delete all messages and remove all members. This action cannot be undone.`,
        type: 'delete'
      })
      
      if (confirmed) {
        const success = await deleteRoom(roomId, user.id)
        if (success) {
          // If we're currently in the deleted room, switch to PUBLIC room
          if (currentRoom?.id === roomId) {
            const publicRoom = rooms.find((room: any) => room.code === 'PUBLIC')
            if (publicRoom) {
              setCurrentRoom(publicRoom)
            } else {
              setCurrentRoom(null)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }

  const handleJumpToMessage = async (messageId: string, roomId: string) => {
    try {
      // First, switch to the correct room if we're not already in it
      if (currentRoom?.id !== roomId) {
        const targetRoom = rooms.find(room => room.id === roomId)
        if (targetRoom) {
          setCurrentRoom(targetRoom)
          // Wait a bit for the room to load and render
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Try to scroll to the message
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        // Scroll to the message
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // Highlight the message temporarily
        setHighlightedMessageId(messageId)
        setTimeout(() => setHighlightedMessageId(null), 3000)
      } else {
        // Message not found in current view, might need to load more messages
        console.log('Message not found in current view:', messageId)
        // Could implement loading older messages here if needed
      }
      
      // Close search panel after navigation
      setShowSearch(false)
    } catch (error) {
      console.error('Error jumping to message:', error)
    }
  }

  if (!user) {
    return (
      <div className="chat-container flex items-center justify-center min-h-screen">
        <div className="text-lg text-secondary">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="chat-container flex h-screen max-h-screen overflow-hidden">
      {/* Notification Prompt */}
      <NotificationPrompt />
      
      {/* Sidebar - Rooms */}
      <div className="w-64 chat-sidebar flex flex-col shadow-2xl border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 chat-header border-b border-primary">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle size={20} className="text-blue-600 drop-shadow-lg" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Chat App
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <StatusIndicator status={userStatus} size="sm" />
            <p className="text-sm text-secondary truncate flex-1">
              {user.user_metadata?.name || user.email}
            </p>
          </div>
          <StatusSelector currentUser={user} />
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Rooms</h3>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/join')}
                  className="btn-secondary text-xs flex items-center gap-1 rounded-lg"
                  title="Join room by code"
                >
                  <Link2 size={14} />
                  Join
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateRoom(true)}
                  className="btn-secondary text-xs flex items-center gap-1 rounded-lg"
                >
                  <Plus size={14} />
                  New
                </Button>
              </div>
            </div>
            
            {/* Create Room Form */}
            {showCreateRoom && (
              <div className="mb-4 p-4 card rounded-xl fade-in">
                <form onSubmit={handleCreateRoom} className="space-y-3">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name"
                    className="w-full p-3 text-sm chat-input rounded-lg"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="btn-primary text-xs flex items-center gap-1">
                      <Check size={12} />
                      Create
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreateRoom(false)
                        setNewRoomName('')
                      }}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      <X size={12} />
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Room Items */}
            <div className="space-y-2">
              {rooms.map((room: any) => (
                <div
                  key={room.id}
                  className={`room-item group flex items-center gap-3 p-3 rounded-xl text-sm transition-all duration-200 ${
                    currentRoom?.id === room.id ? 'active' : ''
                  }`}
                >
                  <button
                    onClick={() => setCurrentRoom(room)}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold">{room.name}</div>
                    <div className="text-xs flex items-center gap-1 text-muted">
                      <Hash size={10} />
                      {room.code}
                    </div>
                  </button>
                  
                  {/* Room Actions */}
                  {user && room.code !== 'PUBLIC' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {/* Delete room button - only for room owners */}
                      {room.created_by === user.id && (
                        <button
                          onClick={() => handleDeleteRoom(room.id, room.name)}
                          className="p-1 btn-secondary rounded hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete room"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      {/* Leave room button - only for non-owners */}
                      {room.created_by !== user.id && (
                        <button
                          onClick={() => leaveRoom(room.id, user.id)}
                          className="p-1 btn-secondary rounded hover:bg-orange-500 hover:text-white transition-colors"
                          title="Leave room"
                        >
                          <LogOut size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Online Users */}
        {currentRoom && user && (
          <OnlineUsers users={onlineUsers} currentUserId={user.id} />
        )}
        
        <div className="p-4 chat-header border-t border-primary">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="btn-secondary w-full flex items-center justify-center gap-2 rounded-lg"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="chat-header p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-primary flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageCircle size={24} className="text-blue-600" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {currentRoom?.name || 'Select a room'}
                </span>
              </h1>
              {currentRoom && (
                <p className="text-sm text-secondary flex items-center gap-2 ml-12 mt-1">
                  <Hash size={12} />
                  <span className="font-mono card px-2 py-1 rounded text-xs">
                    {currentRoom.code}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Settings */}
              <NotificationSettings />
              
              {/* Cache Monitor Dashboard */}
              <CacheMonitor compact={true} />
              
              {/* Theme Toggle - Always visible */}
              <SimpleThemeToggle />
              
              {/* Room-specific buttons */}
              {currentRoom && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSearch(!showSearch)}
                    title={showSearch ? "Hide search" : "Search messages"}
                    className="btn-secondary flex items-center gap-2 rounded-lg"
                  >
                    <Search size={14} />
                    Search
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshMessages}
                    title="Refresh messages"
                    className="btn-secondary flex items-center gap-2 rounded-lg"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRoomShare(!showRoomShare)}
                    className="btn-secondary flex items-center gap-2 rounded-lg"
                  >
                    <Share2 size={14} />
                    Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                    title={isRightSidebarCollapsed ? "Show room info" : "Hide room info"}
                    className="btn-secondary flex items-center gap-2 rounded-lg"
                  >
                    {isRightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    Info
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Room Share Panel */}
          {showRoomShare && currentRoom && (
            <div className="mt-4 fade-in">
              <RoomShare roomCode={currentRoom.code} roomName={currentRoom.name} />
            </div>
          )}
          
          {/* Search Panel */}
          {showSearch && currentRoom && (
            <div className="mt-4 fade-in">
              <MessageSearch 
                currentUser={user}
                currentRoom={currentRoom}
                onJumpToMessage={handleJumpToMessage}
              />
            </div>
          )}
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 relative min-h-0 flex flex-col">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 chat-messages custom-scrollbar"
          >
          {isLoading ? (
            <div className="text-center text-secondary py-8">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                Loading messages...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted py-8">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message: any) => {
              const isCurrentUser = message.user_id === user?.id
              const displayName = isCurrentUser 
                ? 'You' 
                : message.profiles?.username || 'Anonymous User'
              const avatarLetter = isCurrentUser 
                ? 'Y' 
                : (message.profiles?.username?.[0]?.toUpperCase() || '?')
              
              const isEditing = editingMessageId === message.id
              const isHighlighted = highlightedMessageId === message.id
              
              return (
                <div 
                  key={message.id} 
                  data-message-id={message.id}
                  className={`group flex gap-4 fade-in transition-all duration-500 ${
                    isCurrentUser ? 'flex-row-reverse' : ''
                  } ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg ${
                    isCurrentUser 
                      ? 'bg-gradient-to-br from-green-500 to-green-600' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    {avatarLetter}
                  </div>
                  <div className={`flex flex-col min-w-0 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-semibold text-sm ${
                        isCurrentUser ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="relative group/message">
                      {isEditing ? (
                        <div className="space-y-2 fade-in w-full max-w-md">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-3 chat-input rounded-lg"
                            autoFocus
                            aria-label="Edit message"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(message.id)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(message.id)}
                              disabled={isSavingEdit || !editingText.trim()}
                              className="btn-primary text-xs"
                            >
                              <Save size={12} className="mr-1" />
                              {isSavingEdit ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="btn-secondary text-xs"
                            >
                              <X size={12} className="mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`p-4 rounded-2xl shadow-lg ${
                            isCurrentUser
                              ? 'message-bubble-own'
                              : 'message-bubble-other'
                          }`}>
                            <div className="text-sm leading-relaxed">{message.content}</div>
                          </div>
                          
                          {/* Message Reactions */}
                          <MessageReactions 
                            messageId={message.id} 
                            isOwnMessage={isCurrentUser}
                          />
                          
                          {/* Message Actions */}
                          {isCurrentUser && (
                            <div className={`absolute -top-2 ${isCurrentUser ? '-left-16' : '-right-16'} flex gap-1 opacity-0 group-hover/message:opacity-100 transition-all duration-200`}>
                              <button
                                onClick={() => handleStartEdit(message.id, message.content)}
                                className="btn-secondary p-2 rounded-lg hover:bg-blue-500 hover:text-white"
                                title="Edit message"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="btn-secondary p-2 rounded-lg hover:bg-red-500 hover:text-white"
                                title="Delete message"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
          
          {/* Floating Scroll to Bottom Button */}
          {showScrollButton && (
            <button
              type="button"
              onClick={() => {
                scrollToBottom()
                setShowScrollButton(false)
                setAutoScroll(true)
              }}
              className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center z-10 border-2 border-white"
              title="Scroll to bottom"
            >
              <ChevronDown size={20} />
            </button>
          )}
          </div>
        </div>

        {/* Typing Indicator */}
        <TypingIndicator />

        {/* Message Input */}
        {currentRoom && (
          <div className="chat-input-area p-6">
            <form onSubmit={handleSendMessage} className="flex gap-3 items-stretch">
              <input
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="Type your message..."
                className="flex-1 p-4 chat-input rounded-2xl shadow-lg"
                disabled={isLoading}
              />
              
              <Button
                type="submit"
                disabled={!messageText.trim() || isLoading}
                className="btn-primary p-4 flex items-center gap-2 rounded-2xl shadow-lg disabled:opacity-50"
              >
                <Send size={18} />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Right Sidebar - Room Info */}
      {currentRoom && user && !isRightSidebarCollapsed && (
        <div className="w-80 chat-sidebar flex flex-col shadow-2xl border-l border-primary">
          <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            <RoomInfo room={currentRoom} currentUserId={user.id} />
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmationComponent />
    </div>
  )
}