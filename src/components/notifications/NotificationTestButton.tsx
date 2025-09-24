'use client'

import { notificationManager, showMessageNotification } from '@/lib/notifications/NotificationManager'
import { createClient } from '@/lib/supabase/client'

export function NotificationTestButton() {
  const handleTestNotification = async () => {
    console.log('🧪 Testing notification system...')
    
    try {
      // Test 1: Basic notification manager test
      console.log('Test 1: Basic notification manager')
      await notificationManager.testNotification()
      
      // Test 2: Message notification with force
      console.log('Test 2: Forced message notification')
      await showMessageNotification({
        content: 'This is a test cross-room message!',
        sender_name: 'Test User',
        room_name: 'Test Room'
      }, true)
      
      // Test 3: Supabase real-time connection test
      console.log('Test 3: Supabase real-time test')
      const supabase = createClient()
      
      // Test basic connectivity
      const { data: testData, error: testError } = await supabase
        .from('rooms')
        .select('id, name')
        .limit(1)
        
      if (testError) {
        console.error('❌ Supabase query test failed:', testError)
      } else {
        console.log('✅ Supabase query works:', testData)
      }
      
      // Test real-time subscription
      console.log('🔗 Testing real-time subscription...')
      const testChannel = supabase
        .channel('test-connection')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public', 
          table: 'messages'
        }, (payload) => {
          console.log('🔥 TEST REALTIME TRIGGERED!', payload)
        })
        .subscribe((status) => {
          console.log('🔗 Test channel status:', status)
          
          // Cleanup after 5 seconds
          setTimeout(() => {
            console.log('🧹 Cleaning up test channel')
            supabase.removeChannel(testChannel)
          }, 5000)
        })
      
      console.log('✅ All tests completed')
    } catch (error) {
      console.error('❌ Test failed:', error)
    }
  }

  return (
    <button
      onClick={handleTestNotification}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      🧪 Test Notifications
    </button>
  )
}