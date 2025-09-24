'use client'

import { useState, useEffect } from 'react'
import { notificationManager, NotificationPermissionState } from '@/lib/notifications/NotificationManager'
import { Bell, BellOff, Settings, Check, X, AlertCircle } from 'lucide-react'

export function NotificationSettings() {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    permission: 'default',
    supported: false,
    serviceWorkerReady: false
  })
  const [isRequesting, setIsRequesting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    // Initial state
    setPermissionState(notificationManager.getPermissionState())

    // Check permission state periodically
    const interval = setInterval(() => {
      setPermissionState(notificationManager.getPermissionState())
    }, 1000)

    return () => clearInterval(interval)
  }, [refreshTrigger]) // Add refreshTrigger to dependencies

  const handleRequestPermission = async () => {
    if (!permissionState.supported) {
      alert('Notifications are not supported in your browser')
      return
    }

    setIsRequesting(true)
    try {
      const result = await notificationManager.requestPermission()
      setPermissionState(result)
      
      if (result.permission === 'granted') {
        // Show test notification
        await notificationManager.showNotification({
          title: 'Notifications Enabled!',
          body: 'You\'ll now receive notifications for new messages when the app is in the background.',
          tag: 'permission-granted'
        })
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
      alert('Failed to request notification permission')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await notificationManager.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from your chat app!',
        tag: 'test-notification'
      })
    } catch (error) {
      console.error('Error showing test notification:', error)
      alert('Failed to show test notification')
    }
  }

  const getPermissionStatus = () => {
    if (!permissionState.supported) {
      return { color: 'text-gray-500', text: 'Not Supported', icon: X }
    }
    
    switch (permissionState.permission) {
      case 'granted':
        return { color: 'text-green-600', text: 'Enabled', icon: Check }
      case 'denied':
        return { color: 'text-red-600', text: 'Blocked', icon: X }
      default:
        return { color: 'text-yellow-600', text: 'Not Set', icon: AlertCircle }
    }
  }

  const status = getPermissionStatus()
  const StatusIcon = status.icon

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        title="Notification Settings"
      >
        {permissionState.permission === 'granted' ? (
          <Bell className="w-5 h-5 text-green-600" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-500" />
        )}
        
        {/* Status indicator dot */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          permissionState.permission === 'granted' ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      </button>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              <h3 className="font-semibold">Notification Settings</h3>
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium">Status:</span>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${status.color}`} />
                <span className={`text-sm ${status.color}`}>{status.text}</span>
              </div>
            </div>

            {/* Browser Support Info */}
            <div className="mb-4 text-xs text-gray-600 dark:text-gray-400">
              <div>Browser Support: {permissionState.supported ? '✅ Yes' : '❌ No'}</div>
              <div>Service Worker: {permissionState.serviceWorkerReady ? '✅ Ready' : '⏳ Loading'}</div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {permissionState.permission === 'default' && (
                <button
                  onClick={handleRequestPermission}
                  disabled={isRequesting || !permissionState.supported}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRequesting ? 'Requesting...' : 'Enable Notifications'}
                </button>
              )}

              {permissionState.permission === 'granted' && (
                <>
                  <button
                    onClick={handleTestNotification}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Send Test Notification
                  </button>
                  
                  {/* Show when focused toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Show when app is focused</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Get notifications even when you're looking at the chat</div>
                    </div>
                    <button
                      onClick={() => {
                        const settings = notificationManager.getSettings()
                        notificationManager.updateSettings({ showWhenFocused: !settings.showWhenFocused })
                        setRefreshTrigger(prev => prev + 1) // Force re-render
                      }}
                      title={`${notificationManager.getSettings().showWhenFocused ? 'Disable' : 'Enable'} notifications when app is focused`}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notificationManager.getSettings().showWhenFocused
                          ? 'bg-green-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        notificationManager.getSettings().showWhenFocused
                          ? 'translate-x-6' 
                          : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </>
              )}

              {permissionState.permission === 'denied' && (
                <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="font-medium text-red-700 dark:text-red-400 mb-1">Notifications Blocked</p>
                  <p>To enable notifications:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Change notifications to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Feature Description */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified when you receive new messages while the chat app is in the background or minimized.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}