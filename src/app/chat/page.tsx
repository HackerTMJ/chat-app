'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { RoomShare } from '@/components/ui/RoomShare'
import { OnlineUsers } from '@/components/ui/OnlineUsers'
import { useChatStore } from '@/lib/stores/chat'
import { useRealTimeMessages, useLoadMessages, useLoadRooms, useSendMessage, useCreateRoom, useJoinRoom } from '@/lib/hooks/useChat'
import { useRoomPresence } from '@/lib/hooks/usePresence'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [messageText, setMessageText] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showRoomShare, setShowRoomShare] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
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
  
  // Track online users in current room
  const onlineUsers = useRoomPresence(currentRoom?.id || null, user)
  
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
    
    const success = await sendMessage(messageText, user.id)
    if (success) {
      setMessageText('')
    }
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
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar - Rooms */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🗨️ Chat App</h2>
          <p className="text-sm text-gray-600 truncate">
            {user.user_metadata?.name || user.email}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Rooms</h3>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/join')}
                  className="text-xs"
                  title="Join room by code"
                >
                  🔗
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateRoom(true)}
                  className="text-xs"
                >
                  + New
                </Button>
              </div>
            </div>
            
            {/* Create Room Form */}
            {showCreateRoom && (
              <form onSubmit={handleCreateRoom} className="mb-3 p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room name"
                  className="w-full p-2 text-sm border border-gray-300 rounded mb-2"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button type="submit" size="sm" className="text-xs">
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
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            
            {/* Room List */}
            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setCurrentRoom(room)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    currentRoom?.id === room.id
                      ? 'bg-blue-100 text-blue-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{room.name}</div>
                  <div className="text-xs text-gray-500">#{room.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Online Users */}
        {currentRoom && user && (
          <OnlineUsers users={onlineUsers} currentUserId={user.id} />
        )}
        
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentRoom?.name || 'Select a room'}
              </h1>
              {currentRoom && (
                <p className="text-sm text-gray-600">Room code: {currentRoom.code}</p>
              )}
            </div>
            {currentRoom && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshMessages}
                  title="Refresh messages"
                >
                  🔄
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRoomShare(!showRoomShare)}
                >
                  📤 Share
                </Button>
              </div>
            )}
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">
              No messages yet. Start the conversation! 👋
            </div>
          ) : (
            messages.map((message) => {
              // Get display name from profile or fallback to email from user metadata
              const displayName = message.profiles?.username || 
                                message.user_id === user?.id ? 'You' : 
                                'Anonymous User'
              const avatarLetter = displayName[0]?.toUpperCase() || '?'
              
              return (
                <div key={message.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                    {avatarLetter}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {displayName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-700">{message.content}</div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        {currentRoom && (
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || isLoading}
                className="px-6"
              >
                Send
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
