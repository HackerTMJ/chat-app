/**
 * Avatar Upload component for uploading and managing profile pictures
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Camera, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { uploadAvatar, updateUserAvatar, removeOldAvatar, validateAvatarFile } from '@/lib/avatars/upload'
import { Avatar } from '@/components/ui/Avatar'
import { cacheSystem } from '@/lib/cache/CacheSystemManager'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  username?: string
  email?: string
  onAvatarUpdated?: (newAvatarUrl: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { 
    wrapper: 'w-16 h-16', 
    button: 'w-6 h-6', 
    icon: 'w-3 h-3',
    upload: 'w-12 h-12'
  },
  md: { 
    wrapper: 'w-24 h-24', 
    button: 'w-8 h-8', 
    icon: 'w-4 h-4',
    upload: 'w-16 h-16'
  },
  lg: { 
    wrapper: 'w-32 h-32', 
    button: 'w-10 h-10', 
    icon: 'w-5 h-5',
    upload: 'w-20 h-20'
  }
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  username,
  email,
  onAvatarUpdated,
  className = '',
  size = 'md'
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sizeClasses = sizeMap[size]

  const resetStatus = () => {
    setUploadStatus({ type: null, message: '' })
  }

  const handleFileSelect = useCallback(async (file: File) => {
    resetStatus()
    
    // Validate file first
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setUploadStatus({
        type: 'error',
        message: validation.error || 'Invalid file'
      })
      return
    }

    // Show preview
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    
    // Upload file
    setIsUploading(true)
    
    try {
      // Upload to Supabase Storage
      const uploadResult = await uploadAvatar({
        file,
        userId
      })

      if (!uploadResult.success) {
        setUploadStatus({
          type: 'error',
          message: uploadResult.error || 'Upload failed'
        })
        setPreviewUrl(null)
        return
      }

      // Update user profile in database
      const updateResult = await updateUserAvatar(userId, uploadResult.publicUrl!)
      
      if (!updateResult.success) {
        setUploadStatus({
          type: 'error',
          message: updateResult.error || 'Failed to update profile'
        })
        return
      }

      // Clean up old avatar if it exists
      if (currentAvatarUrl && currentAvatarUrl.includes('supabase')) {
        await removeOldAvatar(currentAvatarUrl)
      }

      // Clear cached image to force refresh
      cacheSystem.removeCachedProfileImage(userId)

      setUploadStatus({
        type: 'success',
        message: 'Avatar updated successfully!'
      })

      // Notify parent component
      onAvatarUpdated?.(uploadResult.publicUrl!)

      // Clear preview after success
      setTimeout(() => {
        setPreviewUrl(null)
        resetStatus()
      }, 2000)

    } catch (error) {
      console.error('Avatar upload error:', error)
      setUploadStatus({
        type: 'error',
        message: 'An unexpected error occurred'
      })
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }, [userId, currentAvatarUrl, onAvatarUpdated])

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Avatar Preview */}
      <div 
        className={`relative ${sizeClasses.wrapper} group`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Main Avatar */}
        <Avatar
          userId={userId}
          avatarUrl={previewUrl || currentAvatarUrl}
          username={username}
          email={email}
          size={size === 'sm' ? 'lg' : size === 'md' ? 'xl' : 'xl'}
          className={`${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''} transition-all duration-200`}
        />

        {/* Upload Button Overlay */}
        <div className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUploading ? 'opacity-100' : ''}`}>
          {isUploading ? (
            <Loader2 className={`${sizeClasses.icon} text-white animate-spin`} />
          ) : (
            <button
              onClick={handleButtonClick}
              className="text-white hover:text-blue-300 transition-colors"
              disabled={isUploading}
              title="Upload new avatar"
              aria-label="Upload new avatar"
            >
              <Camera className={sizeClasses.icon} />
            </button>
          )}
        </div>

        {/* Status Indicator */}
        {uploadStatus.type && (
          <div className={`absolute -top-2 -right-2 ${sizeClasses.button} rounded-full flex items-center justify-center ${
            uploadStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {uploadStatus.type === 'success' ? (
              <Check className={sizeClasses.icon} />
            ) : (
              <AlertCircle className={sizeClasses.icon} />
            )}
          </div>
        )}

        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-full flex items-center justify-center">
            <Upload className={sizeClasses.icon} />
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm ${
            isUploading ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Avatar
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center max-w-xs">
          Click to upload or drag & drop<br />
          JPG, PNG, WebP, GIF (max 5MB)
        </p>
      </div>

      {/* Status Message */}
      {uploadStatus.message && (
        <div className={`text-sm text-center max-w-xs ${
          uploadStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {uploadStatus.message}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select avatar image file"
        title="Select avatar image file"
      />
    </div>
  )
}

export default AvatarUpload