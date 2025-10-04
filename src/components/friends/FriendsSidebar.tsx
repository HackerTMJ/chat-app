'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, Users, Heart, UserPlus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { getCoupleRooms } from '@/lib/friends/api'
import { FriendshipWithProfile, CoupleRoomWithDetails } from '@/types/friends'
import { useFriendCache } from '@/lib/hooks/useFriendCache'
import { useChatStore } from '@/lib/stores/chat'

interface FriendsSidebarProps {
  currentUserId: string
  onFriendChatSelect: (friendship: FriendshipWithProfile, coupleRoom?: CoupleRoomWithDetails) => void
  showFriendDashboard: boolean
  onShowFriendDashboard: (show: boolean) => void
  selectedFriendshipId?: string | null
}

export default function FriendsSidebar({ currentUserId, onFriendChatSelect, showFriendDashboard, onShowFriendDashboard, selectedFriendshipId }: FriendsSidebarProps) {
  const { friendships, pendingRequests, loading: isLoading } = useFriendCache(currentUserId)
  const [coupleRooms, setCoupleRooms] = useState<CoupleRoomWithDetails[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const { typingUsers } = useChatStore()

  useEffect(() => {
    loadCoupleRooms()
  }, [])

  const loadCoupleRooms = async () => {
    try {
      const roomsData = await getCoupleRooms()
      setCoupleRooms(roomsData)
    } catch (error) {
      console.error('Error loading couple rooms:', error)
    }
  }

  const handleFriendChatClick = (friendship: FriendshipWithProfile) => {
    // Find the corresponding couple room for this friendship
    const coupleRoom = coupleRooms.find(room => room.friendship_id === friendship.id)
    onFriendChatSelect(friendship, coupleRoom)
  }

  const handleStartChat = (friendship: FriendshipWithProfile) => {
    handleFriendChatClick(friendship)
    onShowFriendDashboard(false)
  }

  const pendingCount = pendingRequests.length

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2 p-2 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Heart className="w-4 h-4" />
            Friends
            {pendingCount > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-lg animate-pulse-soft">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onShowFriendDashboard(true)}
            className="p-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 transition-all duration-300 hover:scale-110"
            title="Manage Friends"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-1.5 animate-fadeIn">
            {isLoading ? (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              </div>
            ) : friendships.length === 0 ? (
              <div className="text-center py-4 px-3 rounded-xl bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200/50 dark:border-pink-700/50">
                <Users className="w-8 h-8 mx-auto mb-2 text-pink-400 dark:text-pink-500" />
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">No friends yet</p>
                <button
                  onClick={() => onShowFriendDashboard(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg font-semibold text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Add Friends
                </button>
              </div>
            ) : (
              friendships.map((friendship) => {
                const friend = friendship.friend_profile
                const coupleRoom = coupleRooms.find(room => room.friendship_id === friendship.id)
                const relationshipIcon = friendship.relationship_type === 'couple' ? '💕' : 
                                      friendship.relationship_type === 'bestfriend' ? '👯' : '👫'
                
                // Check if friend is typing (match by friend's user ID)
                const friendUserId = friendship.user1_id === currentUserId ? friendship.user2_id : friendship.user1_id
                const isTyping = typingUsers.some(user => user.userId === friendUserId)

                return (
                  <button
                    key={friendship.id}
                    onClick={() => handleFriendChatClick(friendship)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-all duration-300 ${
                      selectedFriendshipId === friendship.id
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 dark:from-pink-600/30 dark:to-purple-600/30 border-2 border-pink-500/60 dark:border-pink-400/60 shadow-lg shadow-pink-500/30 scale-[1.02]'
                        : 'bg-white/80 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg hover:border-pink-300/50 dark:hover:border-pink-600/50'
                    } transform hover:scale-[1.01] cursor-pointer backdrop-blur-sm text-left`}
                  >
                    <div className="w-7 h-7 flex-shrink-0">
                      <Avatar
                        avatarUrl={friend?.avatar_url}
                        email={friend?.email}
                        username={friend?.username}
                        size="xs"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{relationshipIcon}</span>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
                          {friend?.username || friend?.email}
                        </p>
                      </div>
                      {isTyping ? (
                        <div className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                          <span className="flex gap-0.5">
                            <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
                            <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
                            <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
                          </span>
                          <span className="font-medium">typing...</span>
                        </div>
                      ) : coupleRoom?.last_activity ? (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                          {coupleRoom.room_name || 'Chat'}
                        </p>
                      ) : null}
                    </div>
                    <MessageCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-pink-500 dark:group-hover:text-pink-400 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

    </>
  )
}