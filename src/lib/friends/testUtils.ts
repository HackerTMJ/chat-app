/**
 * Friend System Testing Utilities
 * Helper functions to test the friend system functionality
 */

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function testFriendSystemSetup() {
  console.log('🧪 Testing Friend System Setup...')
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ User not authenticated:', authError)
      return false
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Check if profiles table exists and user has profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError)
      
      // Try to create profile if it doesn't exist
      if (profileError.code === 'PGRST116') {
        console.log('🔧 Creating user profile...')
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            email: user.email,
            full_name: user.user_metadata?.name || user.email?.split('@')[0]
          })
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Error creating profile:', createError)
          return false
        }
        
        console.log('✅ Profile created:', newProfile)
      } else {
        return false
      }
    } else {
      console.log('✅ User profile exists:', profile)
    }
    
    // Test friendship table access
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('count')
      .limit(1)
    
    if (friendshipError) {
      console.error('❌ Error accessing friendships table:', friendshipError)
      return false
    }
    
    console.log('✅ Friendships table accessible')
    
    // Test couple_rooms table access
    const { data: rooms, error: roomsError } = await supabase
      .from('couple_rooms')
      .select('count')
      .limit(1)
    
    if (roomsError) {
      console.error('❌ Error accessing couple_rooms table:', roomsError)
      return false
    }
    
    console.log('✅ Couple rooms table accessible')
    
    console.log('🎉 Friend system setup test completed successfully!')
    return true
    
  } catch (error) {
    console.error('💥 Test setup failed:', error)
    return false
  }
}

export async function createTestFriendship() {
  console.log('🧪 Creating test friendship...')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('❌ User not authenticated')
    return
  }
  
  // First, let's create a test user profile if needed
  const testUserEmail = 'testuser@example.com'
  const testUserId = 'test-user-id-123'
  
  console.log('🔧 Creating test user profile...')
  
  // Check if test user exists
  let { data: testUser, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', testUserEmail)
    .single()
  
  if (fetchError && fetchError.code === 'PGRST116') {
    // Create test user profile
    const { data: newTestUser, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        username: 'testuser',
        email: testUserEmail,
        full_name: 'Test User'
      })
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creating test user:', createError)
      return
    }
    
    testUser = newTestUser
    console.log('✅ Test user created:', testUser)
  } else if (fetchError) {
    console.error('❌ Error checking test user:', fetchError)
    return
  } else {
    console.log('✅ Test user exists:', testUser)
  }
  
  console.log('🎯 Creating friendship from test user to current user...')
  
  try {
    // Create friendship request from test user to current user
    const { data: friendship, error: createError } = await supabase
      .from('friendships')
      .insert({
        user1_id: testUser.id, // Test user sends request
        user2_id: user.id,     // Current user receives request
        relationship_type: 'friend',
        initiated_by: testUser.id,
        status: 'pending'
      })
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creating test friendship:', createError)
      
      // Check if friendship already exists
      if (createError.code === '23505') {
        console.log('ℹ️ Friendship already exists between these users')
        
        // Try to find existing friendship
        const { data: existing } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(user1_id.eq.${testUser.id},user2_id.eq.${user.id}),and(user1_id.eq.${user.id},user2_id.eq.${testUser.id})`)
          
        console.log('📋 Existing friendship:', existing)
      }
    } else {
      console.log('✅ Test friendship created:', friendship)
      console.log('💡 Now you can test accepting this friend request!')
    }
    
  } catch (error) {
    console.error('💥 Exception creating test friendship:', error)
  }
}

export async function debugFriendshipState() {
  console.log('🔍 Debugging friendship state...')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('❌ User not authenticated')
    return
  }
  
  console.log('👤 Current user:', user.id)
  
  // Check all friendships involving this user
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
  
  if (error) {
    console.error('❌ Error fetching friendships:', error)
  } else {
    console.log('📋 All friendships for user:', friendships)
    
    // Show pending requests where user is recipient
    const pendingReceived = friendships?.filter(f => 
      f.user2_id === user.id && f.status === 'pending'
    )
    console.log('📥 Pending requests received:', pendingReceived)
    
    // Show pending requests where user is sender
    const pendingSent = friendships?.filter(f => 
      f.user1_id === user.id && f.status === 'pending'
    )
    console.log('📤 Pending requests sent:', pendingSent)
  }
  
  // Test RLS policies
  console.log('🛡️ Testing RLS policies...')
  
  // Try to see if we can update a friendship
  if (friendships && friendships.length > 0) {
    const testFriendship = friendships[0]
    console.log('🧪 Testing update on friendship:', testFriendship.id)
    
    const { data, error } = await supabase
      .from('friendships')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testFriendship.id)
      .select()
    
    if (error) {
      console.error('❌ RLS Update test failed:', error)
    } else {
      console.log('✅ RLS Update test passed:', data)
    }
  }
}

// Add this to window for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testFriendSystem = testFriendSystemSetup;
  (window as any).createTestFriendship = createTestFriendship;
  (window as any).debugFriendshipState = debugFriendshipState;
}