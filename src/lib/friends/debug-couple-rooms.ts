// Debug utility for couple rooms issues
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function debugCoupleRoomsData() {
  try {
    console.log('=== COUPLE ROOMS DEBUG ===')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ No authenticated user')
      return
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Check all couple rooms
    const { data: allRooms, error: roomsError } = await supabase
      .from('couple_rooms')
      .select('*')
    
    console.log('📊 All couple rooms in database:', allRooms?.length || 0)
    console.log('Room data:', allRooms)
    
    if (roomsError) {
      console.error('❌ Error fetching all rooms:', roomsError)
    }
    
    // Check user's friendships
    const { data: userFriendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    
    console.log('👥 User friendships:', userFriendships?.length || 0)
    console.log('Friendships data:', userFriendships)
    
    if (friendshipsError) {
      console.error('❌ Error fetching friendships:', friendshipsError)
    }
    
    // Check accepted friendships
    const acceptedFriendships = userFriendships?.filter((f: any) => f.status === 'accepted') || []
    console.log('✅ Accepted friendships:', acceptedFriendships.length)
    console.log('Accepted data:', acceptedFriendships)
    
    // Check if couple rooms exist for accepted friendships
    if (acceptedFriendships.length > 0) {
      const friendshipIds = acceptedFriendships.map((f: any) => f.id)
      const { data: matchingRooms, error: matchingError } = await supabase
        .from('couple_rooms')
        .select('*')
        .in('friendship_id', friendshipIds)
      
      console.log('🏠 Couple rooms for user friendships:', matchingRooms?.length || 0)
      console.log('Matching rooms:', matchingRooms)
      
      if (matchingError) {
        console.error('❌ Error fetching matching rooms:', matchingError)
      }
    }
    
    // Check relationship status
    const { data: relationshipStatuses, error: statusError } = await supabase
      .from('relationship_status')
      .select('*')
    
    console.log('💕 All relationship statuses:', relationshipStatuses?.length || 0)
    console.log('Status data:', relationshipStatuses)
    
    if (statusError) {
      console.error('❌ Error fetching relationship statuses:', statusError)
    }
    
    console.log('=== END DEBUG ===')
    
  } catch (error) {
    console.error('❌ Debug function error:', error)
  }
}