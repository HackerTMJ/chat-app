/**
 * CacheMonitor - Real-time cache system monitoring component
 * Shows performance metrics and bandwidth savings
 */

'use client'

import { useState, useEffect } from 'react'
import { useCacheSystem } from '@/lib/hooks/useCacheSystem'
import { bandwidthMonitor } from '@/lib/cache/RealtimeOptimizer'
import { BarChart3, Wifi, WifiOff, Database, Zap, ArrowDown, ArrowUp, Gauge, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CacheMonitorProps {
  compact?: boolean
  className?: string
}

// Performance calculation function
function getPerformanceStatus(hitRate: number, bandwidthSaved: number) {
  // hitRate should already be a percentage (0-100)
  const bandwidthMB = bandwidthSaved / (1024 * 1024)
  
  if (hitRate >= 80 && bandwidthMB >= 1) {
    return { status: 'excellent', color: 'emerald', icon: TrendingUp, label: 'Excellent' }
  } else if (hitRate >= 60 && bandwidthMB >= 0.5) {
    return { status: 'good', color: 'green', icon: TrendingUp, label: 'Good' }
  } else if (hitRate >= 40 || bandwidthMB >= 0.1) {
    return { status: 'average', color: 'yellow', icon: Minus, label: 'Average' }
  } else {
    return { status: 'poor', color: 'red', icon: TrendingDown, label: 'Poor' }
  }
}

export function CacheMonitor({ compact = false, className = '' }: CacheMonitorProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { stats, isOnline, clearCache, optimizeCache, deepCleanCache } = useCacheSystem()
  const bandwidthStats = bandwidthMonitor.getStats()
  
  // Refresh performance status every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [])
  
  const combinedHitRate = Math.min(stats.hitRate * 100, 100) // Convert to percentage and cap at 100%
  const totalBandwidthSaved = stats.bandwidthSaved + bandwidthStats.bytesSaved
  const performance = getPerformanceStatus(combinedHitRate, totalBandwidthSaved) // Pass percentage directly

  const PerformanceIcon = performance.icon

  if (compact) {
    return (
      <>
        {/* Performance Toggle Button */}
        <div 
          className={`inline-flex items-center gap-2 px-3 py-1 bg-gray-800/50 backdrop-blur-sm rounded-lg border cursor-pointer hover:bg-gray-700/50 transition-all duration-200 ${className}
            ${performance.status === 'excellent' ? 'border-emerald-500/50 hover:border-emerald-400/70' :
              performance.status === 'good' ? 'border-green-500/50 hover:border-green-400/70' :
              performance.status === 'average' ? 'border-yellow-500/50 hover:border-yellow-400/70' :
              'border-red-500/50 hover:border-red-400/70'}`}
          onClick={() => setShowPopup(true)}
        >
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
          <PerformanceIcon className={`w-4 h-4 ${
            performance.status === 'excellent' ? 'text-emerald-400' :
            performance.status === 'good' ? 'text-green-400' :
            performance.status === 'average' ? 'text-yellow-400' :
            'text-red-400'
          }`} />
          <span className={`text-sm font-medium ${
            performance.status === 'excellent' ? 'text-emerald-300' :
            performance.status === 'good' ? 'text-green-300' :
            performance.status === 'average' ? 'text-yellow-300' :
            'text-red-300'
          }`}>
            {performance.label}
          </span>
        </div>

        {/* Popup Dashboard */}
        {showPopup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full max-h-[80vh] overflow-auto shadow-2xl">
              <CacheDashboard 
                stats={stats} 
                bandwidthStats={bandwidthStats} 
                isOnline={isOnline} 
                performance={performance}
                onClose={() => setShowPopup(false)}
                onClearCache={clearCache}
                onOptimize={optimizeCache}
                onDeepClean={deepCleanCache}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  // For non-compact mode, render the full dashboard
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
      <CacheDashboard 
        stats={stats} 
        bandwidthStats={bandwidthStats} 
        isOnline={isOnline} 
        performance={performance}
        onClose={null}
        onClearCache={clearCache}
        onOptimize={optimizeCache}
        onDeepClean={deepCleanCache}
      />
    </div>
  )
}

interface CacheDashboardProps {
  stats: any
  bandwidthStats: any
  isOnline: boolean
  performance: any
  onClose: (() => void) | null
  onClearCache: () => void
  onOptimize: () => any
  onDeepClean: () => any
}

function CacheDashboard({ 
  stats, 
  bandwidthStats, 
  isOnline, 
  performance, 
  onClose, 
  onClearCache,
  onOptimize,
  onDeepClean
}: CacheDashboardProps) {
  const PerformanceIcon = performance.icon
  const totalBandwidthSaved = stats.bandwidthSaved + bandwidthStats.bytesSaved
  const combinedHitRate = (stats.hitRate + bandwidthStats.cacheHitRate) / 2

  return (
    <>
      <div className="flex items-center justify-between mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            performance.status === 'excellent' ? 'bg-emerald-500/20' :
            performance.status === 'good' ? 'bg-green-500/20' :
            performance.status === 'average' ? 'bg-yellow-500/20' :
            'bg-red-500/20'
          }`}>
            <PerformanceIcon className={`w-5 h-5 ${
              performance.status === 'excellent' ? 'text-emerald-400' :
              performance.status === 'good' ? 'text-green-400' :
              performance.status === 'average' ? 'text-yellow-400' :
              'text-red-400'
            }`} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Cache Performance</h3>
            <p className={`text-sm ${
              performance.status === 'excellent' ? 'text-emerald-400' :
              performance.status === 'good' ? 'text-green-400' :
              performance.status === 'average' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {performance.label} Performance
            </p>
          </div>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
            aria-label="Close cache dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 px-4">
        <MetricCard
          icon={<Database className="w-4 h-4" />}
          label="Messages"
          value={stats.messagesCount.toString()}
          color="blue"
        />
        <MetricCard
          icon={<Gauge className="w-4 h-4" />}
          label="Hit Rate"
          value={`${Math.round(combinedHitRate * 100)}%`}
          color="green"
        />
        <MetricCard
          icon={<ArrowDown className="w-4 h-4" />}
          label="Bandwidth Saved"
          value={formatBytes(totalBandwidthSaved)}
          color="purple"
        />
        <MetricCard
          icon={<Zap className="w-4 h-4" />}
          label="Cache Size"
          value={formatBytes(stats.totalSize)}
          color="yellow"
        />
      </div>

      <div className="space-y-2 mb-4 px-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Network Status</span>
          <div className="flex items-center gap-1">
            {isOnline ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Last Sync</span>
          <span className="text-gray-300 font-mono">{stats.lastSync}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Real-time Requests</span>
          <span className="text-gray-300 font-mono">{bandwidthStats.totalRequests}</span>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => {
            const result = onOptimize()
            console.log('⚡ Cache optimized:', result)
          }}
          className="flex-1 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-md text-sm hover:bg-blue-600/30 transition-colors border border-blue-600/30 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Optimize
        </button>
        <button
          onClick={() => {
            const result = onDeepClean()
            console.log('🚀 Deep clean completed:', result)
          }}
          className="flex-1 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-md text-sm hover:bg-purple-600/30 transition-colors border border-purple-600/30 flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Deep Clean
        </button>
      </div>
    </>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
  }

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-mono font-semibold">{value}</div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default CacheMonitor