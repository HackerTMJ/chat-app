import { createClient } from '@/lib/supabase/server';

export default async function DatabaseDebugPage() {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">🔒 Not Authenticated</h1>
            <p>Please <a href="/login" className="text-blue-600 hover:underline">login</a> first.</p>
          </div>
        </div>
      );
    }
    
    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    // Check current user's profile
    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Check rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .limit(5);
    
    // Check recent messages with profiles
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .limit(5)
      .order('created_at', { ascending: false });
    
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">🔍 Database Debug Information</h1>
            
            {/* Current User Info */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Current User:</h2>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.user_metadata?.name || 'Not set'}</p>
              </div>
            </div>
            
            {/* User Profile Check */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Your Profile:</h2>
              {userProfileError ? (
                <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                  <strong>Error:</strong> {userProfileError.message}
                  <br />
                  <strong>Fix:</strong> Run the database setup SQL to create your profile.
                </div>
              ) : userProfile ? (
                <div className="bg-green-50 p-3 rounded text-sm">
                  <p><strong>✅ Profile exists</strong></p>
                  <p><strong>Username:</strong> {userProfile.username}</p>
                  <p><strong>Email:</strong> {userProfile.email}</p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-700">
                  <strong>⚠️ No profile found</strong> - Run database setup SQL
                </div>
              )}
            </div>
            
            {/* All Profiles */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">All Profiles ({profiles?.length || 0}):</h2>
              {profilesError ? (
                <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                  Error: {profilesError.message}
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                  {profiles?.map(profile => (
                    <div key={profile.id} className="mb-2">
                      <strong>{profile.username}</strong> ({profile.email})
                    </div>
                  )) || <p>No profiles found</p>}
                </div>
              )}
            </div>
            
            {/* Rooms */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Rooms ({rooms?.length || 0}):</h2>
              {roomsError ? (
                <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                  Error: {roomsError.message}
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {rooms?.map(room => (
                    <div key={room.id} className="mb-1">
                      <strong>{room.name}</strong> ({room.code})
                    </div>
                  )) || <p>No rooms found</p>}
                </div>
              )}
            </div>
            
            {/* Recent Messages */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Recent Messages with Profiles:</h2>
              {messagesError ? (
                <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                  Error: {messagesError.message}
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded text-sm max-h-60 overflow-y-auto">
                  {messages?.map(message => (
                    <div key={message.id} className="mb-2 border-b pb-2">
                      <p><strong>User:</strong> {message.profiles?.username || '❌ No profile'}</p>
                      <p><strong>Content:</strong> {message.content}</p>
                      <p><strong>User ID:</strong> {message.user_id}</p>
                    </div>
                  )) || <p>No messages found</p>}
                </div>
              )}
            </div>
            
            {/* Action Items */}
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold mb-2">📋 Action Items:</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>If "No profile found" - Run the database-membership-update.sql</li>
                <li>If profiles exist but messages show "No profile" - Check RLS policies</li>
                <li>If rooms are empty - Create a room to test</li>
                <li>Check Supabase dashboard for any RLS policy errors</li>
              </ol>
            </div>
            
            <div className="mt-6 flex gap-4">
              <a href="/chat" className="text-blue-600 hover:underline">← Back to Chat</a>
              <a href="/realtime-test" className="text-blue-600 hover:underline">→ Test Real-time</a>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Database Error</h1>
          <p className="text-red-600 text-sm">{error.message}</p>
          <div className="mt-4">
            <a href="/login" className="text-blue-600 hover:underline">← Go to Login</a>
          </div>
        </div>
      </div>
    );
  }
}
