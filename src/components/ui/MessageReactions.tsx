'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Smile } from 'lucide-react'
import { useMessageReactions } from '@/lib/hooks/useReactions'
import { ReactionPicker } from './ReactionPicker'

interface MessageReactionsProps {
  messageId: string
  isOwnMessage?: boolean
}

export function MessageReactions({ messageId, isOwnMessage = false }: MessageReactionsProps) {
  const { reactions, toggleReaction } = useMessageReactions(messageId)
  const [showPicker, setShowPicker] = useState(false)

  const handleEmojiSelect = async (emoji: string) => {
    await toggleReaction(emoji)
    setShowPicker(false)
  }

  const handleReactionClick = async (emoji: string) => {
    await toggleReaction(emoji)
  }

  if (reactions.length === 0 && !showPicker) {
    return (
      <div className="relative mt-1">
        <button
          onClick={() => setShowPicker(true)}
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-lg hover:bg-primary/20 hover:scale-110 active:scale-95"
          title="Add reaction"
        >
          <Smile size={14} className="text-muted" />
        </button>
        
        <ReactionPicker
          isOpen={showPicker}
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowPicker(false)}
          isOwnMessage={isOwnMessage}
        />
      </div>
    )
  }

  return (
    <div className="relative mt-2">
      {/* Existing Reactions */}
      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() => handleReactionClick(reaction.emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
                reaction.userReacted
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 hover:bg-blue-500/30 shadow-sm'
                  : 'card border-primary hover:bg-primary/10 hover:border-primary/50 hover:shadow-sm'
              }`}
              title={`${reaction.count} reaction${reaction.count !== 1 ? 's' : ''}`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span className="text-xs text-secondary">{reaction.count}</span>
            </button>
          ))}
          
          {/* Add Reaction Button */}
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 hover:bg-primary/20 hover:scale-110 active:scale-95 btn-secondary"
            title="Add reaction"
          >
            <Plus size={12} className="text-muted" />
          </button>
        </div>
      )}

      {/* Reaction Picker */}
      <ReactionPicker
        isOpen={showPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowPicker(false)}
        isOwnMessage={isOwnMessage}
      />
    </div>
  )
}