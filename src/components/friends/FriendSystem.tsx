'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Users, Heart } from 'lucide-react'
import { CoupleRoom, RelationshipStatus } from '@/types/friends'
import CoupleRoomList from './CoupleRoomList'
import CoupleChat from './CoupleChat'
import FriendDiscovery from './FriendDiscovery'
import { createClient } from '@/lib/supabase/client'
import { testFriendSystemSetup, debugFriendshipState } from '@/lib/friends/testUtils'

interface FriendSystemProps {
  className?: string
}

type ViewState = 'rooms' | 'chat' | 'discovery'

interface ChatState {
  room: CoupleRoom
  partnerProfile: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
  relationshipStatus: RelationshipStatus
}

export default function FriendSystem({ className = '' }: FriendSystemProps) {
  const [currentView, setCurrentView] = useState<ViewState>('rooms')
  const [chatState, setChatState] = useState<ChatState | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
    
    // Run setup test in development
    if (process.env.NODE_ENV === 'development') {
      testFriendSystemSetup()
      
      // Add debug function to window for easy access
      if (typeof window !== 'undefined') {
        (window as any).debugFriends = debugFriendshipState
      }
    }
  }, [])

  const getCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error('Error getting current user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoomSelect = (
    room: CoupleRoom, 
    partnerProfile: any, 
    relationshipStatus: RelationshipStatus
  ) => {
    setChatState({
      room,
      partnerProfile,
      relationshipStatus
    })
    setCurrentView('chat')
  }

  const handleBackToRooms = () => {
    setCurrentView('rooms')
    setChatState(null)
  }

  const handleOpenDiscovery = () => {
    setCurrentView('discovery')
  }

  const handleBackFromDiscovery = () => {
    setCurrentView('rooms')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (!currentUserId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Users className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Authentication Required</h3>
        <p className="text-gray-500">Please sign in to access the friend system.</p>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col overflow-hidden ${className}`}>
      {/* Navigation Header */}
      {(currentView === 'chat' || currentView === 'discovery') && (
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button
            onClick={currentView === 'chat' ? handleBackToRooms : handleBackFromDiscovery}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">
              {currentView === 'chat' ? 'Back to Chats' : 'Back to Friends'}
            </span>
          </button>

          {currentView === 'chat' && chatState && (
            <div className="text-center">
              <h1 className="font-semibold text-gray-900">
                {chatState.partnerProfile.full_name}
              </h1>
              <p className="text-sm text-gray-500 capitalize">
                {chatState.room.room_theme} chat
              </p>
            </div>
          )}

          {currentView === 'discovery' && (
            <div className="text-center">
              <h1 className="font-semibold text-gray-900">Find Friends</h1>
              <p className="text-sm text-gray-500">Connect with others</p>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'rooms' && (
          <>
            {/* Add Friend Button */}
            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-b">
              <button
                onClick={handleOpenDiscovery}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-4 rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">Find Friends</span>
              </button>
            </div>

            <CoupleRoomList 
              currentUserId={currentUserId}
              onRoomSelect={handleRoomSelect}
            />
          </>
        )}

        {currentView === 'chat' && chatState && (
          <CoupleChat
            room={chatState.room}
            currentUserId={currentUserId}
            partnerProfile={chatState.partnerProfile}
            relationshipStatus={chatState.relationshipStatus}
          />
        )}

        {currentView === 'discovery' && (
          <div className="h-full overflow-hidden">
            <FriendDiscovery currentUserId={currentUserId} />
          </div>
        )}
      </div>

      {/* Status Bar (when in rooms view) */}
      {currentView === 'rooms' && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Heart className="h-4 w-4 text-pink-400" />
              <span>Friend System</span>
            </div>
            <span>•</span>
            <span>2-person intimate chats</span>
          </div>
        </div>
      )}
    </div>
  )
}