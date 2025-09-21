// Temporary API route to fix DELETE policy
// DELETE this file after running once

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Create admin client (you'll need to add SUPABASE_SERVICE_ROLE_KEY to .env.local)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key needed for admin operations
    )

    console.log('🔧 Adding DELETE policy for messages...')
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can delete own messages" ON messages 
            FOR DELETE USING (auth.uid() = user_id);`
    })
    
    if (error) {
      console.error('❌ Error adding policy:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('✅ Successfully added DELETE policy for messages')
    return NextResponse.json({ success: true, message: 'DELETE policy added successfully' })
    
  } catch (err) {
    console.error('❌ Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}