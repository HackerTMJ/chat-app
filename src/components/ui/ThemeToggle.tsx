// Theme toggle button component
'use client'

import { useTheme } from '@/lib/contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useState } from 'react'

export function ThemeToggle() {
  const { theme, toggleTheme, setTheme } = useTheme()
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div className="relative">
      {/* Simple Toggle Button */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-200 ease-in-out"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon size={20} className="text-gray-700 dark:text-gray-300" />
        ) : (
          <Sun size={20} className="text-gray-700 dark:text-gray-300" />
        )}
      </button>
    </div>
  )
}

// Advanced theme selector with system option
export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-200"
        aria-label="Choose theme"
      >
        {theme === 'light' && <Sun size={16} />}
        {theme === 'dark' && <Moon size={16} />}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value as 'light' | 'dark')
                  setShowDropdown(false)
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  theme === value 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Minimal theme toggle for space-constrained areas
export function CompactThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon size={16} className="text-gray-600 dark:text-gray-400" />
      ) : (
        <Sun size={16} className="text-gray-600 dark:text-gray-400" />
      )}
    </button>
  )
}