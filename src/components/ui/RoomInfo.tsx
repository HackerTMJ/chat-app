'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Hash, Calendar, Crown, Shield, User, ChevronDown, ChevronUp, UserMinus, UserPlus, UserCheck } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'
import { Avatar } from './Avatar'
import { useRoomInfoCache } from '@/lib/hooks/useCacheSystem'
import type { RoomMember, RoomInfo } from '@/lib/cache/CacheSystemManager'

interface RoomInfoProps {
  room: {
    id: string
    code: string
    name: string
    created_by: string
    created_at: string
  }
  currentUserId: string
}

const ROLE_ICONS = {
  owner: Crown,
  moderator: Shield,
  member: User
}

const ROLE_COLORS = {
  owner: 'text-yellow-500',
  moderator: 'text-blue-500',
  member: 'text-gray-500'
}

export function RoomInfo({ room, currentUserId }: RoomInfoProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('member')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMessage, setError] = useState<string | null>(null)
  
  // Use the caching hook
  const { roomInfo, members, loading: isLoading, error, updateMemberStatus, refreshRoomInfo } = useRoomInfoCache(room.id)
  
  const memberCount = members.length

  // Set current user's role when members change
  useEffect(() => {
    const currentMember = members.find(member => member.id === currentUserId)
    setCurrentUserRole(currentMember?.role || 'member')
  }, [members, currentUserId])

  useEffect(() => {
    if (!room?.id) return

    // Set up real-time subscription for member changes
    const supabase = createClient()
    
    // Debounce refresh to avoid multiple rapid reloads
    let refreshTimeout: NodeJS.Timeout | null = null
    
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        console.log('🔄 Debounced refresh triggered')
        refreshRoomInfo()
      }, 500) // Wait 500ms before refreshing
    }
    
    const channel = supabase
      .channel(`room_memberships:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_memberships',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('👥 Room membership change detected')
          // Use debounced refresh to avoid rapid consecutive updates
          debouncedRefresh()
        }
      )
      .subscribe()

    // Also listen to profile changes (status updates) - but only update status, don't reload
    const profileChannel = supabase
      .channel(`profiles:status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          // Only update status - no need to refresh entire room info
          const isMemberInRoom = members.some(m => m.id === payload.new.id)
          if (isMemberInRoom) {
            console.log(`📊 Status update for member: ${payload.new.id}`)
            updateMemberStatus(payload.new.id, payload.new.status)
          }
        }
      )
      .subscribe()

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      supabase.removeChannel(channel)
      supabase.removeChannel(profileChannel)
    }
  }, [room?.id, members, refreshRoomInfo, updateMemberStatus])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User
    return Icon
  }

  const getRoleColor = (role: string) => {
    return ROLE_COLORS[role as keyof typeof ROLE_COLORS] || 'text-gray-500'
  }

  // User management functions
  const kickUser = async (userId: string) => {
    if (!canKickUsers() || userId === currentUserId) return

    try {
      setActionLoading(`kick-${userId}`)
      const supabase = createClient()
      
      const { error } = await supabase.rpc('kick_user_from_room', {
        target_user_id: userId,
        target_room_id: room.id,
        kicker_user_id: currentUserId
      })

      if (error) throw error
      
      // Refresh member list
      refreshRoomInfo()
    } catch (error: any) {
      console.error('Error kicking user:', error)
      setError(`Failed to kick user: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const promoteToModerator = async (userId: string) => {
    if (!canPromoteUsers() || userId === currentUserId) return

    try {
      setActionLoading(`promote-${userId}`)
      const supabase = createClient()
      
      const { error } = await supabase.rpc('promote_user_to_moderator', {
        target_user_id: userId,
        target_room_id: room.id,
        promoter_user_id: currentUserId
      })

      if (error) throw error
      
      // Refresh member list
      refreshRoomInfo()
    } catch (error: any) {
      console.error('Error promoting user:', error)
      setError(`Failed to promote user: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const demoteFromModerator = async (userId: string) => {
    if (!canPromoteUsers() || userId === currentUserId) return

    try {
      setActionLoading(`demote-${userId}`)
      const supabase = createClient()
      
      const { error } = await supabase.rpc('demote_moderator_to_member', {
        target_user_id: userId,
        target_room_id: room.id,
        demoter_user_id: currentUserId
      })

      if (error) throw error
      
      // Refresh member list
      refreshRoomInfo()
    } catch (error: any) {
      console.error('Error demoting user:', error)
      setError(`Failed to demote user: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Permission checks
  const canKickUsers = () => {
    return ['owner', 'moderator'].includes(currentUserRole) && room.code !== 'PUBLIC'
  }

  const canPromoteUsers = () => {
    return currentUserRole === 'owner' && room.code !== 'PUBLIC'
  }

  const canKickSpecificUser = (targetUser: RoomMember) => {
    if (!canKickUsers() || targetUser.id === currentUserId) return false
    if (targetUser.role === 'owner') return false
    if (currentUserRole === 'moderator' && targetUser.role === 'moderator') return false
    return true
  }

  const sortedMembers = [...members].sort((a, b) => {
    // Sort by role priority: owner > moderator > member
    const rolePriority = { owner: 3, moderator: 2, member: 1 }
    const aPriority = rolePriority[a.role as keyof typeof rolePriority] || 1
    const bPriority = rolePriority[b.role as keyof typeof rolePriority] || 1
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    // Then by status (online users first)
    if (a.status === 'online' && b.status !== 'online') return -1
    if (a.status !== 'online' && b.status === 'online') return 1
    
    // Finally by username
    return a.username.localeCompare(b.username)
  })

  if (isLoading) {
    return (
      <div className="card border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-primary">Room Information</h3>
        </div>
        <div className="text-center text-muted py-4">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            Loading room info...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-primary">Room Information</h3>
        </div>
        <div className="text-center text-red-400 py-4">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="card border rounded-xl p-6">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-4 hover:bg-primary/5 p-2 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-primary">Room Information</h3>
          <span className="text-sm text-muted">({memberCount})</span>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-muted" />
        ) : (
          <ChevronDown size={20} className="text-muted" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Room Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <Hash size={16} className="text-muted" />
              <div>
                <div className="font-semibold text-primary">{room.name}</div>
                <div className="text-sm text-muted">Code: {room.code}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-muted" />
              <div>
                <div className="text-sm text-muted">Created on</div>
                <div className="text-sm font-medium text-primary">{formatDate(room.created_at)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users size={16} className="text-muted" />
              <div>
                <div className="text-sm text-muted">Members</div>
                <div className="text-sm font-medium text-primary">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </div>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div>
            <h4 className="text-sm font-semibold text-primary mb-3">Members</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {sortedMembers.map((member) => {
                const RoleIcon = getRoleIcon(member.role)
                const isCurrentUser = member.id === currentUserId
                const canKick = canKickSpecificUser(member)
                const canPromote = canPromoteUsers() && member.role === 'member' && !isCurrentUser
                const canDemote = canPromoteUsers() && member.role === 'moderator' && !isCurrentUser
                
                return (
                  <div 
                    key={member.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${
                      isCurrentUser ? 'bg-blue-500/20 border border-blue-500/50' : 'hover:bg-primary/5'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar
                        avatarUrl={member.avatar_url}
                        username={member.username}
                        userId={member.id}
                        size="sm"
                      />
                      {/* Status indicator */}
                      <div className="absolute -bottom-1 -right-1">
                        <StatusIndicator status={member.status as any} size="sm" />
                      </div>
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isCurrentUser ? 'text-blue-400' : 'text-primary'}`}>
                          {member.username}
                          {isCurrentUser && ' (You)'}
                        </span>
                      </div>
                      <div className="text-xs text-muted">
                        Joined {formatDate(member.joined_at)}
                      </div>
                    </div>

                    {/* Role icon */}
                    <div className={`flex-shrink-0 ${getRoleColor(member.role)}`} title={member.role}>
                      <RoleIcon size={16} />
                    </div>

                    {/* Action buttons - only visible on hover for non-current users */}
                    {!isCurrentUser && (canKick || canPromote || canDemote) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {canPromote && (
                          <button
                            onClick={() => promoteToModerator(member.id)}
                            disabled={actionLoading === `promote-${member.id}`}
                            className="p-1 btn-secondary rounded hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50"
                            title="Promote to moderator"
                          >
                            <UserPlus size={12} />
                          </button>
                        )}
                        {canDemote && (
                          <button
                            onClick={() => demoteFromModerator(member.id)}
                            disabled={actionLoading === `demote-${member.id}`}
                            className="p-1 btn-secondary rounded hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50"
                            title="Demote to member"
                          >
                            <UserCheck size={12} />
                          </button>
                        )}
                        {canKick && (
                          <button
                            onClick={() => kickUser(member.id)}
                            disabled={actionLoading === `kick-${member.id}`}
                            className="p-1 btn-secondary rounded hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                            title="Kick from room"
                          >
                            <UserMinus size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}