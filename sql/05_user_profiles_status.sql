-- User Profiles Table with Status Support
-- This ensures the profiles table exists with status field

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status column if it doesn't exist (for existing tables)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy'));
    END IF;
END $$;

-- Add last_seen column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
        ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Users can view all profiles
CREATE POLICY "Users can view all profiles" ON profiles 
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to create profile if not exists
CREATE OR REPLACE FUNCTION create_profile_if_not_exists(user_id UUID, user_email TEXT, user_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Try to get existing profile
  SELECT id INTO profile_id FROM profiles WHERE id = user_id;
  
  -- If no profile exists, create one
  IF profile_id IS NULL THEN
    INSERT INTO profiles (id, email, username, full_name, status)
    VALUES (
      user_id, 
      user_email, 
      COALESCE(user_name, split_part(user_email, '@', 1)),
      user_name,
      'online'
    )
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;