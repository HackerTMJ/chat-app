'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface RoomShareProps {
  roomCode: string
  roomName: string
}

export function RoomShare({ roomCode, roomName }: RoomShareProps) {
  const [copied, setCopied] = useState(false)
  
  const inviteUrl = `${window.location.origin}/join?code=${roomCode}`
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }
  
  const shareViaWebShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Join ${roomName} on Chat App`,
          text: `You're invited to join "${roomName}" on Chat App!`,
          url: inviteUrl
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to copying
      copyToClipboard(inviteUrl)
    }
  }
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">📤 Share this room</h4>
      
      <div className="space-y-3">
        {/* Room Code */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Room Code
          </label>
          <div className="flex gap-2">
            <code className="flex-1 p-2 bg-white border border-gray-300 rounded text-sm font-mono">
              {roomCode}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(roomCode)}
              className="px-3"
            >
              {copied ? '✓' : 'Copy'}
            </Button>
          </div>
        </div>
        
        {/* Invite Link */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Invite Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              title="Invite link for this room"
              className="flex-1 p-2 bg-white border border-gray-300 rounded text-sm text-gray-600"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(inviteUrl)}
              className="px-3"
            >
              {copied ? '✓' : 'Copy'}
            </Button>
          </div>
        </div>
        
        {/* Share Button */}
        <Button
          onClick={shareViaWebShare}
          className="w-full"
          size="sm"
        >
          {typeof navigator !== 'undefined' && 'share' in navigator ? '📱 Share' : '📋 Copy Link'}
        </Button>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        💡 Anyone with this code or link can join the room
      </div>
    </div>
  )
}
