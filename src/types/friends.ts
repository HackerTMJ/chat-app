/**
 * TypeScript types for Friend/Couple System
 * 2-person max intimate relationship system
 */

export interface Friendship {
  id: string
  user1_id: string
  user2_id: string
  status: 'pending' | 'accepted' | 'blocked' | 'cancelled'
  relationship_type: 'friend' | 'couple' | 'bestfriend'
  initiated_by: string
  created_at: string
  accepted_at?: string
  updated_at: string
}

export interface CoupleRoom {
  id: string
  friendship_id: string
  room_name?: string
  room_theme: 'default' | 'romantic' | 'friendship' | 'minimal'
  created_at: string
  last_activity: string
}

export interface CoupleMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'heart' | 'anniversary' | 'note'
  is_private_note: boolean
  created_at: string
  edited_at?: string
  // Populated by joins
  sender_profile?: {
    username: string
    avatar_url?: string
  }
}

export interface RelationshipStatus {
  id: string
  friendship_id: string
  shared_status?: string
  anniversary_date?: string
  total_messages: number
  streak_days: number
  last_interaction: string
  special_notes?: string
  created_at: string
  updated_at: string
}

export interface FriendshipWithProfile extends Friendship {
  friend_profile: {
    id: string
    username: string
    email: string
    avatar_url?: string
    status?: 'online' | 'away' | 'offline'
  }
}

export interface CoupleRoomWithDetails extends CoupleRoom {
  friendship: FriendshipWithProfile
  relationship_status?: RelationshipStatus
  last_message?: CoupleMessage
  unread_count?: number
}

// Request/Response types
export interface SendFriendRequestData {
  recipient_id: string
  relationship_type: 'friend' | 'couple' | 'bestfriend'
  message?: string
}

export interface FriendRequestResponse {
  success: boolean
  friendship?: Friendship
  error?: string
}

export interface AcceptFriendRequestData {
  friendship_id: string
  accept: boolean
}

export interface CoupleMessageData {
  room_id: string
  content: string
  message_type?: 'text' | 'heart' | 'anniversary' | 'note'
  is_private_note?: boolean
}

// UI State types
export interface FriendSystemState {
  friendships: FriendshipWithProfile[]
  pendingRequests: FriendshipWithProfile[]
  coupleRooms: CoupleRoomWithDetails[]
  activeCoupleRoom?: CoupleRoomWithDetails
  loading: boolean
  error?: string
}

// Special couple features
export interface CoupleFeatures {
  sharedStatus?: string
  anniversaryDays?: number
  totalMessages?: number
  streakDays?: number
  coupleEmojis: string[] // Special emoji reactions for couples
  relationshipMilestones: {
    first_message: string
    hundred_messages: boolean
    one_month: boolean
    six_months: boolean
    one_year: boolean
  }
}

// Theme configurations
export interface CoupleTheme {
  id: string
  name: string
  background: string
  primaryColor: string
  heartColor: string
  textColor: string
  bubbleStyle: 'rounded' | 'heart' | 'minimal'
}

export const COUPLE_THEMES: CoupleTheme[] = [
  {
    id: 'default',
    name: 'Default',
    background: 'bg-gray-50',
    primaryColor: 'text-blue-600',
    heartColor: 'text-red-500',
    textColor: 'text-gray-800',
    bubbleStyle: 'rounded'
  },
  {
    id: 'romantic',
    name: 'Romantic',
    background: 'bg-gradient-to-br from-pink-50 to-red-50',
    primaryColor: 'text-pink-600',
    heartColor: 'text-red-600',
    textColor: 'text-gray-800',
    bubbleStyle: 'heart'
  },
  {
    id: 'friendship',
    name: 'Friendship',
    background: 'bg-gradient-to-br from-blue-50 to-purple-50',
    primaryColor: 'text-purple-600',
    heartColor: 'text-yellow-500',
    textColor: 'text-gray-800',
    bubbleStyle: 'rounded'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    background: 'bg-white',
    primaryColor: 'text-gray-600',
    heartColor: 'text-gray-400',
    textColor: 'text-gray-900',
    bubbleStyle: 'minimal'
  }
]

// Relationship type configurations
export interface RelationshipTypeConfig {
  id: 'friend' | 'couple' | 'bestfriend'
  label: string
  emoji: string
  description: string
  features: string[]
  defaultTheme: string
}

export const RELATIONSHIP_TYPES: RelationshipTypeConfig[] = [
  {
    id: 'friend',
    label: 'Friend',
    emoji: '👫',
    description: 'Regular friendship with private chat',
    features: ['Private chat', 'Shared status', 'Message history'],
    defaultTheme: 'default'
  },
  {
    id: 'couple',
    label: 'Couple',
    emoji: '💕',
    description: 'Romantic relationship with special features',
    features: ['Heart reactions', 'Anniversary tracker', 'Couple themes', 'Private notes'],
    defaultTheme: 'romantic'
  },
  {
    id: 'bestfriend',
    label: 'Best Friend',
    emoji: '👯',
    description: 'Close friendship with enhanced features',
    features: ['Best friend status', 'Streak tracking', 'Special emojis', 'Milestone rewards'],
    defaultTheme: 'friendship'
  }
]