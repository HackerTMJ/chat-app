'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { notificationManager } from '@/lib/notifications/NotificationManager'

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    // Check if we should show the prompt
    const checkShouldShowPrompt = () => {
      if (typeof window === 'undefined') return false
      
      const permissionState = notificationManager.getPermissionState()
      const hasBeenDismissed = localStorage.getItem('notification-prompt-dismissed')
      
      // Show prompt if:
      // - Notifications are supported
      // - Permission is default (not granted or denied)
      // - User hasn't permanently dismissed it
      return permissionState.supported && 
             permissionState.permission === 'default' && 
             !hasBeenDismissed
    }

    // Delay showing the prompt to not be too intrusive
    const timer = setTimeout(() => {
      setShowPrompt(checkShouldShowPrompt())
    }, 3000) // Wait 3 seconds after page load

    return () => clearTimeout(timer)
  }, [])

  const handleAllowNotifications = async () => {
    setIsRequesting(true)
    // Mark that user has shown interest in notifications
    localStorage.setItem('notification-interest-shown', 'true')
    
    try {
      const result = await notificationManager.requestPermission()
      if (result.permission === 'granted') {
        // Show welcome notification
        await notificationManager.showNotification({
          title: 'Notifications Enabled! 🎉',
          body: 'You\'ll receive notifications for new messages when the app is in the background.',
          tag: 'welcome-notification',
          icon: '/icon-192x192.png'
        })
        setShowPrompt(false)
      } else if (result.permission === 'denied') {
        // User denied, hide prompt
        setShowPrompt(false)
        localStorage.setItem('notification-prompt-dismissed', 'true')
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't ask again for this session
    sessionStorage.setItem('notification-prompt-dismissed-session', 'true')
  }

  const handleNeverAsk = () => {
    setShowPrompt(false)
    // Permanently dismiss (until localStorage is cleared)
    localStorage.setItem('notification-prompt-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-xl border border-blue-400">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell size={20} className="text-white mt-0.5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Stay Connected! 🔔
            </h3>
            <p className="text-blue-100 text-xs leading-relaxed mb-3">
              Enable notifications to get instant alerts for new messages when you're away from the chat.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAllowNotifications}
                disabled={isRequesting}
                className="bg-white text-blue-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-70 flex items-center gap-1"
              >
                {isRequesting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    Requesting...
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    Allow Notifications
                  </>
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-blue-100 hover:text-white px-2 py-1.5 rounded text-xs transition-colors"
              >
                Not Now
              </button>
              
              <button
                onClick={handleNeverAsk}
                className="text-blue-200 hover:text-blue-100 px-2 py-1.5 rounded text-xs transition-colors"
              >
                Never Ask
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
            title="Close notification prompt"
            aria-label="Close notification prompt"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}