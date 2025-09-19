import { createClient } from '@/lib/supabase/server';

export default async function TestPage() {
  const supabase = await createClient();
  
  try {
    // Test database connection by checking if we can query the rooms table
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
          <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Database Connected!</h1>
          <div className="space-y-2">
            <p><strong>Status:</strong> Connected to Supabase</p>
            <p><strong>Rooms table:</strong> Accessible</p>
            <p><strong>Data:</strong> {data ? `${data.length} records found` : 'No records'}</p>
          </div>
          <div className="mt-6">
            <a href="/login" className="text-blue-600 hover:underline">← Go to Login</a>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Database Error</h1>
          <div className="space-y-2">
            <p><strong>Error:</strong> {error.message}</p>
            <p className="text-sm text-gray-600">Check your Supabase configuration and database setup.</p>
          </div>
          <div className="mt-6">
            <a href="/login" className="text-blue-600 hover:underline">← Go to Login</a>
          </div>
        </div>
      </div>
    );
  }
}
