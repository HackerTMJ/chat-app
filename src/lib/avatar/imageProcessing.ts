/**
 * Resize an image file to specified dimensions while maintaining aspect ratio
 */
export function resizeImage(file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }

          // Create new file with resized image
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })

          resolve(resizedFile)
        },
        file.type,
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Create a square crop of an image centered on the original
 */
export function cropToSquare(file: File, size: number = 300, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      const { width, height } = img
      const minDimension = Math.min(width, height)
      
      // Calculate crop area (centered)
      const cropX = (width - minDimension) / 2
      const cropY = (height - minDimension) / 2

      // Set canvas to square dimensions
      canvas.width = size
      canvas.height = size

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        cropX, cropY, minDimension, minDimension, // Source rectangle
        0, 0, size, size // Destination rectangle
      )

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }

          const croppedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })

          resolve(croppedFile)
        },
        file.type,
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File, maxSizeBytes: number = 5 * 1024 * 1024): { valid: boolean, error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Supported formats: JPEG, PNG, GIF, WebP' }
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = maxSizeBytes / (1024 * 1024)
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }

  return { valid: true }
}

/**
 * Create a preview URL for an image file
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Clean up a preview URL to prevent memory leaks
 */
export function cleanupImagePreview(url: string): void {
  URL.revokeObjectURL(url)
}