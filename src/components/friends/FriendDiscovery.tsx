'use client'

import { useState, useEffect } from 'react'
import { Search, Heart, Users, Star, UserPlus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { 
  searchUsers, 
  sendFriendRequest, 
  getPendingFriendRequests,
  getFriendships,
  acceptFriendRequest 
} from '@/lib/friends/api'
import type { 
  FriendshipWithProfile, 
  SendFriendRequestData,
  RELATIONSHIP_TYPES 
} from '@/types/friends'

interface SearchResult {
  id: string
  username: string
  email: string
  avatar_url?: string
}

interface FriendDiscoveryProps {
  currentUserId?: string
}

export function FriendDiscovery({ currentUserId }: FriendDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendshipWithProfile[]>([])
  const [existingFriends, setExistingFriends] = useState<FriendshipWithProfile[]>([])
  const [selectedRelationType, setSelectedRelationType] = useState<'friend' | 'couple' | 'bestfriend'>('friend')
  const [isLoading, setIsLoading] = useState(false)
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    loadPendingRequests()
    loadExistingFriends()
  }, [])

  const loadPendingRequests = async () => {
    const requests = await getPendingFriendRequests()
    setPendingRequests(requests)
  }

  const loadExistingFriends = async () => {
    const friends = await getFriendships()
    setExistingFriends(friends)
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      const users = await searchUsers(query)
      
      // Filter out existing friends and pending requests
      const friendIds = new Set([
        ...existingFriends.map(f => f.friend_profile.id),
        ...pendingRequests.map(r => r.friend_profile.id)
      ])
      
      const filtered = users.filter(user => !friendIds.has(user.id))
      setSearchResults(filtered)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendRequest = async (recipientId: string) => {
    setSendingTo(recipientId)
    
    const requestData: SendFriendRequestData = {
      recipient_id: recipientId,
      relationship_type: selectedRelationType
    }

    const result = await sendFriendRequest(requestData)
    
    if (result.success) {
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== recipientId))
      // Reload pending requests to show the new one
      loadPendingRequests()
    } else {
      alert(result.error)
    }
    
    setSendingTo(null)
  }

  const handleAcceptRequest = async (friendshipId: string, accept: boolean) => {
    console.log('👍 Attempting to accept request:', friendshipId, 'accept:', accept)
    
    try {
      const result = await acceptFriendRequest({ friendship_id: friendshipId, accept })
      
      console.log('✅ Accept request result:', result)
      
      if (result.success) {
        // Reload both lists
        loadPendingRequests()
        loadExistingFriends()
      } else {
        console.error('❌ Failed to accept request:', result.error)
        alert(`Failed to ${accept ? 'accept' : 'decline'} request: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ Exception accepting request:', error)
      alert('An error occurred while processing the request')
    }
  }

  const relationshipTypes = [
    { id: 'friend', label: 'Friend', emoji: '👫', color: 'bg-blue-100 text-blue-700' },
    { id: 'couple', label: 'Couple', emoji: '💕', color: 'bg-pink-100 text-pink-700' },
    { id: 'bestfriend', label: 'Best Friend', emoji: '👯', color: 'bg-purple-100 text-purple-700' }
  ] as const

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Find Your Perfect Chat Partner
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create intimate 2-person connections with friends, couples, or best friends
        </p>
      </div>

      {/* Relationship Type Selector */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          What kind of connection are you looking for?
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {relationshipTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedRelationType(type.id)}
              className={`
                p-4 rounded-xl border-2 transition-all text-center
                ${selectedRelationType === type.id 
                  ? `border-blue-500 ${type.color}` 
                  : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'
                }
              `}
            >
              <div className="text-2xl mb-2">{type.emoji}</div>
              <div className="font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">
              Search Results {isLoading && '(Loading...)'}
            </h4>
            
            {searchResults.length === 0 && searchQuery.length >= 2 && !isLoading && (
              <p className="text-gray-500 text-center py-8">
                No users found matching "{searchQuery}"
              </p>
            )}

            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar
                    avatarUrl={user.avatar_url}
                    email={user.email}
                    username={user.username}
                    size="md"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleSendRequest(user.id)}
                  disabled={sendingTo === user.id}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sendingTo === user.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-2" />
                      Add {relationshipTypes.find(t => t.id === selectedRelationType)?.label}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Pending Requests ({pendingRequests.length})
          </h3>
          
          {pendingRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <Avatar
                  avatarUrl={request.friend_profile.avatar_url}
                  email={request.friend_profile.email}
                  username={request.friend_profile.username}
                  size="md"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {request.friend_profile.username}
                  </div>
                  <div className="text-sm text-gray-600">
                    Wants to be your {request.relationship_type}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAcceptRequest(request.id, true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check size={16} className="mr-1" />
                  Accept
                </Button>
                <Button
                  onClick={() => handleAcceptRequest(request.id, false)}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X size={16} className="mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Friends Preview */}
      {existingFriends.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Your Connections ({existingFriends.length})
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {existingFriends.slice(0, 4).map((friendship) => (
              <div key={friendship.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Avatar
                    avatarUrl={friendship.friend_profile.avatar_url}
                    email={friendship.friend_profile.email}
                    username={friendship.friend_profile.username}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {friendship.friend_profile.username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {relationshipTypes.find(t => t.id === friendship.relationship_type)?.emoji} {friendship.relationship_type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {existingFriends.length > 4 && (
            <p className="text-center text-sm text-gray-500">
              +{existingFriends.length - 4} more connections
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default FriendDiscovery