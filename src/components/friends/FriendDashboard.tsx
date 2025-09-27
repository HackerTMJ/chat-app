'use client'

import React, { useState, useEffect } from 'react'
import { X, Users, UserPlus, Clock, Shield, Search, Check, UserX, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { getFriendships, sendFriendRequestSimple, acceptFriendRequestSimple, rejectFriendRequest } from '@/lib/friends/api'
import { FriendshipWithProfile } from '@/types/friends'
import { createClient } from '@/lib/supabase/client'

interface FriendDashboardProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  onStartChat?: (friendship: FriendshipWithProfile) => void
}

type TabType = 'online' | 'all' | 'pending' | 'blocked' | 'add'

const supabase = createClient()

export default function FriendDashboard({ isOpen, onClose, currentUserId, onStartChat }: FriendDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [addFriendInput, setAddFriendInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadFriendships()
    }
  }, [isOpen])

  const loadFriendships = async () => {
    try {
      setIsLoading(true)
      const data = await getFriendships()
      setFriendships(data)
    } catch (error) {
      console.error('Error loading friendships:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendFriendRequest = async () => {
    if (!addFriendInput.trim()) return

    try {
      setIsLoading(true)
      setMessage('')

      // Find user by username or email
      const { data: targetUser, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.eq.${addFriendInput},email.eq.${addFriendInput}`)
        .single()

      if (error || !targetUser) {
        setMessage('User not found. Try their username or email.')
        return
      }

      if (targetUser.id === currentUserId) {
        setMessage("You can't add yourself as a friend!")
        return
      }

      await sendFriendRequestSimple(targetUser.id)
      setMessage('Friend request sent successfully!')
      setAddFriendInput('')
      await loadFriendships()
      
    } catch (error: any) {
      setMessage(error.message || 'Error sending friend request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptFriendRequestSimple(friendshipId)
      await loadFriendships()
      setMessage('Friend request accepted!')
    } catch (error: any) {
      setMessage(error.message || 'Error accepting request')
    }
  }

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId)
      await loadFriendships()
      setMessage('Friend request rejected')
    } catch (error: any) {
      setMessage(error.message || 'Error rejecting request')
    }
  }

  const filteredFriendships = friendships.filter(friendship => {
    const friend = friendship.friend_profile
    if (!friend) return false

    const matchesSearch = searchQuery === '' || 
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email?.toLowerCase().includes(searchQuery.toLowerCase())

    switch (activeTab) {
      case 'all':
        return matchesSearch && friendship.status === 'accepted'
      case 'online':
        return matchesSearch && friendship.status === 'accepted' // TODO: Add online status
      case 'pending':
        return matchesSearch && friendship.status === 'pending'
      case 'blocked':
        return matchesSearch && friendship.status === 'blocked'
      case 'add':
        return false
      default:
        return matchesSearch
    }
  })

  const pendingCount = friendships.filter(f => f.status === 'pending').length
  const friendsCount = friendships.filter(f => f.status === 'accepted').length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Friends</h2>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex h-[calc(600px-80px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('online')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'online'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Online
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Users className="w-4 h-4" />
                All Friends
                {friendsCount > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">— {friendsCount}</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('pending')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                Pending
                {pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('blocked')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'blocked'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Blocked
              </button>

              <button
                onClick={() => setActiveTab('add')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'add'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Add Friend
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tab Content Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              {activeTab !== 'add' && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'add' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Add Friend
                  </h3>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Enter username or email..."
                        value={addFriendInput}
                        onChange={(e) => setAddFriendInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendFriendRequest()}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <Button
                      onClick={handleSendFriendRequest}
                      disabled={isLoading || !addFriendInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Send Request
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            {message && (
              <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
              </div>
            )}

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredFriendships.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">
                    {activeTab === 'add' ? 'Add friends to start chatting!' : `No ${activeTab} friends`}
                  </p>
                  <p className="text-sm">
                    {activeTab === 'add' 
                      ? 'Search for friends by their username or email address.'
                      : `You don't have any ${activeTab} friends yet.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFriendships.map((friendship) => {
                    const friend = friendship.friend_profile
                    const isPending = friendship.status === 'pending'
                    const isIncoming = isPending && friendship.initiated_by !== currentUserId

                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Avatar 
                          avatarUrl={friend?.avatar_url}
                          email={friend?.email}
                          username={friend?.username}
                          size="md"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {friend?.username || friend?.email}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {friendship.relationship_type === 'couple' ? '💕 Couple' : 
                             friendship.relationship_type === 'bestfriend' ? '👯 Best Friend' : '👫 Friend'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && isIncoming && (
                            <>
                              <Button
                                onClick={() => handleAcceptRequest(friendship.id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                aria-label="Accept friend request"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleRejectRequest(friendship.id)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                aria-label="Reject friend request"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {isPending && !isIncoming && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                              Sent
                            </span>
                          )}

                          {friendship.status === 'accepted' && onStartChat && (
                            <Button
                              onClick={() => onStartChat(friendship)}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              aria-label="Start chat"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}