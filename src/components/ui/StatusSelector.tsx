'use client'

import { useState } from 'react'
import { ChevronDown, Circle } from 'lucide-react'
import { useUserStatus, UserStatus } from '@/lib/hooks/useUserStatus'

interface StatusSelectorProps {
  currentUser: any
}

const STATUS_OPTIONS = [
  { value: 'online' as UserStatus, label: 'Online', color: 'bg-green-500', description: 'Available to chat' },
  { value: 'away' as UserStatus, label: 'Away', color: 'bg-yellow-500', description: 'Idle or away from keyboard' },
  { value: 'busy' as UserStatus, label: 'Busy', color: 'bg-red-500', description: 'Do not disturb' },
  { value: 'offline' as UserStatus, label: 'Offline', color: 'bg-gray-500', description: 'Appear offline' }
]

export function StatusSelector({ currentUser }: StatusSelectorProps) {
  const { userStatus, updateStatus } = useUserStatus(currentUser)
  const [isOpen, setIsOpen] = useState(false)

  const currentStatusInfo = STATUS_OPTIONS.find(status => status.value === userStatus)

  const handleStatusChange = async (newStatus: UserStatus) => {
    await updateStatus(newStatus)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 btn-secondary rounded-lg transition-all duration-200 hover:bg-primary/10 w-full"
      >
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-3 h-3 rounded-full ${currentStatusInfo?.color}`} />
          <span className="text-sm font-medium text-primary">{currentStatusInfo?.label}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full card border shadow-xl rounded-xl p-2 z-50 min-w-[200px]">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                userStatus === status.value 
                  ? 'bg-blue-500/20 border border-blue-500/50' 
                  : 'hover:bg-primary/10'
              }`}
            >
              <div className={`w-3 h-3 rounded-full mt-1 ${status.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-primary">{status.label}</div>
                <div className="text-xs text-muted">{status.description}</div>
              </div>
              {userStatus === status.value && (
                <Circle size={12} className="text-blue-500 fill-current mt-1" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}