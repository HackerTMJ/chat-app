/**
 * TypeScript types for Room Features
 * Room avatars, categories, archiving, and member management
 */

export interface Room {
  id: string
  code: string
  name: string
  description?: string
  avatar_url?: string
  room_type: 'public' | 'private' | 'direct'
  max_members: number
  is_active: boolean
  is_archived: boolean
  archived_at?: string
  category?: string
  created_by: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface RoomCategory {
  id: string
  user_id: string
  name: string
  color: string
  icon?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface RoomUserCategory {
  id: string
  room_id: string
  user_id: string
  category_id: string
  created_at: string
  // Populated by joins
  category?: RoomCategory
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
  joined_at: string
  last_read_at: string
  is_muted: boolean
  // Populated by joins
  profile?: {
    username: string
    email: string
    avatar_url?: string
    status?: string
  }
}

export interface RoomBannedUser {
  id: string
  room_id: string
  user_id: string
  banned_by: string
  reason?: string
  banned_at: string
  // Populated by joins
  banned_user_profile?: {
    username: string
    email: string
    avatar_url?: string
  }
  banned_by_profile?: {
    username: string
    email: string
  }
}

export interface RoomWithDetails extends Room {
  member_count?: number
  unread_count?: number
  last_message?: {
    content: string
    created_at: string
    sender_name: string
  }
  user_role?: 'owner' | 'admin' | 'moderator' | 'member'
  category_info?: RoomCategory
}

export interface CreateRoomData {
  name: string
  description?: string
  avatar_url?: string
  room_type?: 'public' | 'private'
  max_members?: number
  category?: string
}

export interface UpdateRoomData {
  name?: string
  description?: string
  avatar_url?: string
  max_members?: number
  category?: string
  is_archived?: boolean
}

export interface KickUserData {
  room_id: string
  user_id: string
  kicked_by: string
}

export interface BanUserData {
  room_id: string
  user_id: string
  banned_by: string
  reason?: string
}

export interface UpdateMemberRoleData {
  room_id: string
  user_id: string
  new_role: 'admin' | 'moderator' | 'member'
}
