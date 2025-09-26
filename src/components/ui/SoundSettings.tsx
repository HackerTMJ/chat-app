/**
 * Sound settings UI component
 * Allows users to configure message notification sounds
 */

'use client'

import { useState, useEffect } from 'react'
import { soundManager, SoundSettings } from '@/lib/sounds/SoundManager'
import { Volume2, VolumeX, Play, Settings } from 'lucide-react'
import { Button } from './Button'

interface SoundSettingsProps {
  className?: string
}

export function SoundSettingsPanel({ className = '' }: SoundSettingsProps) {
  const [settings, setSettings] = useState<SoundSettings>({
    enabled: true,
    volume: 0.5,
    soundType: 'default',
    playOnOwnMessages: false,
    playWhenFocused: false
  })
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // Load current settings
    const currentSettings = soundManager.getSettings()
    setSettings(currentSettings)
  }, [])

  const handleSettingChange = (key: keyof SoundSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    soundManager.updateSettings(newSettings)
  }

  const handleTestSound = async () => {
    if (isPlaying) return
    
    setIsPlaying(true)
    try {
      await soundManager.testSound()
    } catch (error) {
      console.warn('Failed to test sound:', error)
    } finally {
      setTimeout(() => setIsPlaying(false), 1000) // Prevent spam clicking
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enable/Disable Sounds */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings.enabled ? (
            <Volume2 className="w-4 h-4 text-green-500" />
          ) : (
            <VolumeX className="w-4 h-4 text-gray-400" />
          )}
          <label className="text-sm font-medium">Sound Notifications</label>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.enabled}
            onChange={(e) => handleSettingChange('enabled', e.target.checked)}
            aria-label="Enable sound notifications"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Volume</label>
              <span className="text-sm text-gray-500">{Math.round(settings.volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                aria-label="Volume level"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestSound}
                disabled={isPlaying}
                className="flex items-center gap-1 px-2 py-1 text-xs"
              >
                <Play className="w-3 h-3" />
                Test
              </Button>
            </div>
          </div>

          {/* Sound Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sound Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'default', label: 'Default' },
                { value: 'pop', label: 'Pop' },
                { value: 'chime', label: 'Chime' },
                { value: 'notification', label: 'Ding' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('soundType', option.value)}
                  className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                    settings.soundType === option.value
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced Options</h4>
            
            {/* Play on own messages */}
            <div className="flex items-center justify-between">
              <label htmlFor="play-own-messages" className="text-sm text-gray-600 dark:text-gray-400">
                Sound for my messages
              </label>
              <input
                id="play-own-messages"
                type="checkbox"
                checked={settings.playOnOwnMessages}
                onChange={(e) => handleSettingChange('playOnOwnMessages', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            {/* Play when focused */}
            <div className="flex items-center justify-between">
              <label htmlFor="play-when-focused" className="text-sm text-gray-600 dark:text-gray-400">
                Sound when app is focused
              </label>
              <input
                id="play-when-focused"
                type="checkbox"
                checked={settings.playWhenFocused}
                onChange={(e) => handleSettingChange('playWhenFocused', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function SoundSettingsButton() {
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    const settings = soundManager.getSettings()
    setSoundEnabled(settings.enabled)
  }, [])

  const toggleSound = () => {
    const newEnabled = !soundEnabled
    setSoundEnabled(newEnabled)
    soundManager.updateSettings({ enabled: newEnabled })
  }

  return (
    <>
      {/* Quick Toggle Button */}
      <button
        onClick={toggleSound}
        className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
        title={soundEnabled ? "Disable sounds" : "Enable sounds"}
      >
        {soundEnabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
        title="Sound settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Settings Panel Popup */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sound Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <SoundSettingsPanel />
          </div>
        </div>
      )}
    </>
  )
}