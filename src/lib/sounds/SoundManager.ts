/**
 * Sound notification system for chat messages
 * Provides customizable audio alerts for new messages
 */

'use client'

import { useEffect, useRef, useState } from 'react'

export interface SoundSettings {
  enabled: boolean
  volume: number // 0-1
  soundType: 'default' | 'pop' | 'chime' | 'notification'
  playOnOwnMessages: boolean
  playWhenFocused: boolean
}

export class SoundManager {
  private static instance: SoundManager
  private audioContext: AudioContext | null = null
  private settings: SoundSettings = {
    enabled: true,
    volume: 0.5,
    soundType: 'default',
    playOnOwnMessages: false,
    playWhenFocused: false
  }

  private constructor() {
    this.loadSettings()
  }

  public static getInstance(): SoundManager {
    if (typeof window === 'undefined') {
      // Return a mock instance for SSR
      return {
        playMessageSound: () => Promise.resolve(),
        getSettings: () => ({
          enabled: false,
          volume: 0.5,
          soundType: 'default',
          playOnOwnMessages: false,
          playWhenFocused: false
        }),
        updateSettings: () => {},
        testSound: () => Promise.resolve()
      } as any
    }

    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('chat-sound-settings')
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('Failed to load sound settings:', error)
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('chat-sound-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Failed to save sound settings:', error)
    }
  }

  public getSettings(): SoundSettings {
    return { ...this.settings }
  }

  public updateSettings(newSettings: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
  }

  /**
   * Initialize audio context on first user interaction
   */
  private async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Resume audio context if it's suspended
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
        }
      } catch (error) {
        console.warn('Failed to initialize audio context:', error)
      }
    }
  }

  /**
   * Generate notification sound using Web Audio API
   */
  private async generateSound(type: string, volume: number): Promise<void> {
    await this.initAudioContext()
    
    if (!this.audioContext) {
      // Fallback to HTML5 Audio if Web Audio API is not available
      this.playHTMLAudio(type, volume)
      return
    }

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // Configure sound based on type
      switch (type) {
        case 'pop':
          oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1)
          gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15)
          break
          
        case 'chime':
          oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime) // C5
          oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1) // E5
          oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2) // G5
          gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8)
          break
          
        case 'notification':
          oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime)
          oscillator.frequency.setValueAtTime(900, this.audioContext.currentTime + 0.05)
          oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1)
          gainNode.gain.setValueAtTime(volume * 0.4, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25)
          break
          
        default: // 'default'
          oscillator.frequency.setValueAtTime(520, this.audioContext.currentTime)
          gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)
          break
      }
      
      // Play the sound
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 1)
      
    } catch (error) {
      console.warn('Failed to generate sound:', error)
      // Fallback to HTML5 Audio
      this.playHTMLAudio(type, volume)
    }
  }

  /**
   * Fallback HTML5 Audio implementation
   */
  private playHTMLAudio(type: string, volume: number): void {
    try {
      // Create a simple beep sound data URL
      const beepSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBzWH0fDPeSsFKn/K7N2NSgYZaLvt559MEAxQp+PwtmMcBjiS2O/FfywEK4DG8N+VOAoUXrTp66hVFApGnuPyvmEYBzWH0fDQeSsFKoHA7N2NSgYZaLvt59BULIHs5ltaIEgsrGZqJj9nxBiYtQCQKjgwRXhhTTsKH3++6MjJt1gdFzCNxL1fIhAwlPLFdCoGQvO5PsqpMDbJxNmAOmMWnLz/AQoKO4EBAAtMAQEDABcKKgKKCgoEQQqQKgqShKDALzIhgkuIYJ4Y5ZwzKq0KKVJJK5gQJM2PLqKOCk2aQKlVAJQKSQ'
      
      const audio = new Audio(beepSound)
      audio.volume = volume
      audio.play().catch(e => console.warn('Failed to play fallback audio:', e))
    } catch (error) {
      console.warn('Failed to play HTML5 audio:', error)
    }
  }

  /**
   * Play message notification sound
   */
  public async playMessageSound(options?: {
    isOwnMessage?: boolean
    isWindowFocused?: boolean
  }): Promise<void> {
    const { isOwnMessage = false, isWindowFocused = true } = options || {}
    
    // Check if sound should be played based on settings
    if (!this.settings.enabled) return
    if (isOwnMessage && !this.settings.playOnOwnMessages) return
    if (isWindowFocused && !this.settings.playWhenFocused) return
    
    await this.generateSound(this.settings.soundType, this.settings.volume)
  }

  /**
   * Test sound with current settings
   */
  public async testSound(): Promise<void> {
    await this.generateSound(this.settings.soundType, this.settings.volume)
  }
}

// Create singleton instance
export const soundManager = SoundManager.getInstance()