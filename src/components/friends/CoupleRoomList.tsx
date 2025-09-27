'use client'

import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle, Calendar, Users2, Search } from 'lucide-react'
import { CoupleRoom, FriendshipWithProfile, RelationshipStatus } from '@/types/friends'
import { getFriendships, getCoupleRooms, getRelationshipStatus } from '@/lib/friends/api'
import Avatar from '@/components/ui/Avatar'
import { debugCoupleRoomsData } from '@/lib/friends/debug-couple-rooms'

interface CoupleRoomListProps {
  currentUserId: string
  onRoomSelect: (room: CoupleRoom, partnerProfile: any, relationshipStatus: RelationshipStatus) => void
}

interface CoupleRoomWithDetails extends CoupleRoom {
  partnerProfile: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
  relationshipStatus: RelationshipStatus
  friendship: FriendshipWithProfile
}

export default function CoupleRoomList({ currentUserId, onRoomSelect }: CoupleRoomListProps) {
  const [rooms, setRooms] = useState<CoupleRoomWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCoupleRooms()
  }, [])

  const loadCoupleRooms = async () => {
    try {
      setIsLoading(true)
      
      // Debug the data to see what's happening
      console.log('🔍 Starting couple rooms debug...')
      await debugCoupleRoomsData()
      
      // Get all accepted friendships
      const friendships = await getFriendships()
      const acceptedFriendships = friendships.filter(f => f.status === 'accepted')
      
      if (acceptedFriendships.length === 0) {
        setRooms([])
        return
      }

      // Get couple rooms for these friendships
      const coupleRooms = await getCoupleRooms()
      
      // Combine room data with partner profiles and relationship status
      const roomsWithDetails = await Promise.all(
        coupleRooms.map(async (room) => {
          const friendship = acceptedFriendships.find(f => f.id === room.friendship_id)
          if (!friendship) return null

          // Get partner profile (the other person in the friendship)
          const partnerProfile = friendship.friend_profile

          // Get relationship status
          const relationshipStatus = await getRelationshipStatus(room.friendship_id)
          
          return {
            ...room,
            partnerProfile: {
              id: partnerProfile.id,
              username: partnerProfile.username,
              full_name: partnerProfile.username, // Using username as display name
              avatar_url: partnerProfile.avatar_url
            },
            relationshipStatus: relationshipStatus || {
              id: '',
              friendship_id: room.friendship_id,
              total_messages: 0,
              streak_days: 0,
              last_interaction: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            friendship
          }
        })
      )

      setRooms(roomsWithDetails.filter(Boolean) as CoupleRoomWithDetails[])
      
    } catch (error) {
      console.error('Error loading couple rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRooms = rooms.filter(room => 
    room.partnerProfile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.partnerProfile.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRelationshipIcon = (relationshipType: string) => {
    switch (relationshipType) {
      case 'couple':
        return '💕'
      case 'bestfriend':
        return '👯'
      default:
        return '👫'
    }
  }

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    
    if (diffHours < 1) {
      return 'Active now'
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <span>Your Chats</span>
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-1">
            <Users2 className="h-4 w-4" />
            <span>{rooms.length} conversations</span>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-pink-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-600 mb-4">
              {rooms.length === 0 
                ? "Add friends to start chatting!"
                : "No conversations match your search."
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onRoomSelect(room, room.partnerProfile, room.relationshipStatus)}
                className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {/* Avatar with relationship indicator */}
                  <div className="relative">
                    <Avatar
                      avatarUrl={room.partnerProfile.avatar_url}
                      username={room.partnerProfile.full_name}
                      size="lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-pink-200">
                      <span className="text-sm">
                        {getRelationshipIcon(room.friendship.relationship_type)}
                      </span>
                    </div>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {room.partnerProfile.full_name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatLastActivity(room.relationshipStatus.last_interaction)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{room.relationshipStatus.total_messages}</span>
                        </span>
                        
                        {room.relationshipStatus.streak_days > 0 && (
                          <span className="flex items-center space-x-1 text-orange-600">
                            <span>🔥</span>
                            <span>{room.relationshipStatus.streak_days}d</span>
                          </span>
                        )}
                        
                        {room.relationshipStatus.anniversary_date && (
                          <span className="flex items-center space-x-1 text-pink-600">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(room.relationshipStatus.anniversary_date).toLocaleDateString()}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Room name or relationship type */}
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {room.room_name || `${room.friendship.relationship_type} chat`}
                    </p>
                  </div>

                  {/* Unread indicator (placeholder for future implementation) */}
                  <div className="flex flex-col items-end space-y-1">
                    {/* <div className="w-2 h-2 bg-pink-500 rounded-full"></div> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}