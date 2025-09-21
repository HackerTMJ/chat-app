'use client'

import { useChatStore } from '@/lib/stores/chat'
import { useTypingCleanup } from '@/lib/hooks/useTypingIndicator'

export function TypingIndicator() {
  const { typingUsers } = useChatStore()
  
  // Auto-cleanup stale typing indicators
  useTypingCleanup()

  if (typingUsers.length === 0) return null

  const renderTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing...`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    } else if (typingUsers.length === 3) {
      return `${typingUsers[0].username}, ${typingUsers[1].username}, and ${typingUsers[2].username} are typing...`
    } else {
      return `${typingUsers[0].username}, ${typingUsers[1].username}, and ${typingUsers.length - 2} others are typing...`
    }
  }

  return (
    <div className="px-6 pb-2 fade-in">
      <div className="flex items-center gap-2 text-sm text-muted">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce typing-dot-1" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce typing-dot-2" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce typing-dot-3" />
        </div>
        <span className="italic">
          {renderTypingText()}
        </span>
      </div>
    </div>
  )
}