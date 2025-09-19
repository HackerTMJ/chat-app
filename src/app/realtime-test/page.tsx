import { createClient } from '@/lib/supabase/client';

export default async function RealtimeTestPage() {
  const supabase = createClient();
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Database Connection OK</h1>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Connection Status:</h3>
              <p className="text-green-600">✅ Database queries working</p>
              <p className="text-blue-600">ℹ️ Real-time will be tested in chat</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">To Enable Real-time:</h3>
              <ol className="text-sm space-y-1">
                <li>1. Go to Supabase Dashboard</li>
                <li>2. Settings → API</li>
                <li>3. Check "Enable Realtime"</li>
                <li>4. Enable for tables: messages, rooms</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Tables Found:</h3>
              <p className="text-sm">✅ {data ? `${data.length} rooms` : 'No rooms yet'}</p>
            </div>
            
            <div className="pt-4">
              <a href="/chat" className="text-blue-600 hover:underline">← Back to Chat</a>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Connection Error</h1>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Error Details:</h3>
              <p className="text-red-600 text-sm">{error.message}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Check:</h3>
              <ul className="text-sm space-y-1">
                <li>• Supabase URL and API key in .env.local</li>
                <li>• Database schema is set up</li>
                <li>• RLS policies are correct</li>
                <li>• User is authenticated</li>
              </ul>
            </div>
            
            <div className="pt-4">
              <a href="/login" className="text-blue-600 hover:underline">← Go to Login</a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
