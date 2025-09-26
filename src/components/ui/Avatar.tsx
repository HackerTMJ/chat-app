/**
 * Avatar component with Gravatar integration and fallbacks
 * Supports email-based Gravatar, uploaded images, and generated fallbacks
 * Includes profile image caching for improved performance with deduplication
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import CryptoJS from 'crypto-js'
import { cacheSystem } from '@/lib/cache/CacheSystemManager'

interface AvatarProps {
  email?: string
  avatarUrl?: string | null
  username?: string
  userId?: string // For caching
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showFallback?: boolean
}

const sizeMap = {
  xs: { wrapper: 'w-6 h-6', image: 'w-6 h-6', text: 'text-xs', icon: 'w-3 h-3' },
  sm: { wrapper: 'w-8 h-8', image: 'w-8 h-8', text: 'text-sm', icon: 'w-4 h-4' },
  md: { wrapper: 'w-10 h-10', image: 'w-10 h-10', text: 'text-base', icon: 'w-5 h-5' },
  lg: { wrapper: 'w-12 h-12', image: 'w-12 h-12', text: 'text-lg', icon: 'w-6 h-6' },
  xl: { wrapper: 'w-16 h-16', image: 'w-16 h-16', text: 'text-xl', icon: 'w-8 h-8' }
}

const pixelSizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64
}

// Global map to track loading requests and prevent duplicates
const loadingImageRequests = new Map<string, Promise<string | null>>()

/**
 * Generate Gravatar URL from email using proper MD5
 */
function getGravatarUrl(email: string, size: number = 80): string {
  const cleanEmail = email.toLowerCase().trim()
  const hash = CryptoJS.MD5(cleanEmail).toString()
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=g`
}

/**
 * Generate initials from username
 */
function getInitials(username: string): string {
  return username
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Generate a consistent background color based on username
 */
function getBackgroundColor(username: string): string {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'
  ]
  
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Custom hook for cached image loading with deduplication
 * Prevents multiple simultaneous requests for the same avatar
 */
function useCachedImage(userId: string | undefined, imageUrl: string | null | undefined) {
  const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null)
  const [isLoadingCache, setIsLoadingCache] = useState(false)

  useEffect(() => {
    if (!userId || !imageUrl) {
      setCachedImageUrl(null)
      return
    }

    // Check if image is already cached
    const cachedUrl = cacheSystem.getCachedProfileImageUrl(userId)
    if (cachedUrl) {
      setCachedImageUrl(cachedUrl)
      return
    }

    // Check if this image is already being loaded to prevent duplicates
    if (loadingImageRequests.has(userId)) {
      // Wait for the existing request to complete
      loadingImageRequests.get(userId)?.then((url: string | null) => {
        if (url) {
          setCachedImageUrl(url)
        }
      })
      return
    }

    // Load and cache the image
    const loadAndCacheImage = async (): Promise<string | null> => {
      setIsLoadingCache(true)
      try {
        const response = await fetch(imageUrl)
        if (response.ok) {
          const blob = await response.blob()
          await cacheSystem.cacheProfileImage(userId, imageUrl, blob)
          
          const newCachedUrl = cacheSystem.getCachedProfileImageUrl(userId)
          setCachedImageUrl(newCachedUrl)
          return newCachedUrl
        }
      } catch (error) {
        console.error('Failed to cache profile image:', error)
      } finally {
        setIsLoadingCache(false)
        // Remove from loading requests
        loadingImageRequests.delete(userId)
      }
      return null
    }

    // Store the promise to prevent duplicate requests
    const loadingPromise = loadAndCacheImage()
    loadingImageRequests.set(userId, loadingPromise)

  }, [userId, imageUrl])

  return { cachedImageUrl, isLoadingCache }
}

export function Avatar({ 
  email, 
  avatarUrl, 
  username, 
  userId,
  size = 'md', 
  className = '',
  showFallback = true
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const sizes = sizeMap[size]
  const pixelSize = pixelSizeMap[size]

  // Use caching hook for profile images
  const { cachedImageUrl, isLoadingCache } = useCachedImage(userId, avatarUrl)

  // Reset image error when URL changes
  useEffect(() => {
    setImageError(false)
  }, [email, avatarUrl, cachedImageUrl])

  // Determine the image source priority:
  // 1. Cached custom avatar URL (if available)
  // 2. Custom uploaded avatar URL
  // 3. Gravatar from email
  // 4. Fallback (initials or icon)
  const getImageSrc = (): string | null => {
    // Use cached image if available
    if (cachedImageUrl && !imageError) {
      return cachedImageUrl
    }
    
    if (avatarUrl && !imageError) {
      return avatarUrl
    }
    
    // Use Gravatar if email is provided
    if (email && !imageError) {
      return getGravatarUrl(email, pixelSize)
    }
    
    return null
  }

  const imageSrc = getImageSrc()
  const displayName = username || email || 'User'
  const initials = getInitials(displayName)
  const bgColor = getBackgroundColor(displayName)

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div className={`${sizes.wrapper} relative rounded-full overflow-hidden flex-shrink-0 ${className}`}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={`${username}'s avatar`}
          width={pixelSize}
          height={pixelSize}
          className={`${sizes.image} object-cover ${isLoadingCache ? 'opacity-75' : ''}`}
          onError={handleImageError}
          priority={size === 'lg' || size === 'xl'} // Prioritize larger avatars
          unoptimized={cachedImageUrl?.startsWith('data:') || false} // Don't optimize data URLs
        />
      ) : showFallback ? (
        <div className={`${sizes.wrapper} ${bgColor} flex items-center justify-center text-white font-semibold ${sizes.text}`}>
          {initials || (
            <User className={`${sizes.icon} text-white`} />
          )}
        </div>
      ) : (
        <div className={`${sizes.wrapper} bg-gray-300 dark:bg-gray-600 flex items-center justify-center`}>
          <User className={`${sizes.icon} text-gray-500 dark:text-gray-400`} />
        </div>
      )}
      
      {/* Loading indicator for cache operations */}
      {isLoadingCache && (
        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default Avatar