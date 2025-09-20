'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChatStore } from '@/lib/stores/chat'
import { useJoinRoom } from '@/lib/hooks/useChat'
import { Link2, PartyPopper } from 'lucide-react'

function JoinRoomContent() {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center justify-center gap-2">
            <Link2 size={28} className="text-blue-400" />
            Join Room
          </h1>
          <p className="text-gray-400">
            Enter a room code to join the conversation
          </p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded">
            {error}
          </div>
        )}
        
        {/* Room Found Success */}
        {room && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded">
            <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
              <PartyPopper size={18} />
              Room Found!
            </h3>
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
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-300 mb-2">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code (e.g., PUBLIC, ROOM_123)"
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
                autoFocus
              />
            </div>
            
            <Button
              type="submit"
              disabled={!roomCode.trim() || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Searching...' : 'Join Room'}
            </Button>
          </form>
        )}
        
        {/* Alternative Actions */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-400">
              Don't have a room code?
            </p>
            <Button
              onClick={handleCreateNewRoom}
              variant="outline"
              className="w-full bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              Go to Chat & Create Room
            </Button>
          </div>
        </div>
        
        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
          <h4 className="font-medium text-blue-400 mb-2">💡 Tips:</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Room codes are case-insensitive</li>
            <li>• Try "PUBLIC" for the general chat room</li>
            <li>• Share room codes with friends to invite them</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-lg text-gray-300">Loading...</div>
      </div>
    }>
      <JoinRoomContent />
    </Suspense>
  )
}
