/**
 * Profile Settings component for managing user profile information
 */

'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Edit3, Save, X, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AvatarUpload } from '@/components/ui/AvatarUpload'

interface ProfileSettingsProps {
  userId: string
  onClose?: () => void
  className?: string
}

interface UserProfile {
  id: string
  username: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
}

export function ProfileSettings({ userId, onClose, className = '' }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUsername, setEditedUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setError('Failed to load profile')
        return
      }

      setProfile(data)
      setEditedUsername(data.username || '')
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUsernameUpdate = async () => {
    if (!profile || editedUsername.trim() === profile.username) {
      setIsEditing(false)
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase
        .from('profiles')
        .update({ username: editedUsername.trim() })
        .eq('id', userId)

      if (error) {
        console.error('Error updating username:', error)
        setError('Failed to update username')
        return
      }

      setProfile(prev => prev ? { ...prev, username: editedUsername.trim() } : null)
      setIsEditing(false)
      setSuccessMessage('Username updated successfully!')
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error updating username:', error)
      setError('Failed to update username')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpdated = (newAvatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null)
    setSuccessMessage('Avatar updated successfully!')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Profile Settings</h2>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Profile Settings</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load profile</p>
          <button 
            onClick={loadProfile}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm">
          {successMessage}
        </div>
      )}

      {/* Avatar Upload Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Picture</h3>
        <AvatarUpload
          userId={profile.id}
          currentAvatarUrl={profile.avatar_url}
          username={profile.username || 'User'}
          email={profile.email || undefined}
          onAvatarUpdated={handleAvatarUpdated}
          size="lg"
          className="items-center"
        />
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Information</h3>

        {/* Username */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <User className="w-4 h-4" />
            Username
          </label>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                  disabled={saving}
                />
                <button
                  onClick={handleUsernameUpdate}
                  disabled={saving}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  title="Save username"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedUsername(profile.username || '')
                    setError(null)
                  }}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {profile.username || 'Not set'}
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Edit username"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
            {profile.email || 'Not available'}
          </div>
          <p className="text-xs text-gray-500">Email cannot be changed here</p>
        </div>

        {/* Member Since */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Member Since
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
            {formatDate(profile.created_at)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings