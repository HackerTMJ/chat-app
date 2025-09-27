/**
 * Friend/Couple System API Functions
 * Handles 2-person max relationship system
 */

import { createClient } from '@/lib/supabase/client'
import type { 
  Friendship, 
  FriendshipWithProfile, 
  CoupleRoom, 
  CoupleRoomWithDetails,
  CoupleMessage,
  SendFriendRequestData,
  FriendRequestResponse,
  AcceptFriendRequestData,
  CoupleMessageData,
  RelationshipStatus
} from '@/types/friends'

const supabase = createClient()

export async function sendFriendRequest({
  recipient_id,
  relationship_type,
  message
}: SendFriendRequestData): Promise<FriendRequestResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${recipient_id}),and(user1_id.eq.${recipient_id},user2_id.eq.${user.id})`)
      .single()

    if (existingFriendship) {
      return {
        success: false,
        error: 'Friendship request already exists or you are already friends'
      }
    }

    // Create friendship request
    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        user1_id: user.id,
        user2_id: recipient_id,
        relationship_type: relationship_type || 'friend',
        initiated_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      friendship
    }

  } catch (error) {
    console.error('Error sending friend request:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send friend request'
    }
  }
}

// Simplified version that takes just user ID
export async function sendFriendRequestSimple(recipient_id: string): Promise<FriendRequestResponse> {
  return await sendFriendRequest({
    recipient_id,
    relationship_type: 'friend'
  })
}

export async function acceptFriendRequest({
  friendship_id,
  accept
}: AcceptFriendRequestData): Promise<FriendRequestResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('🔍 Accepting friend request:', { friendship_id, accept, user_id: user.id })

    // First, get the friendship to check who can accept it
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendship_id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching friendship:', fetchError)
      throw new Error(`Friendship not found: ${fetchError.message || 'Unknown error'}`)
    }

    console.log('📋 Found friendship:', friendship)

    // Check if the current user is the recipient (user2) or if they initiated it (user1)
    // Only the recipient (user2) should be able to accept
    if (friendship.user2_id !== user.id) {
      console.error('❌ Authorization failed:', {
        user2_id: friendship.user2_id,
        current_user: user.id,
        user1_id: friendship.user1_id
      })
      throw new Error('You are not authorized to accept this request')
    }

    const status = accept ? 'accepted' : 'cancelled'
    const updates: any = { status }
    
    if (accept) {
      updates.accepted_at = new Date().toISOString()
    }

    console.log('🔄 Updating friendship with:', updates)

    // Try the update without the redundant user2_id filter since RLS handles access control
    const { data: updatedFriendship, error } = await supabase
      .from('friendships')
      .update(updates)
      .eq('id', friendship_id)
      .select()
      .single()

    if (error) {
      console.error('💥 Database update error details:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw new Error(`Database update failed: ${error.message || 'Unknown database error'}`)
    }

    console.log('✅ Friendship updated successfully:', updatedFriendship)

    return {
      success: true,
      friendship: updatedFriendship
    }

  } catch (error) {
    console.error('💥 Error accepting friend request:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept friend request'
    }
  }
}

export async function rejectFriendRequest(friendship_id: string): Promise<FriendRequestResponse> {
  return await acceptFriendRequest({ friendship_id, accept: false })
}

// Convenience function for simple acceptance
export async function acceptFriendRequestSimple(friendship_id: string): Promise<FriendRequestResponse> {
  return await acceptFriendRequest({ friendship_id, accept: true })
}

// Friend Management Functions
export async function getFriendships(): Promise<FriendshipWithProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user1_profile:profiles!friendships_user1_id_fkey(id, username, email, avatar_url),
        user2_profile:profiles!friendships_user2_id_fkey(id, username, email, avatar_url)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (error) throw error

    // Map to include friend profile (the other person)
    return friendships?.map(friendship => ({
      ...friendship,
      friend_profile: friendship.user1_id === user.id 
        ? friendship.user2_profile 
        : friendship.user1_profile
    })) || []

  } catch (error) {
    console.error('Error fetching friendships:', error)
    return []
  }
}

export async function getPendingFriendRequests(): Promise<FriendshipWithProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    console.log('🔍 Getting pending requests for user:', user.id)

    // Get requests received (where user is user2)
    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        *,
        sender_profile:profiles!friendships_initiated_by_fkey(id, username, email, avatar_url)
      `)
      .eq('user2_id', user.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Database error fetching pending requests:', error)
      throw error
    }

    console.log('📋 Found pending requests:', requests)

    return requests?.map(request => ({
      ...request,
      friend_profile: request.sender_profile
    })) || []

  } catch (error) {
    console.error('Error fetching pending requests:', error)
    return []
  }
}

// Couple Room Functions
export async function getCoupleRooms(): Promise<CoupleRoomWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    console.log('getCoupleRooms: Fetching rooms for user:', user.id)

    // Step 1: Get couple rooms with basic friendship data
    const { data: rooms, error: roomsError } = await supabase
      .from('couple_rooms')
      .select(`
        *,
        friendship:friendships(
          id,
          user1_id,
          user2_id,
          status,
          relationship_type,
          created_at,
          accepted_at
        )
      `)
      .order('last_activity', { ascending: false })

    if (roomsError) {
      console.error('Error fetching couple rooms (step 1):', roomsError)
      throw roomsError
    }

    console.log('getCoupleRooms: Raw rooms data:', rooms)

    if (!rooms || rooms.length === 0) {
      console.log('getCoupleRooms: No rooms found')
      return []
    }

    // Step 2: Filter rooms where user is part of friendship
    const userRooms = rooms.filter(room => 
      room.friendship && 
      (room.friendship.user1_id === user.id || room.friendship.user2_id === user.id)
    )

    console.log('getCoupleRooms: Filtered user rooms:', userRooms)

    // Step 3: Enrich with partner profiles
    const enrichedRooms = await Promise.all(
      userRooms.map(async (room) => {
        const friendship = room.friendship!
        const partnerId = friendship.user1_id === user.id 
          ? friendship.user2_id 
          : friendship.user1_id

        // Get partner profile
        const { data: partnerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url')
          .eq('id', partnerId)
          .single()

        if (profileError) {
          console.error('Error fetching partner profile:', profileError)
        }

        return {
          ...room,
          friendship: {
            ...friendship,
            friend_profile: partnerProfile
          }
        }
      })
    )

    console.log('getCoupleRooms: Final enriched rooms:', enrichedRooms)
    return enrichedRooms

  } catch (error) {
    console.error('Error fetching couple rooms:', error)
    return []
  }
}

// Couple Messaging Functions
export async function getCoupleMessages(roomId: string): Promise<CoupleMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('couple_messages')
      .select(`
        *,
        sender_profile:profiles(username, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return messages || []

  } catch (error) {
    console.error('Error fetching couple messages:', error)
    return []
  }
}

export async function sendCoupleMessage({
  room_id,
  content,
  message_type = 'text',
  is_private_note = false
}: CoupleMessageData): Promise<CoupleMessage | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: message, error } = await supabase
      .from('couple_messages')
      .insert({
        room_id,
        sender_id: user.id,
        content,
        message_type,
        is_private_note
      })
      .select(`
        *,
        sender_profile:profiles(username, avatar_url)
      `)
      .single()

    if (error) throw error

    return message

  } catch (error) {
    console.error('Error sending couple message:', error)
    return null
  }
}

// User Search Functions
export async function searchUsers(query: string): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', user.id) // Exclude current user
      .limit(10)

    if (error) throw error

    return users || []

  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

// Relationship Status Functions
export async function updateSharedStatus(
  friendshipId: string, 
  sharedStatus: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('relationship_status')
      .update({ 
        shared_status: sharedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('friendship_id', friendshipId)

    if (error) throw error
    return true

  } catch (error) {
    console.error('Error updating shared status:', error)
    return false
  }
}

export async function getRelationshipStatus(friendshipId: string): Promise<RelationshipStatus | null> {
  try {
    const { data: status, error } = await supabase
      .from('relationship_status')
      .select('*')
      .eq('friendship_id', friendshipId)
      .single()

    if (error) throw error
    return status

  } catch (error) {
    console.error('Error fetching relationship status:', error)
    return null
  }
}

// Real-time subscriptions
export function subscribeToCoupleRoom(roomId: string, callback: (message: CoupleMessage) => void) {
  return supabase
    .channel(`couple_room_${roomId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'couple_messages',
        filter: `room_id=eq.${roomId}`
      }, 
      async (payload) => {
        // Fetch the complete message with profile data
        const { data: message, error } = await supabase
          .from('couple_messages')
          .select(`
            *,
            sender_profile:profiles(username, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single()

        if (!error && message) {
          callback(message)
        }
      }
    )
    .subscribe()
}

export function subscribeToFriendRequests(callback: (request: Friendship) => void) {
  return supabase
    .channel('friend_requests')
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships'
      },
      (payload) => {
        callback(payload.new as Friendship)
      }
    )
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'friendships'
      },
      (payload) => {
        callback(payload.new as Friendship)
      }
    )
    .subscribe()
}