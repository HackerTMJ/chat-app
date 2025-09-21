'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile, Plus, X } from 'lucide-react'

interface ReactionPickerProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
  isOpen: boolean
  isOwnMessage?: boolean
}

const POPULAR_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏', 
  '🎉', '🔥', '💯', '✅', '❌', '⭐', '💡', '👀'
]

const EMOJI_CATEGORIES = {
  'Reactions': ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏'],
  'Celebrations': ['🎉', '🎊', '🎈', '🎆', '🎯', '🏆', '🥳', '💯'],
  'Objects': ['🔥', '💡', '⭐', '✨', '💎', '🚀', '⚡', '🌟'],
  'Symbols': ['✅', '❌', '⚠️', '📌', '🔔', '💭', '💬', '📍']
}

export function ReactionPicker({ onEmojiSelect, onClose, isOpen, isOwnMessage = false }: ReactionPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Reactions')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      ref={pickerRef}
      className={`absolute bottom-full mb-2 card border shadow-2xl p-4 z-50 min-w-[320px] rounded-2xl ${
        isOwnMessage ? 'right-0' : 'left-0'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smile size={18} className="text-muted" />
          <span className="text-sm font-semibold text-primary">
            Add Reaction
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-xl transition-all duration-200 hover:bg-red-500/20 hover:text-red-500"
          aria-label="Close reaction picker"
        >
          <X size={16} className="text-muted" />
        </button>
      </div>

      {/* Popular Reactions (Quick Access) */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted mb-2">
          Popular
        </div>
        <div className="flex flex-wrap gap-1">
          {POPULAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onEmojiSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-xl transition-all duration-200 hover:bg-primary/20 hover:scale-110 active:scale-95"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs font-medium rounded-xl whitespace-nowrap transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'btn-secondary hover:bg-primary/20'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto custom-scrollbar">
        {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onEmojiSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-xl transition-all duration-200 hover:bg-primary/20 hover:scale-110 active:scale-95"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Custom Emoji Input */}
      <div className="mt-3 pt-3 border-t border-primary">
        <div className="text-xs text-muted">
          Or use any emoji: 😊 🎨 🌈
        </div>
      </div>
    </div>
  )
}