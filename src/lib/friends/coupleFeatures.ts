/**
 * Couple System Special Features
 * Heart reactions, themes, and anniversary tracking
 */

export interface CoupleTheme {
  id: string
  name: string
  emoji: string
  gradient: string
  messageColors: {
    sent: string
    received: string
  }
  heartColor: string
  description: string
}

export const COUPLE_THEMES: CoupleTheme[] = [
  {
    id: 'romantic',
    name: 'Romantic',
    emoji: '💕',
    gradient: 'bg-gradient-to-b from-rose-50 via-pink-50 to-red-50',
    messageColors: {
      sent: 'bg-rose-500 text-white',
      received: 'bg-white text-gray-900 border-rose-200'
    },
    heartColor: 'text-rose-500',
    description: 'Soft romantic colors for couples'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    gradient: 'bg-gradient-to-b from-orange-50 via-pink-50 to-purple-50',
    messageColors: {
      sent: 'bg-gradient-to-r from-orange-400 to-pink-500 text-white',
      received: 'bg-white text-gray-900 border-orange-200'
    },
    heartColor: 'text-orange-500',
    description: 'Warm sunset vibes'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    gradient: 'bg-gradient-to-b from-blue-50 via-cyan-50 to-teal-50',
    messageColors: {
      sent: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      received: 'bg-white text-gray-900 border-blue-200'
    },
    heartColor: 'text-blue-500',
    description: 'Calm ocean colors'
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    gradient: 'bg-gradient-to-b from-green-50 via-emerald-50 to-teal-50',
    messageColors: {
      sent: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      received: 'bg-white text-gray-900 border-green-200'
    },
    heartColor: 'text-green-500',
    description: 'Natural forest theme'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    gradient: 'bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900',
    messageColors: {
      sent: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
      received: 'bg-gray-800 text-gray-100 border-gray-700'
    },
    heartColor: 'text-purple-400',
    description: 'Dark mode for evening chats'
  }
]

export const COUPLE_EMOJIS = [
  // Love & Hearts
  '❤️', '💕', '💖', '💗', '💘', '💝', '💞', '💟', '♥️', '💌',
  // Faces & Expressions
  '😍', '🥰', '😘', '😗', '☺️', '😊', '🤗', '🤩', '😋', '😏',
  // Gestures & Symbols
  '💋', '👑', '💐', '🌹', '🌺', '🌸', '🌷', '🌻', '✨', '💫',
  // Special Couple Emojis
  '👫', '💑', '👰', '🤵', '💒', '🎊', '🎉', '🎁', '🍾', '🥂'
]

export interface Anniversary {
  type: 'first_message' | 'one_week' | 'one_month' | 'three_months' | 'six_months' | 'one_year' | 'custom'
  date: string
  title: string
  description: string
  emoji: string
  unlocked: boolean
}

export const RELATIONSHIP_MILESTONES = {
  first_message: {
    title: 'First Message',
    description: 'Your very first conversation',
    emoji: '💬',
    requiredMessages: 1
  },
  getting_started: {
    title: 'Getting to Know You',
    description: 'Reached 10 messages',
    emoji: '👋',
    requiredMessages: 10
  },
  chatty: {
    title: 'Chatty Friends',
    description: 'Exchanged 50 messages',
    emoji: '💭',
    requiredMessages: 50
  },
  century: {
    title: 'Century Club',
    description: 'Amazing! 100 messages together',
    emoji: '💯',
    requiredMessages: 100
  },
  dedicated: {
    title: 'Dedicated Duo',
    description: 'Incredible! 500 messages',
    emoji: '🏆',
    requiredMessages: 500
  },
  inseparable: {
    title: 'Inseparable',
    description: 'Wow! 1000+ messages',
    emoji: '👑',
    requiredMessages: 1000
  }
}

export const STREAK_REWARDS = {
  3: { title: 'Getting Started', emoji: '🔥', description: '3 day streak!' },
  7: { title: 'One Week Strong', emoji: '⭐', description: 'A whole week!' },
  14: { title: 'Two Week Champions', emoji: '🌟', description: 'Two weeks of daily chats!' },
  30: { title: 'Monthly Masters', emoji: '👑', description: 'One month streak - amazing!' },
  60: { title: 'Unstoppable', emoji: '💎', description: 'Two months of daily connection!' },
  100: { title: 'Legendary', emoji: '🏆', description: '100 days - you two are incredible!' }
}

export function getThemeById(themeId: string): CoupleTheme {
  return COUPLE_THEMES.find(theme => theme.id === themeId) || COUPLE_THEMES[0]
}

export function calculateAnniversary(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function getAvailableMilestones(messageCount: number) {
  return Object.entries(RELATIONSHIP_MILESTONES)
    .filter(([_, milestone]) => messageCount >= milestone.requiredMessages)
    .map(([key, milestone]) => ({ id: key, ...milestone }))
}

export function getNextMilestone(messageCount: number) {
  const milestones = Object.entries(RELATIONSHIP_MILESTONES)
  const next = milestones.find(([_, milestone]) => messageCount < milestone.requiredMessages)
  
  if (next) {
    const [key, milestone] = next
    return {
      id: key,
      ...milestone,
      progress: messageCount,
      remaining: milestone.requiredMessages - messageCount
    }
  }
  
  return null
}

export function formatStreakMessage(days: number): string {
  if (days === 1) return "Started your streak! 🔥"
  if (days < 7) return `${days} day streak! Keep it going! 🔥`
  if (days < 30) return `${days} day streak! You two are amazing! ⭐`
  if (days < 100) return `${days} day streak! Absolutely incredible! 👑`
  return `${days} day streak! You're legends! 🏆`
}

export const HEART_REACTION_TYPES = [
  { emoji: '❤️', name: 'Love', color: 'text-red-500' },
  { emoji: '💕', name: 'Hearts', color: 'text-pink-500' },
  { emoji: '😍', name: 'Heart Eyes', color: 'text-yellow-500' },
  { emoji: '🥰', name: 'Smiling Hearts', color: 'text-rose-500' },
  { emoji: '💖', name: 'Sparkling Heart', color: 'text-purple-500' }
]