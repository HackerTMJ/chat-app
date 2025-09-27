/**
 * Friend System Test Page
 * Test the complete friend/couple system workflow
 */

'use client'

import FriendSystem from '@/components/friends/FriendSystem'

export default function FriendsTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100">
      {/* Page Header */}
      <div className="pt-8 pb-4 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💕 Friend & Couple System
          </h1>
          <p className="text-gray-600 text-lg">
            Intimate 2-person chats with special relationship features
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: '80vh' }}>
            <FriendSystem />
          </div>
        </div>
      </div>

      {/* Features Info */}
      <div className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🌟 Features</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-pink-600 mb-2">💖 Relationship Types</h3>
                <ul className="space-y-1">
                  <li>👫 Friend - Casual friendship</li>
                  <li>👯 Best Friend - Close friendship</li>
                  <li>💕 Couple - Romantic relationship</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-600 mb-2">🎨 Chat Features</h3>
                <ul className="space-y-1">
                  <li>❤️ Heart reactions</li>
                  <li>🎨 Relationship themes</li>
                  <li>📊 Message statistics</li>
                  <li>🔥 Daily streaks</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-indigo-600 mb-2">🛡️ Privacy</h3>
                <ul className="space-y-1">
                  <li>🔒 2-person max rooms</li>
                  <li>🛡️ Row-level security</li>
                  <li>🔐 Private conversations</li>
                  <li>👤 Profile protection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}