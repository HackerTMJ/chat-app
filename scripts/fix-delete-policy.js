// Script to add missing DELETE policy for messages
// Run this once to fix the issue

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addDeletePolicy() {
  try {
    console.log('🔧 Adding DELETE policy for messages...')
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can delete own messages" ON messages 
            FOR DELETE USING (auth.uid() = user_id);`
    })
    
    if (error) {
      console.error('❌ Error adding policy:', error)
    } else {
      console.log('✅ Successfully added DELETE policy for messages')
    }
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

addDeletePolicy()