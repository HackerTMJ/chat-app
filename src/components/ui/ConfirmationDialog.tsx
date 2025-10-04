'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Info, Trash2, X, Check } from 'lucide-react'
import { Button } from './Button'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: 'delete' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'warning' | 'primary'
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant
}: ConfirmationDialogProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll when dialog is closed
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for animation to complete
  }

  const handleConfirm = () => {
    onConfirm()
    handleClose()
  }

  // Handle ESC key and backdrop click
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the dialog content
    if (e.target === e.currentTarget) {
      e.preventDefault()
      e.stopPropagation()
      handleClose()
    }
  }

  const handleDialogClick = (e: React.MouseEvent) => {
    // Prevent event bubbling to backdrop
    e.stopPropagation()
  }

  if (!isOpen) return null

  // Get icon and colors based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'delete':
        return {
          icon: <Trash2 size={24} className="text-red-500" />,
          headerBg: 'bg-gradient-to-r from-red-500 to-red-600',
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          defaultVariant: 'danger' as const
        }
      case 'warning':
        return {
          icon: <AlertTriangle size={24} className="text-yellow-500" />,
          headerBg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          defaultVariant: 'warning' as const
        }
      case 'info':
        return {
          icon: <Info size={24} className="text-blue-500" />,
          headerBg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          defaultVariant: 'primary' as const
        }
      default:
        return {
          icon: <AlertTriangle size={24} className="text-yellow-500" />,
          headerBg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          defaultVariant: 'warning' as const
        }
    }
  }

  const typeConfig = getTypeConfig()
  const variant = confirmVariant || typeConfig.defaultVariant

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Dialog */}
      <div 
        className={`relative w-full max-w-md transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={handleDialogClick}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className={`${typeConfig.headerBg} px-6 py-4`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${typeConfig.iconBg} rounded-lg`}>
                {typeConfig.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex gap-3 justify-end">
            <Button
              onClick={handleClose}
              variant="outline"
              size="sm"
              className="btn-secondary flex items-center gap-2"
            >
              <X size={14} />
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              variant="primary"
              size="sm"
              className={`flex items-center gap-2 ${
                variant === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                  : variant === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600'
                  : 'btn-primary'
              }`}
            >
              <Check size={14} />
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for easier usage
export function useConfirmation() {
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'delete' | 'warning' | 'info'
    confirmText: string
    cancelText: string
    resolve?: (value: boolean) => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  })

  const showConfirmation = ({
    title,
    message,
    type = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  }: {
    title: string
    message: string
    type?: 'delete' | 'warning' | 'info'
    confirmText?: string
    cancelText?: string
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        resolve
      })
    })
  }

  const handleConfirm = useCallback(() => {
    confirmationState.resolve?.(true)
    hideConfirmation()
  }, [confirmationState.resolve])

  const handleCancel = useCallback(() => {
    confirmationState.resolve?.(false)
    hideConfirmation()
  }, [confirmationState.resolve])

  const hideConfirmation = useCallback(() => {
    setConfirmationState(prev => ({
      ...prev,
      isOpen: false,
      resolve: undefined
    }))
  }, [])

  const ConfirmationComponent = useCallback(() => (
    <ConfirmationDialog
      isOpen={confirmationState.isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={confirmationState.title}
      message={confirmationState.message}
      type={confirmationState.type}
      confirmText={confirmationState.confirmText}
      cancelText={confirmationState.cancelText}
    />
  ), [confirmationState, handleCancel, handleConfirm])

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationComponent
  }
}