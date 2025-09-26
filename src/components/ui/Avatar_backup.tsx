/**
 * Avatar component with Gravatar integration and fallbacks
 * Supports email-based Gravatar, uploaded images, and generated fallbacks
 * Includes profile image caching for improved performance
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
      loadingImageRequests.get(userId)?.then((url) => {
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
// Global map to track loading requests and prevent duplicates
const loadingImageRequests = new Map<string, Promise<string | null>>()

/**
 * Custom hook for cached image loading with deduplication
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
      loadingImageRequests.get(userId)?.then((url) => {
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
  username = 'User', 
  userId,
  size = 'md', 
  className = '',
  showFallback = true 
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const sizeClasses = sizeMap[size]
  const pixelSize = pixelSizeMap[size]
  
  // Use cached image when available
  const { cachedImageUrl, isLoadingCache } = useCachedImage(userId, avatarUrl)
  
  // Reset error state when props change
  useEffect(() => {
    setImageError(false)
    setLoading(true)
  }, [email, avatarUrl, cachedImageUrl])

  // Determine image source priority:
  // 1. Cached custom avatar URL (if available)
  // 2. Custom uploaded avatar URL
  // 3. Gravatar from email
  // 4. Fallback to initials
  const getImageSrc = (): string | null => {
    // Use cached image if available
    if (cachedImageUrl && !imageError) {
      return cachedImageUrl
    }
    
    if (avatarUrl && !imageError) {
      return avatarUrl
    }
    
    if (email && !imageError) {
      return getGravatarUrl(email, pixelSize)
    }
    
    return null
  }

  const imageSrc = getImageSrc()
  const initials = getInitials(username)
  const bgColor = getBackgroundColor(username)

  const handleImageLoad = () => {
    setLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setLoading(false)
  }

  return (
    <div 
      className={`${sizeClasses.wrapper} rounded-full overflow-hidden flex items-center justify-center ${className}`}
      title={username}
    >
      {imageSrc && !imageError ? (
        <Image
          src={imageSrc}
          alt={`${username}'s avatar`}
          width={pixelSize}
          height={pixelSize}
          className={`${sizeClasses.image} rounded-full object-cover ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          unoptimized={imageSrc.includes('gravatar.com')} // Don't optimize external Gravatar images
        />
      ) : showFallback ? (
        // Fallback: Show initials with colored background
        <div className={`${sizeClasses.wrapper} ${bgColor} flex items-center justify-center rounded-full`}>
          <span className={`${sizeClasses.text} font-semibold text-white`}>
            {initials}
          </span>
        </div>
      ) : (
        // Fallback: Show user icon
        <div className={`${sizeClasses.wrapper} bg-gray-300 flex items-center justify-center rounded-full`}>
          <User className={`${sizeClasses.icon} text-gray-600`} />
        </div>
      )}
      
      {/* Loading spinner */}
      {loading && imageSrc && (
        <div className={`absolute ${sizeClasses.wrapper} bg-gray-200 rounded-full flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
        </div>
      )}
    </div>
  )
}

export default Avatar