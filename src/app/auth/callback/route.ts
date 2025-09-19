import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Successful authentication, redirect to chat
      return NextResponse.redirect(`${origin}/chat`);
    }
  }

  // Authentication failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
