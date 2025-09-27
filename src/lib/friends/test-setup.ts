// Quick test to create sample friendship and couple room
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function createTestFriendshipAndRoom() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ No authenticated user')
      return
    }

    console.log('Creating test friendship for user:', user.id)

    // First, let's check if there are any other users in the system
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .neq('id', user.id)
      .limit(5)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    console.log('Available other users:', allProfiles)

    if (!allProfiles || allProfiles.length === 0) {
      console.log('❌ No other users found. Need at least 2 users to create a friendship.')
      return
    }

    const otherUser = allProfiles[0]
    console.log('Creating friendship with:', otherUser)

    // Create a friendship
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user1_id: user.id,
        user2_id: otherUser.id,
        status: 'pending',
        relationship_type: 'friend',
        initiated_by: user.id
      })
      .select()
      .single()

    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError)
      return
    }

    console.log('✅ Created friendship:', friendship)

    // Accept the friendship to trigger room creation
    const { data: acceptedFriendship, error: acceptError } = await supabase
      .from('friendships')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', friendship.id)
      .select()
      .single()

    if (acceptError) {
      console.error('Error accepting friendship:', acceptError)
      return
    }

    console.log('✅ Accepted friendship:', acceptedFriendship)

    // Check if couple room was created by trigger
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second for trigger

    const { data: coupleRoom, error: roomError } = await supabase
      .from('couple_rooms')
      .select('*')
      .eq('friendship_id', friendship.id)
      .single()

    if (roomError) {
      console.error('Error checking couple room:', roomError)
      console.log('❌ Couple room was not created automatically. This might indicate a trigger issue.')
      
      // Manually create the room if trigger failed
      const { data: manualRoom, error: manualRoomError } = await supabase
        .from('couple_rooms')
        .insert({
          friendship_id: friendship.id,
          room_name: '👫 Friends Chat'
        })
        .select()
        .single()

      if (manualRoomError) {
        console.error('Error creating manual couple room:', manualRoomError)
        return
      }

      console.log('✅ Manually created couple room:', manualRoom)
    } else {
      console.log('✅ Couple room created by trigger:', coupleRoom)
    }

    // Check relationship status
    const { data: relationshipStatus, error: statusError } = await supabase
      .from('relationship_status')
      .select('*')
      .eq('friendship_id', friendship.id)
      .single()

    if (statusError) {
      console.error('Error checking relationship status:', statusError)
      console.log('❌ Relationship status was not created. Creating manually...')
      
      const { data: manualStatus, error: manualStatusError } = await supabase
        .from('relationship_status')
        .insert({
          friendship_id: friendship.id,
          anniversary_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (manualStatusError) {
        console.error('Error creating manual relationship status:', manualStatusError)
        return
      }

      console.log('✅ Manually created relationship status:', manualStatus)
    } else {
      console.log('✅ Relationship status created:', relationshipStatus)
    }

    console.log('🎉 Test friendship and room setup complete!')
    return friendship

  } catch (error) {
    console.error('❌ Error in createTestFriendshipAndRoom:', error)
  }
}

// Function to clean up test data
export async function cleanupTestData() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    console.log('🧹 Cleaning up test data...')

    // Delete all friendships for this user
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (deleteError) {
      console.error('Error cleaning up:', deleteError)
      return
    }

    console.log('✅ Test data cleaned up')

  } catch (error) {
    console.error('❌ Error cleaning up:', error)
  }
}