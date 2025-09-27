'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MessageCircle, Bug, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FriendSystem from '@/components/friends/FriendSystem'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useUserStatus } from '@/lib/hooks/useUserStatus'
import { debugCoupleRoomsData } from '@/lib/friends/debug-couple-rooms'
import { createTestFriendshipAndRoom, cleanupTestData } from '@/lib/friends/test-setup'

export default function FriendsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { userStatus } = useUserStatus(user)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setIsLoading(false)
    }
    
    checkUser()
  }, [router, supabase.auth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/chat')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white border-transparent hover:border-gray-300"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">Back to Chat</span>
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <MessageCircle size={24} className="text-pink-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Friends & Couples
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Intimate 2-person conversations
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StatusIndicator status={userStatus} size="sm" />
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                  {user.user_metadata?.name || user.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Debug Panel - Remove this after testing */}
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
            🔧 Debug Tools (Remove after fixing)
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => debugCoupleRoomsData()}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Bug className="w-3 h-3 mr-1" />
              Debug Data
            </Button>
            <Button
              onClick={() => createTestFriendshipAndRoom()}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Create Test Data
            </Button>
            <Button
              onClick={() => cleanupTestData()}
              size="sm"
              variant="outline"
              className="text-xs text-red-600"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clean Test Data
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[calc(100vh-180px)]">
          <FriendSystem />
        </div>
      </div>
    </div>
  )
}