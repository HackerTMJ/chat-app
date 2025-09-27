'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Users, Shield, Zap, Globe, Heart, ArrowRight, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }
    getUser()
  }, [supabase])

  const handleGetStarted = () => {
    if (user) {
      router.push('/chat')
    } else {
      router.push('/login')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageCircle size={24} className="text-blue-600" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ChatApp
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                    Welcome, {user.email}
                  </span>
                  <Button onClick={() => router.push('/chat')} size="sm">
                    Start Chatting
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:block">
                    Sign In
                  </Link>
                  <Button onClick={() => router.push('/login')} size="sm">
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-6">
                <Star size={16} />
                Real-time messaging platform
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Connect Instantly with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Real-Time Chat
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Experience seamless communication with our modern chat platform. Create rooms, invite friends, 
              and enjoy real-time messaging with advanced features like typing indicators, online status, and more.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {user ? 'Open Chat' : 'Start Chatting'}
                <ArrowRight size={20} className="ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-4"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose ChatApp?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built with modern technology for the best chatting experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: 'Real-Time Messaging',
                description: 'Instant message delivery with typing indicators and read receipts'
              },
              {
                icon: Users,
                title: 'Discord-style Friends',
                description: 'Add friends, manage relationships, and enjoy private couple/friend chats - all integrated!'
              },
              {
                icon: Shield,
                title: 'Secure & Private',
                description: 'End-to-end encryption and secure authentication with Supabase'
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Optimized performance with caching and smart loading'
              },
              {
                icon: Globe,
                title: 'Cross-Platform',
                description: 'Works seamlessly on desktop, tablet, and mobile devices'
              },
              {
                icon: Heart,
                title: 'User-Friendly',
                description: 'Intuitive design with dark mode support and accessibility features'
              }
            ].map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:shadow-lg transition-shadow">
                  <div className="p-3 bg-blue-500/20 rounded-lg w-fit mb-4">
                    <Icon size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Start Chatting?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of users already enjoying seamless communication
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {user ? 'Open Chat' : 'Get Started Free'}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>

          {/* Features List */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              'Real-time messaging',
              'Room-based organization', 
              'Mobile responsive',
              'Dark mode support'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Check size={16} className="text-green-600" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageCircle size={24} className="text-blue-400" />
              </div>
              <span className="text-xl font-bold">ChatApp</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <span className="text-gray-400">
                © 2025 ChatApp. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
