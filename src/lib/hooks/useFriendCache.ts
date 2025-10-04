import { useState, useEffect, useCallback } from 'react'
import { cacheSystem } from '@/lib/cache/CacheSystemManager'
import type { FriendshipWithProfile, FriendRequest } from '@/lib/cache/CacheSystemManager'
import { createClient } from '@/lib/supabase/client'

export function useFriendCache(userId: string) {
  const [friendships, setFriendships] = useState<FriendshipWithProfile[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFriendships = useCallback(async () => {
    if (!userId) return

    try {
      // Try cache first
      const cachedFriendships = await cacheSystem.getFriendships(userId)
      
      if (cachedFriendships.length > 0) {
        setFriendships(cachedFriendships)
        setLoading(false)
        return
      }

      // Load from database if not in cache
      const supabase = createClient()
      
      // Query friendships where user is either user1 or user2
      const { data, error: dbError } = await supabase
        .from('friendships')
        .select(`
          *,
          user1_profile:profiles!friendships_user1_id_fkey (
            id,
            username,
            email,
            avatar_url,
            status
          ),
          user2_profile:profiles!friendships_user2_id_fkey (
            id,
            username,
            email,
            avatar_url,
            status
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('status', 'accepted')

      if (dbError) throw dbError

      // Map to FriendshipWithProfile format
      const friendshipsWithProfiles = (data || []).map(f => {
        // Determine which user is the friend
        const isFriend = f.user1_id === userId
        const friendProfile = isFriend ? f.user2_profile : f.user1_profile
        
        return {
          ...f,
          friend_profile: {
            id: friendProfile.id,
            username: friendProfile.username,
            email: friendProfile.email,
            avatar_url: friendProfile.avatar_url,
            status: friendProfile.status || 'offline'
          }
        }
      }) as FriendshipWithProfile[]

      // Cache the friendships
      for (const friendship of friendshipsWithProfiles) {
        await cacheSystem.cacheFriendship(friendship, userId)
      }

      setFriendships(friendshipsWithProfiles)
      setLoading(false)
    } catch (err: any) {
      console.error('Error loading friendships:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [userId])

  const loadFriendRequests = useCallback(async () => {
    if (!userId) return

    try {
      // Try cache first
      const cachedRequests = await cacheSystem.getFriendRequests(userId, 'received')
      
      if (cachedRequests.length > 0) {
        setFriendRequests(cachedRequests)
        return
      }

      // Load from database if not in cache
      const supabase = createClient()
      const { data, error: dbError } = await supabase
        .from('friendships')
        .select(`
          *,
          sender:profiles!friendships_initiated_by_fkey (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('user2_id', userId)
        .eq('status', 'pending')

      if (dbError) throw dbError

      const requests = (data || []).map(f => ({
        id: f.id,
        requester_id: f.user1_id,
        recipient_id: f.user2_id,
        status: f.status,
        relationship_type: f.relationship_type,
        message: '',
        created_at: f.created_at,
        requester_profile: f.sender
      })) as FriendRequest[]

      // Cache the requests
      for (const request of requests) {
        await cacheSystem.cacheFriendRequest(request)
      }

      setFriendRequests(requests)
    } catch (err: any) {
      console.error('Error loading friend requests:', err)
      setError(err.message)
    }
  }, [userId])

  const refreshFriends = useCallback(async () => {
    setLoading(true)
    await cacheSystem.invalidateFriendCache(userId)
    await loadFriendships()
    await loadFriendRequests()
  }, [userId, loadFriendships, loadFriendRequests])

  const updateFriendStatus = useCallback(async (friendId: string, status: string) => {
    // Update in local state
    setFriendships(prev =>
      prev.map(f => {
        const actualFriendId = f.user1_id === userId ? f.user2_id : f.user1_id
        return actualFriendId === friendId
          ? { ...f, friend_profile: { ...f.friend_profile, status: status as any } }
          : f
      })
    )
  }, [userId])

  useEffect(() => {
    loadFriendships()
    loadFriendRequests()

    // Set up real-time subscription for friendships
    const supabase = createClient()
    const channel = supabase
      .channel(`friendships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${userId}`
        },
        () => {
          refreshFriends()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${userId}`
        },
        () => {
          refreshFriends()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, loadFriendships, loadFriendRequests, refreshFriends])

  return {
    friendships: friendships.filter(f => f.status === 'accepted'),
    pendingRequests: friendRequests,
    blockedFriends: friendships.filter(f => f.status === 'blocked'),
    loading,
    error,
    refreshFriends,
    updateFriendStatus
  }
}
