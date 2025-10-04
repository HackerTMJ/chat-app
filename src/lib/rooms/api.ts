/**
 * API functions for Room Features
 * Handles room avatars, categories, member management, archiving
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Room,
  RoomCategory,
  RoomUserCategory,
  RoomMember,
  RoomBannedUser,
  UpdateRoomData,
  BanUserData,
  UpdateMemberRoleData,
} from '@/types/rooms'

const supabase = createClient()

// ==================== ROOM AVATAR ====================

/**
 * Upload room avatar image
 */
export async function uploadRoomAvatar(roomId: string, file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${roomId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { data, error } = await supabase.storage
      .from('room-avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('room-avatars')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading room avatar:', error)
    throw error
  }
}

/**
 * Delete room avatar
 */
export async function deleteRoomAvatar(avatarUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = avatarUrl.split('/room-avatars/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('room-avatars')
      .remove([filePath])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting room avatar:', error)
    throw error
  }
}

/**
 * Update room avatar URL in database
 */
export async function updateRoomAvatar(roomId: string, avatarUrl: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', roomId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating room avatar:', error)
    throw error
  }
}

// ==================== ROOM INFO ====================

/**
 * Update room information (name, description, etc.)
 */
export async function updateRoomInfo(roomId: string, data: UpdateRoomData): Promise<void> {
  try {
    console.log('Updating room info:', roomId, data)
    const { error } = await supabase
      .from('rooms')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', roomId)

    if (error) {
      console.error('Supabase error details:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating room info:', error)
    throw error
  }
}

/**
 * Get room details with member count
 */
export async function getRoomDetails(roomId: string): Promise<Room | null> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting room details:', error)
    return null
  }
}

// ==================== ROOM CATEGORIES ====================

/**
 * Get user's room categories
 */
export async function getUserRoomCategories(userId: string): Promise<RoomCategory[]> {
  try {
    const { data, error } = await supabase
      .from('room_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting room categories:', error)
    return []
  }
}

/**
 * Create a new room category
 */
export async function createRoomCategory(
  userId: string,
  name: string,
  color: string = '#667eea',
  icon?: string
): Promise<RoomCategory | null> {
  try {
    const { data, error } = await supabase
      .from('room_categories')
      .insert({
        user_id: userId,
        name,
        color,
        icon,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating room category:', error)
    return null
  }
}

/**
 * Update room category
 */
export async function updateRoomCategory(
  categoryId: string,
  data: Partial<Pick<RoomCategory, 'name' | 'color' | 'icon' | 'sort_order'>>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_categories')
      .update(data)
      .eq('id', categoryId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating room category:', error)
    throw error
  }
}

/**
 * Delete room category
 */
export async function deleteRoomCategory(categoryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_categories')
      .delete()
      .eq('id', categoryId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting room category:', error)
    throw error
  }
}

/**
 * Assign room to category
 */
export async function assignRoomToCategory(
  roomId: string,
  userId: string,
  categoryId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_user_categories')
      .upsert({
        room_id: roomId,
        user_id: userId,
        category_id: categoryId,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error assigning room to category:', error)
    throw error
  }
}

/**
 * Remove room from category
 */
export async function removeRoomFromCategory(roomId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_user_categories')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error removing room from category:', error)
    throw error
  }
}

// ==================== ROOM ARCHIVING ====================

/**
 * Archive a room
 */
export async function archiveRoom(roomId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (error) throw error
  } catch (error) {
    console.error('Error archiving room:', error)
    throw error
  }
}

/**
 * Unarchive a room
 */
export async function unarchiveRoom(roomId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({
        is_archived: false,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (error) throw error
  } catch (error) {
    console.error('Error unarchiving room:', error)
    throw error
  }
}

/**
 * Get archived rooms for user
 */
export async function getArchivedRooms(userId: string): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_archived', true)
      .order('archived_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting archived rooms:', error)
    return []
  }
}

// ==================== MEMBER MANAGEMENT ====================

/**
 * Get room members with profiles
 */
export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  try {
    const { data, error } = await supabase
      .from('room_memberships')
      .select(`
        *,
        profile:profiles(username, email, avatar_url, status)
      `)
      .eq('room_id', roomId)
      .order('joined_at')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting room members:', error)
    return []
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(data: UpdateMemberRoleData): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_memberships')
      .update({ role: data.new_role })
      .eq('room_id', data.room_id)
      .eq('user_id', data.user_id)

    if (error) throw error
  } catch (error) {
    console.error('Error updating member role:', error)
    throw error
  }
}

/**
 * Kick user from room (remove from members)
 */
export async function kickUserFromRoom(roomId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_memberships')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error kicking user from room:', error)
    throw error
  }
}

/**
 * Ban user from room (with trigger auto-kick)
 */
export async function banUserFromRoom(data: BanUserData): Promise<void> {
  try {
    console.log('🚫 Banning user:', data)

    // Add to banned list (trigger will auto-kick)
    const { data: bannedData, error } = await supabase
      .from('room_banned_users')
      .insert({
        room_id: data.room_id,
        user_id: data.user_id,
        banned_by: data.banned_by,
        reason: data.reason,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Ban error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('✅ User banned successfully:', bannedData)
  } catch (error: any) {
    console.error('Error banning user from room:', error)
    console.error('Full error object:', JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Unban user from room
 */
export async function unbanUserFromRoom(roomId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('room_banned_users')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error unbanning user from room:', error)
    throw error
  }
}

/**
 * Get banned users for a room
 */
export async function getRoomBannedUsers(roomId: string): Promise<RoomBannedUser[]> {
  try {
    const { data, error } = await supabase
      .from('room_banned_users')
      .select(`
        *,
        banned_user_profile:profiles!room_banned_users_user_id_fkey(username, email, avatar_url),
        banned_by_profile:profiles!room_banned_users_banned_by_fkey(username, email)
      `)
      .eq('room_id', roomId)
      .order('banned_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting banned users:', error)
    return []
  }
}

/**
 * Check if user is banned from room
 */
export async function isUserBanned(roomId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('room_banned_users')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  } catch (error) {
    console.error('Error checking if user is banned:', error)
    return false
  }
}
