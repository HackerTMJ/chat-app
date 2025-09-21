import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserStatus = 'online' | 'offline' | 'away' | 'busy'

export interface UserStatusInfo {
  user_id: string
  status: UserStatus
  last_seen: string
}

export function useUserStatus(currentUser: any) {
  const [userStatus, setUserStatus] = useState<UserStatus>('offline')
  const [lastActivity, setLastActivity] = useState<Date>(new Date())
  const supabase = createClient()

  // Update user status in database
  const updateStatus = async (status: UserStatus) => {
    if (!currentUser) return false

    try {
      // First ensure profile exists
      await ensureProfileExists()

      const { error } = await supabase
        .from('profiles')
        .update({ 
          status,
          last_seen: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      if (error) throw error

      setUserStatus(status)
      return true
    } catch (error) {
      console.error('Error updating user status:', error)
      return false
    }
  }

  // Ensure user profile exists
  const ensureProfileExists = async () => {
    if (!currentUser) return

    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Anonymous',
            full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name,
            status: 'online'
          })

        if (createError) throw createError
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error)
    }
  }

  // Auto-detect idle/away status based on user activity
  const updateLastActivity = () => {
    setLastActivity(new Date())
    
    // If user was away/idle, set back to online
    if (userStatus === 'away') {
      updateStatus('online')
    }
  }

  // Set user as online when they become active
  const setOnline = () => updateStatus('online')
  
  // Set user as away (idle)
  const setAway = () => updateStatus('away')
  
  // Set user as busy (manual)
  const setBusy = () => updateStatus('busy')
  
  // Set user as offline
  const setOffline = () => updateStatus('offline')

  // Load current user status on mount
  useEffect(() => {
    if (!currentUser) return

    const loadUserStatus = async () => {
      try {
        // First ensure profile exists
        await ensureProfileExists()

        const { data, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', currentUser.id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist, create it and set to online
            await ensureProfileExists()
            setUserStatus('online')
            return
          }
          throw error
        }

        if (data) {
          setUserStatus(data.status as UserStatus)
        }
      } catch (error) {
        console.error('Error loading user status:', error)
        // Default to online if we can't load status
        setUserStatus('online')
      }
    }

    loadUserStatus()
  }, [currentUser])

  // Set user as online when component mounts
  useEffect(() => {
    if (currentUser) {
      setOnline()
    }
  }, [currentUser])

  // Auto-detect idle status
  useEffect(() => {
    let idleTimer: NodeJS.Timeout

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      
      // Set user as away after 5 minutes of inactivity
      idleTimer = setTimeout(() => {
        if (userStatus === 'online') {
          setAway()
        }
      }, 5 * 60 * 1000) // 5 minutes
    }

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      updateLastActivity()
      resetIdleTimer()
    }

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initial timer
    resetIdleTimer()

    return () => {
      if (idleTimer) clearTimeout(idleTimer)
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [userStatus])

  // Set user offline when page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser) {
        // Use sendBeacon for reliable offline status update
        const data = JSON.stringify({
          user_id: currentUser.id,
          status: 'offline',
          last_seen: new Date().toISOString()
        })
        
        navigator.sendBeacon('/api/user-status', data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentUser])

  return {
    userStatus,
    lastActivity,
    setOnline,
    setAway,
    setBusy,
    setOffline,
    updateStatus
  }
}