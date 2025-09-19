'use client'

import { UserPresence } from '@/lib/hooks/usePresence'

interface OnlineUsersProps {
  users: UserPresence[]
  currentUserId: string
}

export function OnlineUsers({ users, currentUserId }: OnlineUsersProps) {
  const onlineCount = users.length
  
  if (onlineCount === 0) {
    return null
  }
  
  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <h3 className="text-sm font-medium text-gray-700">
          Online ({onlineCount})
        </h3>
      </div>
      
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              {user.username[0]?.toUpperCase() || '?'}
            </div>
            <span className={`truncate ${
              user.user_id === currentUserId ? 'font-medium text-blue-600' : 'text-gray-600'
            }`}>
              {user.user_id === currentUserId ? 'You' : user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
