// Simple theme toggle using ThemeContext
'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/contexts/ThemeContext'

export function SimpleThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-800'
      }`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}