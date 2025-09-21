'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FixPolicyPage() {
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const executeSQL = async () => {
    setIsLoading(true)
    setStatus('Executing SQL...')
    
    try {
      const supabase = createClient()
      
      // Try to execute the SQL policy creation
      const { error } = await supabase
        .from('messages')
        .select('id')
        .limit(1)
      
      if (error) {
        setStatus(`Error: ${error.message}`)
        return
      }
      
      setStatus('✅ Please manually run this SQL in your Supabase dashboard SQL Editor:')
    } catch (err) {
      setStatus(`Error: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Fix Message Delete Policy</h1>
      
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
        <strong>Issue:</strong> Messages cannot be deleted because there is no DELETE policy for the messages table.
      </div>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-bold mb-2">SQL to Run in Supabase Dashboard:</h2>
        <code className="block bg-black text-green-400 p-4 rounded text-sm">
          {`CREATE POLICY "Users can delete own messages" ON messages 
    FOR DELETE USING (auth.uid() = user_id);`}
        </code>
      </div>
      
      <div className="space-y-4">
        <h2 className="font-bold">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to your Supabase dashboard</li>
          <li>Navigate to the SQL Editor</li>
          <li>Copy and paste the SQL code above</li>
          <li>Click "Run" to execute the SQL</li>
          <li>The message deletion should now work in real-time</li>
        </ol>
      </div>
      
      {status && (
        <div className="mt-6 p-4 bg-blue-100 rounded">
          <div className="font-bold">Status:</div>
          <div>{status}</div>
        </div>
      )}
      
      <button
        onClick={executeSQL}
        disabled={isLoading}
        className="mt-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Checking...' : 'Check Connection'}
      </button>
      
      <div className="mt-6 p-4 bg-red-100 rounded">
        <div className="font-bold text-red-700">Alternative Solution:</div>
        <div className="text-red-600">If you cannot access the Supabase dashboard, you can temporarily disable RLS for testing by running:</div>
        <code className="block bg-black text-green-400 p-2 rounded text-sm mt-2">
          ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
        </code>
        <div className="text-red-600 text-sm mt-2">⚠️ Only use this for testing - re-enable RLS after adding the proper policy!</div>
      </div>
    </div>
  )
}