'use client'

import { UserStatus } from '@/lib/hooks/useUserStatus'

interface StatusIndicatorProps {
  status: UserStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const STATUS_CONFIG = {
  online: { color: 'bg-green-500', label: 'Online' },
  away: { color: 'bg-yellow-500', label: 'Away' },
  busy: { color: 'bg-red-500', label: 'Busy' },
  offline: { color: 'bg-gray-500', label: 'Offline' }
}

const SIZE_CONFIG = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false, 
  className = '' 
}: StatusIndicatorProps) {
  const statusInfo = STATUS_CONFIG[status]
  const sizeClass = SIZE_CONFIG[size]

  if (showLabel) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClass} rounded-full ${statusInfo.color}`} />
        <span className="text-xs text-secondary">{statusInfo.label}</span>
      </div>
    )
  }

  return (
    <div 
      className={`${sizeClass} rounded-full ${statusInfo.color} ${className}`}
      title={statusInfo.label}
    />
  )
}