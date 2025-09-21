import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, status, last_seen } = body

    if (!user_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // If profile doesn't exist, create it
    if (!existingProfile) {
      // We need user data to create the profile, so get it from auth
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id)
      
      if (userError || !user) {
        console.error('Error getting user data:', userError)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user_id,
          email: user.email,
          username: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          status: status
        })

      if (createError) throw createError
    } else {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status,
          last_seen: last_seen || new Date().toISOString()
        })
        .eq('id', user_id)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}