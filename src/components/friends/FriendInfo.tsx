'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Calendar, Gift, Shield, UserMinus, Ban, Trash2 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import type { FriendshipWithProfile, RelationshipStatus } from '@/types/friends'
import { blockFriend, removeFriend } from '@/lib/friends/api'
import { Button } from '@/components/ui/Button'

interface FriendInfoProps {
  friendship: FriendshipWithProfile
  relationshipStatus?: RelationshipStatus
  currentUserId: string
  onClose?: () => void
  onRemove?: () => void
}

export default function FriendInfo({ 
  friendship, 
  relationshipStatus,
  currentUserId,
  onClose,
  onRemove
}: FriendInfoProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [showConfirmBlock, setShowConfirmBlock] = useState(false)

  const friend = friendship.friend_profile

  const handleBlockFriend = async () => {
    try {
      setIsLoading(true)
      await blockFriend(friendship.id)
      setShowConfirmBlock(false)
      onRemove?.()
    } catch (error) {
      console.error('Error blocking friend:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    try {
      setIsLoading(true)
      await removeFriend(friendship.id)
      setShowConfirmRemove(false)
      onRemove?.()
    } catch (error) {
      console.error('Error removing friend:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRelationshipIcon = () => {
    switch (friendship.relationship_type) {
      case 'couple':
        return <Heart className="w-5 h-5 text-pink-500" />
      case 'bestfriend':
        return <Heart className="w-5 h-5 text-yellow-500" />
      default:
        return <MessageCircle className="w-5 h-5 text-blue-500" />
    }
  }

  const getRelationshipLabel = () => {
    switch (friendship.relationship_type) {
      case 'couple':
        return 'Couple'
      case 'bestfriend':
        return 'Best Friend'
      default:
        return 'Friend'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-700/50">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Friend Info
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile Section */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Avatar 
              avatarUrl={friend.avatar_url}
              username={friend.username}
              size="xl"
            />
            <div className="absolute -bottom-1 -right-1">
              <StatusIndicator status={friend.status || 'offline'} size="lg" showLabel={false} />
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {friend.username}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {friend.email}
            </p>
          </div>

          {/* Relationship Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30 rounded-full border border-blue-400/40 dark:border-blue-500/50 backdrop-blur-sm">
            {getRelationshipIcon()}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {getRelationshipLabel()}
            </span>
          </div>
        </div>

        {/* Stats Section */}
        {relationshipStatus && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Messages</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {relationshipStatus.total_messages || 0}
              </p>
            </div>

            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {relationshipStatus.streak_days || 0} 🔥
              </p>
            </div>
          </div>
        )}

        {/* Anniversary Section (for couples) */}
        {friendship.relationship_type === 'couple' && relationshipStatus?.anniversary_date && (
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-pink-200/50 dark:border-pink-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Anniversary</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {new Date(relationshipStatus.anniversary_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}

        {/* Shared Status */}
        {relationshipStatus?.shared_status && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Shared Status</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {relationshipStatus.shared_status}
            </p>
          </div>
        )}

        {/* Friendship Info */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Friendship Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Friends Since</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(friendship.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status</span>
              <span className="text-gray-900 dark:text-white font-medium capitalize">
                {friendship.status}
              </span>
            </div>
            {friend.status && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Online Status</span>
                <span className="text-gray-900 dark:text-white font-medium capitalize">
                  {friend.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Manage Friendship</h4>
          
          {/* Remove Friend */}
          {!showConfirmRemove ? (
            <Button
              variant="outline"
              className="w-full justify-start text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              onClick={() => setShowConfirmRemove(true)}
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Remove Friend
            </Button>
          ) : (
            <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Remove {friend.username} from your friends?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleRemoveFriend}
                  disabled={isLoading}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {isLoading ? 'Removing...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmRemove(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Block Friend */}
          {!showConfirmBlock ? (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
              onClick={() => setShowConfirmBlock(true)}
            >
              <Ban className="w-4 h-4 mr-2" />
              Block Friend
            </Button>
          ) : (
            <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                Block {friend.username}? They won't be able to message you.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleBlockFriend}
                  disabled={isLoading}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  {isLoading ? 'Blocking...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmBlock(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
