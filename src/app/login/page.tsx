'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { ReCaptcha, type ReCaptchaRef } from '@/components/auth/ReCaptcha'

function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const recaptchaRef = useRef<ReCaptchaRef>(null)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    
    try {
      // Execute reCAPTCHA v3
      recaptchaRef.current?.execute()
      
      // Wait for token if not already set
      if (!recaptchaToken) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Error logging in:', error.message)
        alert('Error logging in: ' + error.message)
        recaptchaRef.current?.reset()
        setRecaptchaToken(null)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900 relative overflow-hidden">
      {/* Clean animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating circles */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-400/5 dark:bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Floating squares */}
        <div className="absolute top-40 right-1/4 w-32 h-32 bg-blue-300/10 dark:bg-blue-400/10 rounded-2xl blur-2xl animate-float-slow rotate-45"></div>
        <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-purple-300/10 dark:bg-purple-400/10 rounded-2xl blur-2xl animate-float-delayed rotate-12"></div>
      </div>
      
      <div className="relative backdrop-blur-2xl bg-white/70 dark:bg-gray-900/60 border border-white/40 dark:border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4 transform hover:scale-[1.01] transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl mb-6 transform hover:rotate-6 transition-transform duration-300">
            <MessageCircle size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent mb-3">
            Chat App
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Connect and chat with friends in real-time ✨
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 backdrop-blur-xl bg-red-500/10 dark:bg-red-500/20 border border-red-400/30 text-red-700 dark:text-red-300 rounded-2xl shadow-lg animate-shake">
            <span className="font-medium">⚠️ Authentication failed.</span> Please try again.
          </div>
        )}
        
        <div className="space-y-4">
          <Button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 transition-colors font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 transition-colors font-medium">
              Privacy Policy
            </Link>
          </p>
          <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors backdrop-blur-sm bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 px-4 py-2 rounded-xl border border-gray-300/30 dark:border-gray-600/30"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* ReCAPTCHA badge - positioned at page level, bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <ReCaptcha
          ref={recaptchaRef}
          onVerify={setRecaptchaToken}
        />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
