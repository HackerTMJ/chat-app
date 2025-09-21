// Cache Status Indicator - Shows cache performance and sync status
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/lib/stores/chat'
import { cacheManager } from '@/lib/cache/CacheManager'
import { Button } from '@/components/ui/Button'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface CacheMetrics {
  hitRate: number
  totalSize: number
  deduplicationSavings: number
  preloadQueueSize: number
  isOnline: boolean
  lastSync: Date | null
  pendingOperations: number
}

// Custom hook for click outside functionality
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, handler])
}

// Advanced SVG Icons
const DatabaseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const LightningIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const ChartBarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const RefreshIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const WifiOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v6m0 8v6m8-12h-6m-8 0H2" />
  </svg>
)

const WifiIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const DuplicateIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const QueueListIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

export function CacheStatusIndicator() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { cacheStatus, updateCacheStatus, clearCache } = useChatStore()
  const { theme } = useTheme()

  // Close panel when clicking outside
  useClickOutside(panelRef, () => {
    if (isExpanded) {
      setIsExpanded(false)
    }
  })

  useEffect(() => {
    // Update metrics every 5 seconds
    const updateMetrics = async () => {
      try {
        setIsLoading(true)
        const status = await cacheManager.getStatus()
        setMetrics({
          hitRate: status.metrics.hitRate,
          totalSize: status.metrics.totalSize,
          deduplicationSavings: status.metrics.deduplicationSavings,
          preloadQueueSize: status.metrics.preloadQueueSize,
          isOnline: status.isOnline,
          lastSync: status.syncStatus.lastSync,
          pendingOperations: status.syncStatus.pendingOperations
        })
        
        // Update store cache status
        await updateCacheStatus()
      } catch (error) {
        console.error('Failed to update cache metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)

    return () => clearInterval(interval)
  }, [updateCacheStatus])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1) + '%'
  }

  const getStatusColor = () => {
    if (!metrics) return 'bg-gray-500'
    
    if (!metrics.isOnline) return 'bg-orange-500'
    if (metrics.hitRate > 0.8) return 'bg-green-500'
    if (metrics.hitRate > 0.5) return 'bg-blue-500'
    return 'bg-red-500'
  }

  const getStatusIcon = () => {
    if (!metrics) return <DatabaseIcon />
    
    if (!metrics.isOnline) return <WifiOffIcon />
    if (metrics.hitRate > 0.8) return <LightningIcon />
    if (metrics.hitRate > 0.5) return <ChartBarIcon />
    return <RefreshIcon />
  }

  const getStatusText = () => {
    if (!metrics) return 'Loading...'
    
    if (!metrics.isOnline) return 'Offline Mode'
    if (metrics.hitRate > 0.8) return 'Excellent'
    if (metrics.hitRate > 0.5) return 'Good'
    return 'Needs Optimization'
  }

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cached data? This will remove offline content and reset performance optimizations.')) {
      setIsLoading(true)
      try {
        await clearCache()
        alert('Cache cleared successfully!')
      } catch (error) {
        alert('Failed to clear cache. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleOptimizeCache = async () => {
    setIsLoading(true)
    try {
      await cacheManager.optimizeCache()
      alert('Cache optimized successfully! Performance should improve.')
    } catch (error) {
      console.error('Failed to optimize cache:', error)
      alert('Failed to optimize cache. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Compact floating button
  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className={`group relative flex items-center gap-3 px-4 py-3 rounded-full text-white shadow-lg transition-all duration-300 hover:shadow-xl backdrop-blur-sm ${getStatusColor()} hover:scale-105`}
          title={`Cache: ${getStatusText()}`}
        >
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium leading-tight">Cache</span>
              <span className="text-xs opacity-90 leading-tight">{getStatusText()}</span>
            </div>
          </div>
          
          {isLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
          )}
        </button>
      </div>
    )
  }

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div 
        ref={panelRef}
        className={`rounded-2xl shadow-2xl overflow-hidden w-80 animate-in slide-in-from-bottom-2 duration-300 ${
          theme === 'dark' 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        } border`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor()} text-white`}>
                {getStatusIcon()}
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Cache Status
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Performance monitoring
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {metrics ? (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className={`p-4 rounded-2xl ${getStatusColor()} text-white`}>
                    {React.cloneElement(getStatusIcon(), { className: "w-8 h-8" })}
                  </div>
                </div>
                <h4 className={`text-xl font-bold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {getStatusText()}
                </h4>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Hit Rate: {formatPercentage(metrics.hitRate)} • {formatBytes(metrics.totalSize)}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`text-center p-4 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-100/50 border-gray-200/50'
                }`}>
                  <div className="flex justify-center mb-2">
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                    }`}>
                      <ChartBarIcon className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {formatPercentage(metrics.hitRate)}
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Cache Hits</div>
                </div>
                
                <div className={`text-center p-4 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-100/50 border-gray-200/50'
                }`}>
                  <div className="flex justify-center mb-2">
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    }`}>
                      <DatabaseIcon className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {formatBytes(metrics.totalSize)}
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Storage</div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="space-y-3">
                <div className={`flex justify-between items-center py-3 px-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-100/50 border-gray-200/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                    }`}>
                      <DuplicateIcon className={`w-4 h-4 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                    </div>
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Duplicates Saved</span>
                  </div>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {metrics.deduplicationSavings}
                  </span>
                </div>
                
                <div className={`flex justify-between items-center py-3 px-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-100/50 border-gray-200/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-100'
                    }`}>
                      <QueueListIcon className={`w-4 h-4 ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`} />
                    </div>
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Preload Queue</span>
                  </div>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                  }`}>
                    {metrics.preloadQueueSize}
                  </span>
                </div>
                
                <div className={`flex justify-between items-center py-3 px-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-gray-100/50 border-gray-200/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      metrics.isOnline 
                        ? (theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100')
                        : (theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')
                    }`}>
                      {metrics.isOnline ? (
                        <WifiIcon className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`} />
                      ) : (
                        <WifiOffIcon className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-red-400' : 'text-red-600'
                        }`} />
                      )}
                    </div>
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Connection</span>
                  </div>
                  <span className={`font-medium ${
                    metrics.isOnline 
                      ? (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                      : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                  }`}>
                    {metrics.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Pending Operations */}
              {metrics.pendingOperations > 0 && (
                <div className={`rounded-xl p-4 border ${
                  theme === 'dark'
                    ? 'bg-orange-900/20 border-orange-700'
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className={`flex items-center gap-3 ${
                    theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                  }`}>
                    <div className={`p-1.5 rounded-lg ${
                      theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-100'
                    }`}>
                      <ClockIcon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">
                      {metrics.pendingOperations} operations pending sync
                    </span>
                  </div>
                </div>
              )}

              {/* Last Sync */}
              {metrics.lastSync && (
                <div className={`text-center text-xs flex items-center justify-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <ClockIcon className="w-3 h-3" />
                  Last sync: {new Date(metrics.lastSync).toLocaleTimeString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mb-4">
                <Button
                  onClick={handleOptimizeCache}
                  variant="outline"
                  disabled={isLoading}
                  className={`flex-1 transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-300 border-blue-700'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Optimizing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LightningIcon className="w-4 h-4" />
                      <span>Optimize</span>
                    </div>
                  )}
                </Button>
                
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  disabled={isLoading}
                  className={`flex-1 transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-900/20 hover:bg-red-900/30 text-red-300 border-red-700'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      Clearing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <TrashIcon className="w-4 h-4" />
                      <span>Clear</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Loading cache metrics...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}