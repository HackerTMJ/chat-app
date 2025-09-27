

'use client'

import { useState, useEffect } from 'react'
import { X, User, Volume2, Image, Bell, Shield, Palette } from 'lucide-react'
import { SoundSettingsPanel } from './SoundSettings'
import Avatar from './Avatar'
import { AvatarUpload } from './AvatarUpload'
import { createClient } from '@/lib/supabase/client'

interface SettingsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'advanced'

export function SettingsDashboard({ isOpen, onClose }: SettingsDashboardProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getCurrentUser()
  }, [supabase])

  if (!isOpen) return null

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User, description: 'Avatar, username, and profile settings' },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell, description: 'Sound alerts and notification preferences' },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Palette, description: 'Theme, display, and visual preferences' },
    { id: 'privacy' as SettingsTab, label: 'Privacy', icon: Shield, description: 'Privacy and security settings' },
    { id: 'advanced' as SettingsTab, label: 'Advanced', icon: Volume2, description: 'Advanced configuration options' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Close settings"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={20} className="mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Avatar
                email={user?.email}
                avatarUrl={user?.user_metadata?.avatar_url}
                username={user?.user_metadata?.username || user?.email || 'User'}
                userId={user?.id}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.user_metadata?.username || user?.email || 'User'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {(() => {
                const activeTabConfig = tabs.find(tab => tab.id === activeTab)
                const Icon = activeTabConfig?.icon || User
                return (
                  <>
                    <Icon size={24} className="text-gray-700 dark:text-gray-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {activeTabConfig?.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTabConfig?.description}
                      </p>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'profile' && <ProfileSettings user={user} />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'advanced' && <AdvancedSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Profile Settings Component
function ProfileSettings({ user }: { user: any }) {
  const [username, setUsername] = useState(user?.user_metadata?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  
  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Profile Picture
        </h4>
        <AvatarUpload
          userId={user?.id}
          currentAvatarUrl={user?.user_metadata?.avatar_url}
          username={user?.user_metadata?.username || user?.email}
          email={user?.email}
          onAvatarUpdated={(newUrl) => {
            // Refresh the page or update local state
            window.location.reload()
          }}
          size="lg"
        />
      </div>

      {/* Basic Info Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Basic Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter your username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter your email"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Save Changes
        </button>
      </div>
    </div>
  )
}

// Notification Settings Component
function NotificationSettings() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Sound Notifications
        </h4>
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
          <SoundSettingsPanel />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Push Notifications
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">New Messages</h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when you receive new messages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Appearance Settings Component
function AppearanceSettings() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Theme Preferences
        </h4>
        <div className="grid grid-cols-3 gap-4">
          {['Light', 'Dark', 'System'].map((theme) => (
            <button
              key={theme}
              className="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className={`w-full h-20 rounded-lg mb-3 ${
                theme === 'Light' ? 'bg-white border' : 
                theme === 'Dark' ? 'bg-gray-800' : 'bg-gradient-to-r from-white to-gray-800'
              }`}></div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{theme}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Privacy Settings Component
function PrivacySettings() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Privacy Controls
        </h4>
        <div className="space-y-4">
          {[
            { title: 'Show Online Status', description: 'Let others see when you\'re online' },
            { title: 'Read Receipts', description: 'Show when you\'ve read messages' },
            { title: 'Profile Visibility', description: 'Allow others to see your profile' }
          ].map((setting) => (
            <div key={setting.title} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white">{setting.title}</h5>
                <p className="text-sm text-gray-500 dark:text-gray-400">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Advanced Settings Component
function AdvancedSettings() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Cache & Storage
        </h4>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Clear Cache</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Clear cached messages, images, and other data to free up storage space
            </p>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
              Clear All Cache
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Data Export
        </h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Export Your Data</h5>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Download a copy of your chat history and profile data
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Request Data Export
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsDashboard