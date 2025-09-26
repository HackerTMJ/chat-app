import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const BUCKET_NAME = 'avatars'

export interface UploadAvatarResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload a user avatar to Supabase storage
 */
export async function uploadAvatar(userId: string, file: File): Promise<UploadAvatarResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`

    // Delete existing avatar if it exists
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName])

    // Upload new avatar
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { success: false, error: 'Failed to upload avatar' }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Avatar upload error:', error)
    return { success: false, error: 'Unexpected error during upload' }
  }
}

/**
 * Delete a user's avatar from storage
 */
export async function deleteAvatar(userId: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Try to delete common image extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const filesToDelete = extensions.map(ext => `${userId}/avatar.${ext}`)

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filesToDelete)

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: 'Failed to delete avatar' }
    }

    return { success: true }
  } catch (error) {
    console.error('Avatar delete error:', error)
    return { success: false, error: 'Unexpected error during deletion' }
  }
}

/**
 * Get the public URL for a user's uploaded avatar
 */
export function getUploadedAvatarUrl(userId: string, extension: string = 'jpg'): string {
  const fileName = `${userId}/avatar.${extension}`
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)
  
  return publicUrl
}

/**
 * Check if a user has an uploaded avatar
 */
export async function hasUploadedAvatar(userId: string): Promise<boolean> {
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    for (const ext of extensions) {
      const fileName = `${userId}/avatar.${ext}`
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId)
      
      if (data && data.some(file => file.name === `avatar.${ext}`)) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking avatar:', error)
    return false
  }
}