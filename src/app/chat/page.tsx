'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
import { Avatar } from '@/components/ui/Avatar'
import { userCacheManager } from '@/lib/cache/UserCacheManager'
import { useChatStore } from '@/lib/stores/chat'
import { useRealTimeMessages, useLoadMessages, useLoadRooms, useSendMessage, useCreateRoom, useJoinRoom, useDeleteRoom, useLeaveRoom } from '@/lib/hooks/useChat'
import { useRoomPresence } from '@/lib/hooks/usePresence'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import { useUserStatus } from '@/lib/hooks/useUserStatus'
import { useCacheSystem } from '@/lib/hooks/useCacheSystem'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Plus, Link2, Hash, LogOut, Settings, Phone, Share2, RefreshCw, Edit3, Trash2, Save, X, Check, ChevronLeft, ChevronRight, Search, ChevronDown, Heart } from 'lucide-react'
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt'
import { useGlobalNotifications } from '@/lib/hooks/useGlobalNotifications'
import { SimpleThemeToggle } from '@/components/ui/SimpleThemeToggle'
import { CacheMonitor } from '@/components/cache/CacheMonitor'
import { SettingsDashboard } from '@/components/ui/SettingsDashboard'
import { soundManager } from '@/lib/sounds/SoundManager'
import FriendsSidebar from '@/components/friends/FriendsSidebar'
import FriendChat from '@/components/friends/FriendChat'
import FriendDashboard from '@/components/friends/FriendDashboard'
import FriendInfo from '@/components/friends/FriendInfo'
import RoomSettings from '@/components/rooms/RoomSettings'
import type { FriendshipWithProfile, CoupleRoomWithDetails } from '@/types/friends'

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
  const [showSettingsDashboard, setShowSettingsDashboard] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isRoomListExpanded, setIsRoomListExpanded] = useState(true)
  
  // Chat mode state - 'room' | 'friend'
  const [chatMode, setChatMode] = useState<'room' | 'friend'>('room')
  const [currentFriendship, setCurrentFriendship] = useState<FriendshipWithProfile | null>(null)
  const [currentCoupleRoom, setCurrentCoupleRoom] = useState<CoupleRoomWithDetails | null>(null)
  const [previousRoom, setPreviousRoom] = useState<any>(null) // Store the room we were in before friend chat
  const [showFriendDashboard, setShowFriendDashboard] = useState(false)
  const [showRoomSettings, setShowRoomSettings] = useState(false)

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
  const { getCachedRoomInfo } = useCacheSystem()

  // Prefetch room info on hover for instant loading
  const prefetchRoomInfo = useCallback(async (roomId: string) => {
    const cached = await getCachedRoomInfo(roomId)
    if (!cached) {
      console.log(`🚀 Prefetching room info for hover: ${roomId}`)
      // This will trigger background fetch in the cache system
    }
  }, [getCachedRoomInfo])

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

  // Real-time ban enforcement - kick user immediately when banned
  useEffect(() => {
    if (!user || !currentRoom?.id) return

    console.log('🛡️ Setting up ban enforcement listener for room:', currentRoom.id)

    const channel = supabase
      .channel(`ban_enforcement:${currentRoom.id}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_banned_users',
          filter: `room_id=eq.${currentRoom.id}`
        },
        async (payload) => {
          console.log('🚫 Ban event detected:', payload)
          
          // Check if this user was banned
          if (payload.new.user_id === user.id) {
            console.log('⚠️ Current user has been banned from this room!')
            
            const reason = payload.new.reason ? `: ${payload.new.reason}` : ''
            
            // Show alert
            alert(`You have been banned from this room${reason}`)
            
            // Clear current room and switch to another room
            setCurrentRoom(null)
            
            // Find another room to switch to
            const otherRooms = rooms.filter(r => r.id !== currentRoom.id)
            if (otherRooms.length > 0) {
              // Switch to PUBLIC room or first available room
              const publicRoom = otherRooms.find(r => r.code === 'PUBLIC')
              const targetRoom = publicRoom || otherRooms[0]
              setTimeout(() => {
                setCurrentRoom(targetRoom)
              }, 1000)
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🛡️ Cleaning up ban enforcement listener')
      supabase.removeChannel(channel)
    }
  }, [currentRoom?.id, user, rooms, setCurrentRoom, supabase])

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
        handleRoomSelect(targetRoom)

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
            handleRoomSelect(targetRoom)
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
    
    // Reset unread count when user scrolls to bottom
    if (isNearBottom && unreadCount > 0) {
      setUnreadCount(0)
    }
    
    // Update auto-scroll preference based on user behavior
    setAutoScroll(isNearBottom)
  }

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (messages.length > 0 && autoScroll) {
      scrollToBottom()
      // Additional scroll attempt after a short delay
      setTimeout(() => scrollToBottom(false), 50)
    } else if (messages.length > 0 && !autoScroll && showScrollButton) {
      // If user is scrolled up and new messages arrive, increment unread count
      const newMessageCount = 1 // Simplified - in a real app, you'd track the actual new message count
      setUnreadCount(prev => prev + newMessageCount)
    }
  }, [messages, autoScroll, showScrollButton])

  // Scroll to bottom on initial load and room change
  useEffect(() => {
    if (currentRoom && messages.length > 0) {
      // Always scroll to bottom when entering a room or on refresh
      setTimeout(() => scrollToBottom(false), 100)
      setAutoScroll(true)
      setShowScrollButton(false)
      setUnreadCount(0) // Reset unread count when switching rooms
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

    // Check if user is banned before sending message
    const { data: bannedUser, error: banCheckError } = await supabase
      .from('room_banned_users')
      .select('id, reason')
      .eq('room_id', currentRoom.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (banCheckError) {
      console.error('Error checking ban status:', banCheckError)
    }

    if (bannedUser) {
      const reason = bannedUser.reason ? `: ${bannedUser.reason}` : ''
      alert(`You cannot send messages. You are banned from this room${reason}`)
      setMessageText('')
      // Force leave the room
      setCurrentRoom(null)
      return
    }

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
      const updateData: { content: string; edited_at?: string } = { content: editingText }
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
          handleRoomSelect(targetRoom)
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

  // Friend Chat Handlers
  const handleFriendChatSelect = (friendship: FriendshipWithProfile, coupleRoom?: CoupleRoomWithDetails) => {
    // Store the current room before switching to friend chat
    if (currentRoom) {
      setPreviousRoom(currentRoom)
    }
    setChatMode('friend')
    setCurrentFriendship(friendship)
    setCurrentCoupleRoom(coupleRoom || null)
    setCurrentRoom(null) // Exit regular chat room
    setIsMobileSidebarOpen(false) // Close mobile sidebar
  }

  const handleBackToRegularChat = () => {
    setChatMode('room')
    setCurrentFriendship(null)
    setCurrentCoupleRoom(null)
    
    // Restore the previous room if available, otherwise select PUBLIC room or first available room
    if (previousRoom) {
      setCurrentRoom(previousRoom)
    } else if (rooms.length > 0) {
      const publicRoom = rooms.find((room: any) => room.code === 'PUBLIC')
      const targetRoom = publicRoom || rooms[0]
      setCurrentRoom(targetRoom)
    }
  }

  const handleStartChatFromDashboard = (friendship: FriendshipWithProfile) => {
    handleFriendChatSelect(friendship, undefined)
    setShowFriendDashboard(false)
  }

  const handleRoomSelect = async (room: any) => {
    if (!user) return

    // Check if user is banned from this room
    const { data: bannedUser, error: banCheckError } = await supabase
      .from('room_banned_users')
      .select('id, reason')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (banCheckError) {
      console.error('Error checking ban status:', banCheckError)
    }

    if (bannedUser) {
      const reason = bannedUser.reason ? `: ${bannedUser.reason}` : ''
      alert(`You are banned from this room${reason}`)
      return
    }

    // Switch to room chat mode when selecting a regular room
    setChatMode('room')
    setCurrentFriendship(null)
    setCurrentCoupleRoom(null)
    setCurrentRoom(room)
    setPreviousRoom(null) // Clear previous room since we're selecting a new one
    setIsMobileSidebarOpen(false) // Close mobile sidebar on room selection
  }

  if (!user) {
    return (
      <div className="chat-container flex items-center justify-center min-h-screen">
        <div className="text-lg text-secondary">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="chat-container flex h-screen max-h-screen overflow-hidden relative">
      {/* Notification Prompt */}
      <NotificationPrompt />
      
      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
        !isMobileSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`} onClick={() => setIsMobileSidebarOpen(false)} />
      
      {/* Sidebar - Rooms */}
      <div className={`w-72 sm:w-80 lg:w-72 chat-sidebar flex flex-col shadow-2xl rounded-r-3xl lg:rounded-none backdrop-blur-xl bg-gradient-to-b from-white/95 to-white/90 dark:from-gray-900/95 dark:to-gray-800/90 border-r border-gray-200/50 dark:border-gray-700/50 z-50 transition-all duration-500 ease-in-out fixed lg:relative h-full ${
        !isMobileSidebarOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
      }`}>
        <div className="p-5 chat-header">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <MessageCircle size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Chat App
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3 p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
            <StatusIndicator status={userStatus} size="sm" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
              {user.user_metadata?.name || user.email}
            </p>
          </div>
          <StatusSelector currentUser={user} />
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-4">
            {/* Friends Section */}
            {user && (
              <FriendsSidebar
                currentUserId={user.id}
                onFriendChatSelect={handleFriendChatSelect}
                showFriendDashboard={showFriendDashboard}
                onShowFriendDashboard={setShowFriendDashboard}
                selectedFriendshipId={currentFriendship?.id}
              />
            )}
            
            <div className="flex items-center justify-between mb-2 p-2 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
              <button
                onClick={() => setIsRoomListExpanded(!isRoomListExpanded)}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {isRoomListExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Rooms
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => router.push('/join')}
                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all duration-300 hover:scale-110"
                  title="Join room by code"
                >
                  <Link2 size={14} />
                </button>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all duration-300 hover:scale-110"
                  title="Create new room"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            
            {/* Create Room Form */}
            {showCreateRoom && (
              <div className="mb-4 p-5 backdrop-blur-xl bg-gradient-to-br from-white/95 to-blue-50/30 dark:from-gray-800/95 dark:to-blue-900/20 border-2 border-blue-200/50 dark:border-blue-700/50 rounded-3xl shadow-2xl animate-slideDown">
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name... ✨"
                    className="w-full p-4 text-sm backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 font-medium"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Create Room
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateRoom(false)
                        setNewRoomName('')
                      }}
                      className="p-3 px-5 backdrop-blur-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-700/80 dark:hover:bg-gray-600/80 border border-gray-300/50 dark:border-gray-600/50 font-semibold rounded-2xl transition-all duration-300 flex items-center gap-2"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Room Items */}
            {isRoomListExpanded && (
            <div className="space-y-1 animate-fadeIn">
              {rooms.map((room: any) => (
                <div
                  key={room.id}
                  className={`group flex items-center gap-2 p-2 rounded-lg text-xs transition-all duration-300 ${
                    chatMode === 'room' && currentRoom?.id === room.id 
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30 border-2 border-blue-500/60 dark:border-blue-400/60 shadow-lg shadow-blue-500/30 scale-[1.02]' 
                      : 'bg-white/80 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg hover:border-blue-300/50 dark:hover:border-blue-600/50'
                  } transform hover:scale-[1.01] cursor-pointer backdrop-blur-sm`}
                  onMouseEnter={() => prefetchRoomInfo(room.id)}
                >
                  {/* Room Avatar */}
                  {room.avatar_url ? (
                    <img
                      src={room.avatar_url}
                      alt={room.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Hash size={14} className="text-white" />
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleRoomSelect(room)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-bold text-xs text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                        chatMode === 'room' && currentRoom?.id === room.id
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}></div>
                      <span className="truncate">{room.name}</span>
                    </div>
                    <div className="text-[10px] flex items-center gap-1 text-gray-500 dark:text-gray-400 mt-0.5">
                      <Hash size={10} />
                      <span className="font-mono bg-gray-100 dark:bg-gray-700/50 px-1 py-0.5 rounded text-[9px]">{room.code}</span>
                    </div>
                  </button>
                  
                  {/* Room Actions */}
                  {user && room.code !== 'PUBLIC' && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {/* Delete room button - only for room owners */}
                      {room.created_by === user.id && (
                        <button
                          onClick={() => handleDeleteRoom(room.id, room.name)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white transition-all duration-300 hover:scale-110"
                          title="Delete room"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      {/* Leave room button - only for non-owners */}
                      {room.created_by !== user.id && (
                        <button
                          onClick={() => leaveRoom(room.id, user.id)}
                          className="p-1 rounded bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white transition-all duration-300 hover:scale-110"
                          title="Leave room"
                        >
                          <LogOut size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
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
      <div className="flex-1 flex flex-col lg:ml-0 ml-0">
        {/* Chat Header */}
        <div className="chat-header p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-lg lg:text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <MessageCircle size={24} className="text-blue-600" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {currentRoom?.name || 'Select a room'}
                  </span>
                </h1>
                {currentRoom && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 ml-12 mt-1">
                    <Hash size={12} />
                    <span className="font-mono bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs border border-gray-300/50 dark:border-gray-700/50">
                      {currentRoom.code}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Settings Dashboard */}
              <button
                onClick={() => setShowSettingsDashboard(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              
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
        
        {/* Main Content - Either Regular Chat or Friend Chat */}
        {chatMode === 'friend' && currentFriendship ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <FriendChat
              friendship={currentFriendship}
              coupleRoom={currentCoupleRoom || undefined}
              currentUserId={user?.id || ''}
              currentUser={user}
              onBack={handleBackToRegularChat}
            />
          </div>
        ) : (
          <>
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
                  <Avatar
                    email={message.profiles?.email}
                    avatarUrl={message.profiles?.avatar_url}
                    username={message.profiles?.username || 'Anonymous User'}
                    userId={message.user_id}
                    size="md"
                    className="shadow-lg flex-shrink-0"
                  />
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
                          <div className={`p-4 rounded-2xl shadow-xl backdrop-blur-xl transform hover:scale-[1.02] transition-all duration-300 ${
                            isCurrentUser
                              ? 'bg-blue-500/30 dark:bg-blue-600/30 text-gray-900 dark:text-gray-100 border border-blue-400/50 dark:border-blue-500/50 shadow-blue-500/30'
                              : 'bg-white/90 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 shadow-gray-500/20 border border-gray-300/70 dark:border-gray-700/60'
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
          
          {/* Modern Floating Scroll to Bottom Button */}
          {showScrollButton && (
            <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-20">
              <button
                type="button"
                onClick={() => {
                  scrollToBottom()
                  setShowScrollButton(false)
                  setAutoScroll(true)
                  setUnreadCount(0)
                }}
                className="group relative bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 p-2 lg:p-3 rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-gray-200 dark:border-gray-600"
                title={unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : "Scroll to bottom"}
              >
                {/* Subtle ripple effect background */}
                <div className="absolute inset-0 rounded-xl bg-gray-100 dark:bg-gray-700 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                
                {/* Unread count badge */}
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-md">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
                
                {/* Icon with subtle animation */}
                <div className="relative z-10 flex items-center justify-center">
                  <ChevronDown 
                    size={20} 
                    className="transform group-hover:translate-y-0.5 transition-transform duration-200" 
                  />
                </div>
                
                {/* Subtle pulse animation ring - only show when there are unread messages */}
                {unreadCount > 0 && (
                  <div className="absolute inset-0 rounded-xl bg-blue-500/20 animate-pulse"></div>
                )}
                
                {/* Enhanced Tooltip */}
                <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap shadow-lg">
                  {unreadCount > 0 
                    ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''} • Click to scroll` 
                    : 'Scroll to bottom'
                  }
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Typing Indicator */}
        <TypingIndicator />

        {/* Message Input */}
        {currentRoom && (
          <div className="chat-input-area p-3 lg:p-6 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-t border-white/20 dark:border-gray-700/50">
            <form onSubmit={handleSendMessage} className="flex gap-2 lg:gap-3 items-stretch">
              <input
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="Type your message... ✨"
                className="flex-1 p-3 lg:p-4 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-300/70 dark:border-gray-700/50 rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-sm lg:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                disabled={isLoading}
              />
              
              <Button
                type="submit"
                disabled={!messageText.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white p-3 lg:p-4 flex items-center gap-2 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.05] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send size={16} className="lg:size-[18px]" />
                <span className="hidden sm:inline font-semibold">Send</span>
              </Button>
            </form>
          </div>
        )}
        </>
        )}
      </div>

      {/* Right Sidebar - Friend Info or Room Info */}
      {user && !isRightSidebarCollapsed && (
        <div className="w-80 lg:w-80 md:w-72 sm:w-full chat-sidebar hidden lg:flex flex-col shadow-2xl border-l border-primary">
          <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            {currentFriendship && currentCoupleRoom ? (
              <FriendInfo 
                friendship={currentFriendship}
                relationshipStatus={currentCoupleRoom.relationship_status}
                currentUserId={user.id}
                onRemove={() => {
                  setCurrentFriendship(null)
                  setCurrentCoupleRoom(null)
                  setChatMode('room')
                }}
              />
            ) : currentRoom ? (
              <RoomInfo 
                room={currentRoom} 
                currentUserId={user.id}
                onOpenSettings={() => setShowRoomSettings(true)}
              />
            ) : null}
          </div>
        </div>
      )}
      
      {/* Settings Dashboard */}
      <SettingsDashboard
        isOpen={showSettingsDashboard}
        onClose={() => setShowSettingsDashboard(false)}
      />

      {/* Confirmation Dialog */}
      <ConfirmationComponent />

      {/* Friend Dashboard */}
      {user && (
        <FriendDashboard
          isOpen={showFriendDashboard}
          onClose={() => setShowFriendDashboard(false)}
          currentUserId={user.id}
          onStartChat={handleStartChatFromDashboard}
        />
      )}

      {/* Room Settings */}
      {showRoomSettings && currentRoom && user && (
        <RoomSettings
          room={currentRoom as any}
          currentUserId={user.id}
          userRole={currentRoom.created_by === user.id ? 'owner' : 'member'}
          onClose={() => setShowRoomSettings(false)}
          onUpdate={async () => {
            // Reload rooms to reflect changes
            await loadRooms
            if (currentRoom) {
              // Reload current room data
              setCurrentRoom({ ...currentRoom })
            }
          }}
        />
      )}
    </div>
  )
}