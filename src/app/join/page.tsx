'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChatStore } from '@/lib/stores/chat'
import { useJoinRoom } from '@/lib/hooks/useChat'

export default function JoinRoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [room, setRoom] = useState<any>(null)
  
  const { setCurrentRoom } = useChatStore()
  const joinRoom = useJoinRoom()
  
  // Get room code from URL params
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setRoomCode(code)
    }
  }, [searchParams])
  
  // Check authentication
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
  
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim() || !user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const room = await joinRoom(roomCode.trim(), user.id)
      if (room) {
        setRoom(room)
      }
    } catch (error: any) {
      console.error('Error joining room:', error)
      setError(`Failed to join room: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleEnterRoom = () => {
    if (room) {
      setCurrentRoom(room)
      router.push('/chat')
    }
  }
  
  const handleCreateNewRoom = () => {
    router.push('/chat')
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔗 Join Room
          </h1>
          <p className="text-gray-600">
            Enter a room code to join the conversation
          </p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Room Found Success */}
        {room && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 rounded">
            <h3 className="font-semibold text-green-900 mb-2">Room Found! 🎉</h3>
            <div className="text-green-800">
              <p><strong>Name:</strong> {room.name}</p>
              <p><strong>Code:</strong> {room.code}</p>
              <p><strong>Created:</strong> {new Date(room.created_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleEnterRoom}
                className="flex-1"
              >
                Enter Room
              </Button>
              <Button
                onClick={() => {
                  setRoom(null)
                  setRoomCode('')
                }}
                variant="outline"
                className="flex-1"
              >
                Try Another
              </Button>
            </div>
          </div>
        )}
        
        {/* Join Room Form */}
        {!room && (
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code (e.g., PUBLIC, ROOM_123)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                autoFocus
              />
            </div>
            
            <Button
              type="submit"
              disabled={!roomCode.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? 'Searching...' : 'Join Room'}
            </Button>
          </form>
        )}
        
        {/* Alternative Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Don't have a room code?
            </p>
            <Button
              onClick={handleCreateNewRoom}
              variant="outline"
              className="w-full"
            >
              Go to Chat & Create Room
            </Button>
          </div>
        </div>
        
        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips:</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Room codes are case-insensitive</li>
            <li>• Try "PUBLIC" for the general chat room</li>
            <li>• Share room codes with friends to invite them</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
