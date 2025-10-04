/**
 * Room Settings Component - OPTIMIZED
 * Manage room avatar, description, members, and settings
 * Features: Caching, debouncing, optimistic updates, real-time sync
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Upload, Image as ImageIcon, Users, Shield, Ban, Trash2, Save, Archive, ArchiveRestore, Crown, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import {
  uploadRoomAvatar,
  updateRoomAvatar,
  updateRoomInfo,
  updateMemberRole,
  kickUserFromRoom,
  banUserFromRoom,
  unbanUserFromRoom,
  archiveRoom,
  unarchiveRoom,
} from '@/lib/rooms/api'
import { roomCache, debounce } from '@/lib/rooms/cache'
import type { Room, RoomMember, RoomBannedUser } from '@/types/rooms'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'

interface RoomSettingsProps {
  room: Room
  currentUserId: string
  userRole: 'owner' | 'admin' | 'moderator' | 'member'
  onClose: () => void
  onUpdate: () => void
}

export default function RoomSettings({ room, currentUserId, userRole, onClose, onUpdate }: RoomSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'banned'>('general')
  const [roomName, setRoomName] = useState(room.name)
  const [roomDescription, setRoomDescription] = useState(room.description || '')
  const [avatarUrl, setAvatarUrl] = useState(room.avatar_url || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [bannedUsers, setBannedUsers] = useState<RoomBannedUser[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showConfirmation, ConfirmationComponent } = useConfirmation()

  const canManageRoom = useMemo(() => ['owner', 'admin'].includes(userRole), [userRole])
  const canModerate = useMemo(() => ['owner', 'admin', 'moderator'].includes(userRole), [userRole])

  // Track changes
  useEffect(() => {
    const changed = roomName !== room.name || roomDescription !== (room.description || '')
    setHasUnsavedChanges(changed)
  }, [roomName, roomDescription, room.name, room.description])

  // Load data when tab changes (with caching)
  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers()
    } else if (activeTab === 'banned') {
      loadBannedUsers()
    }
  }, [activeTab])

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      // Don't clear cache on unmount - keep it for next open
    }
  }, [])

  // Optimized load members with cache
  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true)
    try {
      const data = await roomCache.getMembers(room.id)
      setMembers(data)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }, [room.id])

  // Optimized load banned users with cache
  const loadBannedUsers = useCallback(async () => {
    setIsLoadingMembers(true)
    try {
      const data = await roomCache.getBanned(room.id)
      setBannedUsers(data)
    } catch (error) {
      console.error('Error loading banned users:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }, [room.id])

  // Debounced auto-save for text fields
  const debouncedAutoSave = useCallback(
    debounce(async (name: string, description: string) => {
      if (!canManageRoom) return
      
      setAutoSaving(true)
      try {
        await updateRoomInfo(room.id, { name, description })
        setHasUnsavedChanges(false)
        // Don't call onUpdate() for auto-save to avoid re-renders
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setAutoSaving(false)
      }
    }, 2000), // Auto-save after 2 seconds of inactivity
    [room.id, canManageRoom]
  )

  // Handle input changes with auto-save
  const handleNameChange = (value: string) => {
    setRoomName(value)
    debouncedAutoSave(value, roomDescription)
  }

  const handleDescriptionChange = (value: string) => {
    setRoomDescription(value)
    debouncedAutoSave(roomName, value)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB')
      return
    }

    setIsUploading(true)
    
    // Optimistic preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const publicUrl = await uploadRoomAvatar(room.id, file)
      await updateRoomAvatar(room.id, publicUrl)
      setAvatarUrl(publicUrl)
      
      // Invalidate room cache to show new avatar everywhere
      roomCache.invalidate('room', room.id)
      onUpdate()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar')
      // Revert preview on error
      setAvatarUrl(room.avatar_url || '')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveGeneral = async () => {
    if (!hasUnsavedChanges) return
    
    setIsSaving(true)
    try {
      await updateRoomInfo(room.id, {
        name: roomName,
        description: roomDescription,
      })
      setHasUnsavedChanges(false)
      onUpdate()
      alert('Room settings saved!')
    } catch (error) {
      console.error('Error saving room settings:', error)
      alert('Failed to save room settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'moderator' | 'member') => {
    const confirmed = await showConfirmation({
      title: `Change user role to ${newRole}?`,
      message: `This will ${newRole === 'admin' ? 'grant admin privileges' : newRole === 'moderator' ? 'grant moderator privileges' : 'remove special privileges'}.`,
      type: 'warning'
    })
    if (!confirmed) return

    // Optimistic update
    roomCache.updateMemberOptimistic(room.id, userId, { role: newRole })
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m))

    try {
      await updateMemberRole({ room_id: room.id, user_id: userId, new_role: newRole })
      onUpdate()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role')
      // Revert on error
      await loadMembers()
    }
  }

  const handleKickUser = async (userId: string, username: string) => {
    const confirmed = await showConfirmation({
      title: `Kick ${username}?`,
      message: 'This user will be removed from the room but can rejoin if they have the room code.',
      type: 'warning'
    })
    if (!confirmed) return

    // Optimistic update
    roomCache.removeMemberOptimistic(room.id, userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))

    try {
      await kickUserFromRoom(room.id, userId)
      onUpdate()
    } catch (error) {
      console.error('Error kicking user:', error)
      alert('Failed to kick user')
      // Revert on error
      await loadMembers()
    }
  }

  const handleBanUser = async (userId: string, username: string) => {
    const reason = prompt(`Ban ${username}? Enter reason (optional):`)
    if (reason === null) return

    // Optimistic updates
    roomCache.removeMemberOptimistic(room.id, userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))

    try {
      await banUserFromRoom({
        room_id: room.id,
        user_id: userId,
        banned_by: currentUserId,
        reason: reason || undefined,
      })
      // Invalidate banned cache to force refresh
      roomCache.invalidate('banned', room.id)
      onUpdate()
    } catch (error) {
      console.error('Error banning user:', error)
      alert('Failed to ban user')
      // Revert on error
      await loadMembers()
    }
  }

  const handleUnbanUser = async (userId: string, username: string) => {
    const confirmed = await showConfirmation({
      title: `Unban ${username}?`,
      message: 'This user will be able to join the room again.',
      type: 'info'
    })
    if (!confirmed) return

    // Optimistic update
    roomCache.removeBannedOptimistic(room.id, userId)
    setBannedUsers(prev => prev.filter(b => b.user_id !== userId))

    try {
      await unbanUserFromRoom(room.id, userId)
      onUpdate()
    } catch (error) {
      console.error('Error unbanning user:', error)
      alert('Failed to unban user')
      // Revert on error
      await loadBannedUsers()
    }
  }

  const handleArchive = async () => {
    const confirmed = await showConfirmation({
      title: room.is_archived ? 'Unarchive this room?' : 'Archive this room?',
      message: room.is_archived 
        ? 'This room will be moved back to your active rooms list.'
        : 'This room will be hidden from your active rooms list but all messages will be preserved.',
      type: room.is_archived ? 'info' : 'warning'
    })
    if (!confirmed) return

    try {
      if (room.is_archived) {
        await unarchiveRoom(room.id)
      } else {
        await archiveRoom(room.id)
      }
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error archiving/unarchiving room:', error)
      alert('Failed to archive/unarchive room')
    }
  }

  return (
    <>
      <ConfirmationComponent />
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                Room Settings
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'general'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                General
              </button>
              {canModerate && (
                <>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      activeTab === 'members'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Members
                  </button>
                  <button
                    onClick={() => setActiveTab('banned')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      activeTab === 'banned'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    Banned
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Room Avatar */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Room Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Room avatar"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-white" />
                      </div>
                    )}
                    {canManageRoom && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          aria-label="Upload room avatar"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {isUploading ? 'Uploading...' : 'Upload Avatar'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">Max 2MB, JPG/PNG</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Room Name
                    {autoSaving && <span className="text-xs text-blue-500 ml-2">(Auto-saving...)</span>}
                    {hasUnsavedChanges && !autoSaving && <span className="text-xs text-orange-500 ml-2">(Unsaved changes)</span>}
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={!canManageRoom}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Enter room name"
                  />
                </div>

                {/* Room Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Room Description
                    {autoSaving && <span className="text-xs text-blue-500 ml-2">(Auto-saving...)</span>}
                  </label>
                  <textarea
                    value={roomDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    disabled={!canManageRoom}
                    rows={4}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                    placeholder="Describe what this room is about..."
                  />
                </div>

                {/* Room Code */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Room Code
                  </label>
                  <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 font-mono text-sm text-gray-700 dark:text-gray-300">
                    {room.code}
                  </div>
                </div>

                {/* Save Button */}
                {canManageRoom && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveGeneral}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'All Changes Saved'}
                    </Button>
                    {room.code !== 'PUBLIC' && (
                      <Button
                        onClick={handleArchive}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {room.is_archived ? (
                          <>
                            <ArchiveRestore className="w-4 h-4" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4" />
                            Archive
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-3">
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No members found</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        currentUserId={currentUserId}
                        userRole={userRole}
                        canManageRoom={canManageRoom}
                        onUpdateRole={handleUpdateRole}
                        onKick={handleKickUser}
                        onBan={handleBanUser}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'banned' && (
              <div className="space-y-3">
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : bannedUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No banned users</p>
                ) : (
                  <div className="space-y-2">
                    {bannedUsers.map((ban) => (
                      <BannedUserRow
                        key={ban.id}
                        ban={ban}
                        canManageRoom={canManageRoom}
                        onUnban={handleUnbanUser}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Memoized Member Row Component
 * Prevents unnecessary re-renders for each member
 */
const MemberRow = React.memo(({ 
  member, 
  currentUserId, 
  userRole,
  canManageRoom, 
  onUpdateRole, 
  onKick, 
  onBan 
}: {
  member: RoomMember
  currentUserId: string
  userRole: string
  canManageRoom: boolean
  onUpdateRole: (userId: string, role: 'admin' | 'moderator' | 'member') => void
  onKick: (userId: string, username: string) => void
  onBan: (userId: string, username: string) => void
}) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <Avatar
        avatarUrl={member.profile?.avatar_url}
        email={member.profile?.email}
        username={member.profile?.username}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
          {member.profile?.username || member.profile?.email}
          {member.user_id === currentUserId && (
            <span className="text-xs text-blue-500 ml-2">(You)</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            member.role === 'owner' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
            member.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
            member.role === 'moderator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {member.role === 'owner' && <Crown className="w-3 h-3 inline mr-1" />}
            {member.role}
          </span>
        </div>
      </div>
      {canManageRoom && member.user_id !== currentUserId && member.role !== 'owner' && (
        <div className="flex gap-1 flex-shrink-0">
          {userRole === 'owner' && (
            <select
              value={member.role}
              onChange={(e) => onUpdateRole(member.user_id, e.target.value as any)}
              className="px-2 py-1 rounded-lg text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
              aria-label="Change member role"
            >
              <option value="member">Member</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <button
            onClick={() => onKick(member.user_id, member.profile?.username || 'User')}
            className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 transition-colors"
            title="Kick user"
          >
            <UserCog className="w-4 h-4" />
          </button>
          <button
            onClick={() => onBan(member.user_id, member.profile?.username || 'User')}
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 transition-colors"
            title="Ban user"
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
})

MemberRow.displayName = 'MemberRow'

/**
 * Memoized Banned User Row Component
 */
const BannedUserRow = React.memo(({ 
  ban, 
  canManageRoom, 
  onUnban 
}: {
  ban: RoomBannedUser
  canManageRoom: boolean
  onUnban: (userId: string, username: string) => void
}) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
      <Avatar
        avatarUrl={ban.banned_user_profile?.avatar_url}
        email={ban.banned_user_profile?.email}
        username={ban.banned_user_profile?.username}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
          {ban.banned_user_profile?.username || ban.banned_user_profile?.email}
        </p>
        {ban.reason && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Reason: {ban.reason}</p>
        )}
        <p className="text-xs text-gray-500 truncate">
          Banned by {ban.banned_by_profile?.username || ban.banned_by_profile?.email}
        </p>
      </div>
      {canManageRoom && (
        <button
          onClick={() => onUnban(ban.user_id, ban.banned_user_profile?.username || 'User')}
          className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 text-sm font-medium transition-colors flex-shrink-0"
        >
          Unban
        </button>
      )}
    </div>
  )
})

BannedUserRow.displayName = 'BannedUserRow'
