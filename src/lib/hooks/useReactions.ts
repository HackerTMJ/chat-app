import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface ReactionSummary {
  emoji: string
  count: number
  userReacted: boolean
}

export function useMessageReactions(messageId: string) {
  const [reactions, setReactions] = useState<ReactionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Basic UUID v4 validator (case-insensitive)
  const isValidUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  }

  // Load reactions for a message
  const loadReactions = async () => {
    if (!messageId) return
    if (!isValidUUID(messageId)) {
      // Likely an optimistic temp ID; skip server calls
      setReactions([])
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_message_reactions', { message_ids: [messageId] })

      if (error) throw error

      // Group by emoji and aggregate
      const reactionMap = new Map<string, ReactionSummary>()
      
      data?.forEach((item: any) => {
        reactionMap.set(item.emoji, {
          emoji: item.emoji,
          count: parseInt(item.count),
          userReacted: item.user_reacted
        })
      })

      setReactions(Array.from(reactionMap.values()))
    } catch (error) {
      console.error('Error loading reactions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Add a reaction
  const addReaction = async (emoji: string) => {
    try {
      if (!isValidUUID(messageId)) return false
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji
        })

      if (error) {
        // If it's a duplicate, remove the reaction instead
        if (error.code === '23505') {
          return await removeReaction(emoji)
        }
        throw error
      }

      await loadReactions()
      return true
    } catch (error) {
      console.error('Error adding reaction:', error)
      return false
    }
  }

  // Remove a reaction
  const removeReaction = async (emoji: string) => {
    try {
      if (!isValidUUID(messageId)) return false
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)

      if (error) throw error

      await loadReactions()
      return true
    } catch (error) {
      console.error('Error removing reaction:', error)
      return false
    }
  }

  // Toggle reaction (add if not present, remove if present)
  const toggleReaction = async (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji && r.userReacted)
    
    if (existingReaction) {
      return await removeReaction(emoji)
    } else {
      return await addReaction(emoji)
    }
  }

  // Load reactions when message changes
  useEffect(() => {
    loadReactions()
  }, [messageId])

  // Set up real-time subscription for reactions
  useEffect(() => {
    if (!messageId) return
    if (!isValidUUID(messageId)) return

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          loadReactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messageId])

  return {
    reactions,
    loading,
    addReaction,
    removeReaction,
    toggleReaction,
    refreshReactions: loadReactions
  }
}