/**
 * Avatar upload utilities for handling profile picture uploads to Supabase Storage
 */

import { createClient } from '@/lib/supabase/client'

export interface UploadAvatarOptions {
  file: File
  userId: string
  maxSize?: number // in bytes
  allowedTypes?: string[]
}

export interface UploadResult {
  success: boolean
  publicUrl?: string
  error?: string
}

// Default configuration
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
]

/**
 * Resize image to specified dimensions while maintaining aspect ratio
 */
export async function resizeImage(
  file: File, 
  maxWidth: number = 200, 
  maxHeight: number = 200, 
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
      const newWidth = img.width * ratio
      const newHeight = img.height * ratio

      canvas.width = newWidth
      canvas.height = newHeight

      // Draw and resize image
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to resize image'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate uploaded file
 */
export function validateAvatarFile(
  file: File,
  maxSize: number = DEFAULT_MAX_SIZE,
  allowedTypes: string[] = DEFAULT_ALLOWED_TYPES
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
    }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar({
  file,
  userId,
  maxSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES
}: UploadAvatarOptions): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Validate file
    const validation = validateAvatarFile(file, maxSize, allowedTypes)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Resize image for optimization
    const resizedBlob = await resizeImage(file)
    
    // Create filename with timestamp to avoid caching issues
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}_${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, resizedBlob, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    if (!urlData.publicUrl) {
      return {
        success: false,
        error: 'Failed to get public URL'
      }
    }

    return {
      success: true,
      publicUrl: urlData.publicUrl
    }

  } catch (error) {
    console.error('Avatar upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update user's avatar URL in the database
 */
export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)

    if (error) {
      console.error('Database update error:', error)
      return {
        success: false,
        error: `Failed to update profile: ${error.message}`
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Update avatar error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Remove old avatar from storage (cleanup)
 */
export async function removeOldAvatar(avatarUrl: string): Promise<void> {
  try {
    const supabase = createClient()
    
    // Extract filename from URL
    const urlParts = avatarUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    if (fileName && fileName.includes('_')) {
      await supabase.storage
        .from('avatars')
        .remove([fileName])
    }
  } catch (error) {
    console.error('Error removing old avatar:', error)
    // Don't throw - this is cleanup, not critical
  }
}