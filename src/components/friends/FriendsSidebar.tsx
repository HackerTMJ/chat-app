'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, Users, Heart, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { getFriendships, getCoupleRooms } from '@/lib/friends/api'
import { FriendshipWithProfile, CoupleRoomWithDetails } from '@/types/friends'
import FriendDashboard from './FriendDashboard'

interface FriendsSidebarProps {
  currentUserId: string
  onFriendChatSelect: (friendship: FriendshipWithProfile, coupleRoom?: CoupleRoomWithDetails) => void
}

export default function FriendsSidebar({ currentUserId, onFriendChatSelect }: FriendsSidebarProps) {
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [coupleRooms, setCoupleRooms] = useState<CoupleRoomWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFriendDashboard, setShowFriendDashboard] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    loadFriendsData()
  }, [])

  const loadFriendsData = async () => {
    try {
      setIsLoading(true)
      const [friendshipsData, roomsData] = await Promise.all([
        getFriendships(),
        getCoupleRooms()
      ])
      
      // Only show accepted friendships
      const acceptedFriendships = friendshipsData.filter(f => f.status === 'accepted')
      setFriendships(acceptedFriendships)
      setCoupleRooms(roomsData)
    } catch (error) {
      console.error('Error loading friends data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFriendChatClick = (friendship: FriendshipWithProfile) => {
    // Find the corresponding couple room for this friendship
    const coupleRoom = coupleRooms.find(room => room.friendship_id === friendship.id)
    onFriendChatSelect(friendship, coupleRoom)
  }

  const handleStartChat = (friendship: FriendshipWithProfile) => {
    handleFriendChatClick(friendship)
    setShowFriendDashboard(false)
  }

  const pendingCount = friendships.filter(f => f.status === 'pending').length

  return (
    <>
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide hover:text-foreground transition-colors"
          >
            <Heart className="w-4 h-4" />
            Friends
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFriendDashboard(true)}
            className="text-xs flex items-center gap-1 rounded-lg"
            title="Manage Friends"
          >
            <UserPlus className="w-3 h-3" />
            Manage
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : friendships.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted/50" />
                <p className="text-xs text-muted mb-2">No friends yet</p>
                <Button
                  size="sm"
                  onClick={() => setShowFriendDashboard(true)}
                  className="text-xs"
                >
                  Add Friends
                </Button>
              </div>
            ) : (
              friendships.map((friendship) => {
                const friend = friendship.friend_profile
                const coupleRoom = coupleRooms.find(room => room.friendship_id === friendship.id)
                const relationshipIcon = friendship.relationship_type === 'couple' ? '💕' : 
                                      friendship.relationship_type === 'bestfriend' ? '👯' : '👫'

                return (
                  <button
                    key={friendship.id}
                    onClick={() => handleFriendChatClick(friendship)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group text-left"
                  >
                    <Avatar
                      avatarUrl={friend?.avatar_url}
                      email={friend?.email}
                      username={friend?.username}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs opacity-60">{relationshipIcon}</span>
                        <p className="text-sm font-medium truncate">
                          {friend?.username || friend?.email}
                        </p>
                      </div>
                      {coupleRoom?.last_activity && (
                        <p className="text-xs text-muted truncate">
                          {coupleRoom.room_name || 'Chat'}
                        </p>
                      )}
                    </div>
                    <MessageCircle className="w-4 h-4 text-muted group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Friend Dashboard Modal */}
      <FriendDashboard
        isOpen={showFriendDashboard}
        onClose={() => setShowFriendDashboard(false)}
        currentUserId={currentUserId}
        onStartChat={handleStartChat}
      />
    </>
  )
}