'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { RoomShare } from '@/components/ui/RoomShare'
import { OnlineUsers } from '@/components/ui/OnlineUsers'
import { useChatStore } from '@/lib/stores/chat'
import { useRealTimeMessages, useLoadMessages, useLoadRooms, useSendMessage, useCreateRoom, useJoinRoom, useDeleteRoom, useLeaveRoom } from '@/lib/hooks/useChat'
import { useRoomPresence } from '@/lib/hooks/usePresence'
import { useTypingIndicator, useTypingCleanup } from '@/lib/hooks/useTypingIndicator'
import { TypingIndicator } from '@/components/TypingIndicator'
import { SimpleThemeToggle } from '@/components/ui/SimpleThemeToggle'
import { useRouter } from 'next/navigation'
import { 
  Send, 
  Link2, 
  Plus, 
  Share2, 
  RefreshCw, 
  LogOut,
  Trash2,
  DoorOpen,
  MessageCircle,
  Hash,
  Users,
  X,
  Check,
  Edit3,
  MoreVertical,
  Save,
  Wifi,
  WifiOff
} from 'lucide-react'

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [messageText, setMessageText] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showRoomShare, setShowRoomShare] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { 
    currentRoom, 
    messages, 
    rooms, 
    isLoading, 
    error,
    setCurrentRoom,
    setError 
  } = useChatStore()
  
  const sendMessage = useSendMessage()
  const createRoom = useCreateRoom()
  const deleteRoom = useDeleteRoom()
  const leaveRoom = useLeaveRoom()
  
  // Track online users in current room
  const onlineUsers = useRoomPresence(currentRoom?.id || null, user)
  
  // Typing indicator functionality
  const { startTyping, stopTyping } = useTypingIndicator(currentRoom?.id || null, user)
  useTypingCleanup()
  
  // Load user and set up authentication
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }
      
      setUser(user)
    }
    
    checkUser()
  }, [router])
  
  // Load rooms on mount
  useLoadRooms()
  
  // Set default room (Public Chat) when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && !currentRoom) {
      const publicRoom = rooms.find(room => room.code === 'PUBLIC')
      if (publicRoom) {
        setCurrentRoom(publicRoom)
      }
    }
  }, [rooms, currentRoom, setCurrentRoom])
  
  // Load messages for current room
  useLoadMessages(currentRoom?.id || null)
  
  // Set up real-time messaging
  useRealTimeMessages(currentRoom?.id || null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !user) return
    
    // Stop typing indicator before sending
    stopTyping()
    
    const success = await sendMessage(messageText, user.id)
    if (success) {
      setMessageText('')
    }
  }

  // Handle typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)
    
    // Start typing indicator when user types
    if (e.target.value.length > 0) {
      startTyping()
    } else {
      stopTyping()
    }
  }

  const handleInputBlur = () => {
    // Stop typing when input loses focus
    stopTyping()
  }
  
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim() || !user) return
    
    const room = await createRoom(newRoomName, user.id)
    if (room) {
      setNewRoomName('')
      setShowCreateRoom(false)
      setCurrentRoom(room)
    }
  }
  
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }
  
  const handleRefreshMessages = () => {
    setLastRefresh(new Date())
    // This will trigger useLoadMessages to reload
    if (currentRoom) {
      window.location.reload() // Simple refresh for now
    }
  }
  
  const handleDeleteRoom = async (roomId: string) => {
    if (!user) return
    
    const confirmed = window.confirm('Are you sure you want to delete this room? This action cannot be undone.')
    if (!confirmed) return
    
    const success = await deleteRoom(roomId, user.id)
    if (success) {
      // Room deleted, current room will be cleared by the hook
      setError(null)
    }
  }
  
  const handleLeaveRoom = async (roomId: string) => {
    if (!user) return
    
    const confirmed = window.confirm('Are you sure you want to leave this room?')
    if (!confirmed) return
    
    const success = await leaveRoom(roomId, user.id)
    if (success) {
      // Room left, current room will be cleared by the hook  
      setError(null)
    }
  }

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingText(content)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingText('')
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editingText.trim()) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('messages')
        .update({ content: editingText.trim() })
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user can only edit their own messages
      
      if (error) throw error
      
      // Update local state - this will be handled by real-time updates
      setEditingMessageId(null)
      setEditingText('')
    } catch (error: any) {
      console.error('Error editing message:', error)
      setError(`Failed to edit message: ${error.message}`)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return
    
    const confirmed = window.confirm('Are you sure you want to delete this message?')
    if (!confirmed) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user can only delete their own messages
      
      if (error) throw error
      
      // Message will be removed by real-time updates
    } catch (error: any) {
      console.error('Error deleting message:', error)
      setError(`Failed to delete message: ${error.message}`)
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
    <div className="chat-container flex h-screen">
      {/* Sidebar - Rooms */}
      <div className="w-64 chat-sidebar flex flex-col shadow-2xl">
        <div className="p-4 chat-header border-b">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <MessageCircle size={20} className="text-blue-600 drop-shadow-lg" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Chat App
            </span>
          </h2>
          <p className="text-sm text-secondary truncate mt-1">
            {user.user_metadata?.name || user.email}
          </p>
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
              <div className="mb-4 p-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-600 rounded-xl shadow-lg border border-slate-300 dark:border-gray-600/50 transition-colors duration-300">
                <form onSubmit={handleCreateRoom} className="space-y-3">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name"
                    className="w-full p-3 text-sm border border-slate-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800/80 text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 transition-all duration-200"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="text-xs flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-200">
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
                      className="text-xs flex items-center gap-1 bg-slate-300 dark:bg-gray-600/80 border-slate-400 dark:border-gray-500 text-slate-700 dark:text-gray-300 hover:bg-slate-400 dark:hover:bg-gray-500 transition-all duration-200"
                    >
                      <X size={12} />
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Room List */}
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`group flex items-center gap-3 p-3 rounded-xl text-sm transition-all duration-200 shadow-lg ${
                    currentRoom?.id === room.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-blue-100 shadow-blue-500/25'
                      : 'hover:bg-gradient-to-r hover:from-slate-300 hover:to-slate-400 dark:hover:from-gray-700 dark:hover:to-gray-600 text-slate-700 dark:text-gray-300 bg-slate-200 dark:bg-gray-800/50 backdrop-blur-sm'
                  }`}
                >
                  <button
                    onClick={() => setCurrentRoom(room)}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold">{room.name}</div>
                    <div className={`text-xs flex items-center gap-1 transition-colors duration-300 ${
                      currentRoom?.id === room.id ? 'text-blue-200' : 'text-slate-500 dark:text-gray-400'
                    }`}>
                      <Hash size={10} />
                      {room.code}
                    </div>
                  </button>
                  
                  {/* Room Actions */}
                  {user && room.code !== 'PUBLIC' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {room.created_by === user.id ? (
                        // Delete button for room creator (admin)
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRoom(room.id)
                          }}
                          className="p-2 text-red-400 hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Delete room"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        // Leave button for members
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLeaveRoom(room.id)
                          }}
                          className="p-2 text-orange-400 hover:bg-orange-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Leave room"
                        >
                          <DoorOpen size={14} />
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
        
        <div className="p-4 border-t border-slate-300 dark:border-gray-700/50 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700 transition-colors duration-300">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-600 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:from-slate-300 hover:to-slate-400 dark:hover:from-gray-600 dark:hover:to-gray-500 hover:text-slate-800 dark:hover:text-gray-100 transition-all duration-200 rounded-lg shadow-lg"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Chat Header */}
        <div className="bg-slate-100 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700 border-b border-slate-200 dark:border-gray-700/50 p-4 shadow-lg transition-colors duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-gray-100 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageCircle size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  {currentRoom?.name || 'Select a room'}
                </span>
                {/* Connection Status Indicator */}
                {currentRoom && (
                  <div className={`ml-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    error && (error.includes('failed') || error.includes('No internet') || error.includes('timed out'))
                      ? 'bg-red-900/50 text-red-300'
                      : error && (error.includes('Reconnecting') || error.includes('Attempting'))
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-green-900/50 text-green-300'
                  }`}>
                    {error && (error.includes('failed') || error.includes('No internet') || error.includes('timed out')) ? (
                      <WifiOff size={12} />
                    ) : error && (error.includes('Reconnecting') || error.includes('Attempting')) ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent"></div>
                    ) : (
                      <Wifi size={12} />
                    )}
                    <span>
                      {error && (error.includes('failed') || error.includes('No internet') || error.includes('timed out'))
                        ? 'Offline'
                        : error && (error.includes('Reconnecting') || error.includes('Attempting'))
                        ? 'Connecting'
                        : 'Connected'
                      }
                    </span>
                  </div>
                )}
              </h1>
              {currentRoom && (
                <p className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-2 ml-12 mt-1 transition-colors duration-300">
                  <Hash size={12} />
                  <span className="font-mono bg-slate-200 dark:bg-gray-700 px-2 py-1 rounded text-xs transition-colors duration-300">
                    {currentRoom.code}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle - Always visible */}
              <SimpleThemeToggle />
              
              {/* Room-specific buttons */}
              {currentRoom && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshMessages}
                    title="Refresh messages"
                    className="flex items-center gap-2 bg-slate-200 dark:bg-gray-700/80 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-all duration-200 rounded-lg shadow-lg backdrop-blur-sm"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRoomShare(!showRoomShare)}
                    className="flex items-center gap-2 bg-slate-200 dark:bg-gray-700/80 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-all duration-200 rounded-lg shadow-lg backdrop-blur-sm"
                  >
                    <Share2 size={14} />
                    Share
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Room Share Panel */}
          {showRoomShare && currentRoom && (
            <div className="mt-4">
              <RoomShare roomCode={currentRoom.code} roomName={currentRoom.name} />
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className={`border px-4 py-3 mx-4 mt-4 rounded-lg shadow-lg ${
            error.includes('Reconnecting') || error.includes('Attempting') || error.includes('Back online')
              ? 'bg-yellow-900/50 border-yellow-700 text-yellow-300'
              : error.includes('No internet')
              ? 'bg-orange-900/50 border-orange-700 text-orange-300'
              : 'bg-red-900/50 border-red-700 text-red-300'
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {(error.includes('Reconnecting') || error.includes('Attempting')) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                )}
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className={`hover:scale-110 transition-transform ${
                  error.includes('Reconnecting') || error.includes('Attempting') || error.includes('Back online')
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : error.includes('No internet')
                    ? 'text-orange-400 hover:text-orange-300'
                    : 'text-red-400 hover:text-red-300'
                }`}
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 chat-messages transition-colors duration-300">
          {isLoading ? (
            <div className="text-center text-slate-500 dark:text-gray-400 py-8 transition-colors duration-300">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 dark:border-blue-400"></div>
                Loading messages...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <MessageCircle size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation! 👋</p>
            </div>
          ) : (
            messages.map((message) => {
              // Get display name with proper logic
              const isCurrentUser = message.user_id === user?.id
              const displayName = isCurrentUser 
                ? 'You' 
                : message.profiles?.username || 'Anonymous User'
              const avatarLetter = isCurrentUser 
                ? 'Y' 
                : (message.profiles?.username?.[0]?.toUpperCase() || '?')
              
              const isEditing = editingMessageId === message.id
              
              return (
                <div key={message.id} className={`group flex gap-4 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg ${
                    isCurrentUser 
                      ? 'bg-gradient-to-br from-green-500 to-green-600' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    {avatarLetter}
                  </div>
                  <div className={`flex-1 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className={`font-semibold text-sm transition-colors duration-300 ${
                        isCurrentUser ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-gray-500 transition-colors duration-300">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className={`relative group/message ${isCurrentUser ? 'ml-8' : 'mr-8'}`}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-3 bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg text-slate-800 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 transition-colors duration-300"
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
                              className="text-xs bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save size={12} className="mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="text-xs bg-slate-200 dark:bg-gray-600 border-slate-300 dark:border-gray-500 text-slate-700 dark:text-gray-300 transition-colors duration-300"
                            >
                              <X size={12} className="mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-colors duration-300 ${
                            isCurrentUser
                              ? 'bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white'
                              : 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-600 text-slate-800 dark:text-gray-100'
                          }`}>
                            <div className="text-sm leading-relaxed">{message.content}</div>
                          </div>
                          
                          {/* Message Actions */}
                          {isCurrentUser && (
                            <div className={`absolute top-0 ${isCurrentUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex gap-1 opacity-0 group-hover/message:opacity-100 transition-all duration-200 pr-2`}>
                              <button
                                onClick={() => handleStartEdit(message.id, message.content)}
                                className="p-2 bg-slate-300 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-600 text-slate-600 dark:text-gray-300 hover:text-white rounded-lg transition-all duration-200 shadow-lg"
                                title="Edit message"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-2 bg-slate-300 dark:bg-gray-600 hover:bg-red-500 dark:hover:bg-red-600 text-slate-600 dark:text-gray-300 hover:text-white rounded-lg transition-all duration-200 shadow-lg"
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
        </div>
        
        {/* Typing Indicator */}
        <TypingIndicator />
        
        {/* Message Input */}
        {currentRoom && (
          <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700 border-t border-slate-300 dark:border-gray-700/50 p-6 shadow-lg transition-colors duration-300">
            <form onSubmit={handleSendMessage} className="flex gap-3 items-stretch">
              <input
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="Type your message..."
                className="flex-1 p-4 border border-slate-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700/80 text-slate-800 dark:text-gray-100 placeholder-slate-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm shadow-lg"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || isLoading}
                className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center gap-2 rounded-2xl shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                <Send size={18} />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
