-- Migration: Add Room Features (Avatars, Categories, Archive)
-- Date: 2025-01-04

-- Add avatar_url to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Note: room_memberships table should already exist, but we'll add the role column if it doesn't exist
ALTER TABLE room_memberships 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

-- Drop and recreate the CHECK constraint if it exists
ALTER TABLE room_memberships DROP CONSTRAINT IF EXISTS room_memberships_role_check;
ALTER TABLE room_memberships ADD CONSTRAINT room_memberships_role_check CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

-- Create index for room_memberships role if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_room_memberships_role ON room_memberships(role);

-- Create room categories table
CREATE TABLE IF NOT EXISTS room_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#667eea',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create room_user_categories junction table (for user-specific room categorization)
CREATE TABLE IF NOT EXISTS room_user_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES room_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Add banned_users table for room bans
CREATE TABLE IF NOT EXISTS room_banned_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create storage bucket for room avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-avatars', 'room-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload room avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to room avatars" ON storage.objects;
DROP POLICY IF EXISTS "Room owners can update room avatars" ON storage.objects;
DROP POLICY IF EXISTS "Room owners can delete room avatars" ON storage.objects;

-- Storage policy: Allow authenticated users to upload room avatars
CREATE POLICY "Users can upload room avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'room-avatars');

-- Storage policy: Allow public read access to room avatars
CREATE POLICY "Public read access to room avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'room-avatars');

-- Storage policy: Allow room owners to update/delete room avatars
CREATE POLICY "Room owners can update room avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'room-avatars');

CREATE POLICY "Room owners can delete room avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'room-avatars');

-- Enable RLS on new tables
ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_banned_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own categories" ON room_categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON room_categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON room_categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON room_categories;

DROP POLICY IF EXISTS "Users can view their room categories" ON room_user_categories;
DROP POLICY IF EXISTS "Users can assign categories to their rooms" ON room_user_categories;
DROP POLICY IF EXISTS "Users can update their room categories" ON room_user_categories;
DROP POLICY IF EXISTS "Users can delete their room categories" ON room_user_categories;

DROP POLICY IF EXISTS "Room members can view banned users" ON room_banned_users;
DROP POLICY IF EXISTS "Room moderators can ban users" ON room_banned_users;
DROP POLICY IF EXISTS "Room moderators can unban users" ON room_banned_users;

-- RLS Policies for room_categories
CREATE POLICY "Users can view their own categories"
ON room_categories FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON room_categories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON room_categories FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON room_categories FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for room_user_categories
CREATE POLICY "Users can view their room categories"
ON room_user_categories FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can assign categories to their rooms"
ON room_user_categories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their room categories"
ON room_user_categories FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their room categories"
ON room_user_categories FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for room_banned_users
CREATE POLICY "Room members can view banned users"
ON room_banned_users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_memberships
    WHERE room_memberships.room_id = room_banned_users.room_id
    AND room_memberships.user_id = auth.uid()
    AND room_memberships.role IN ('owner', 'admin', 'moderator')
  )
);

CREATE POLICY "Room moderators can ban users"
ON room_banned_users FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_memberships
    WHERE room_memberships.room_id = room_banned_users.room_id
    AND room_memberships.user_id = auth.uid()
    AND room_memberships.role IN ('owner', 'admin', 'moderator')
  )
);

CREATE POLICY "Room moderators can unban users"
ON room_banned_users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_memberships
    WHERE room_memberships.room_id = room_banned_users.room_id
    AND room_memberships.user_id = auth.uid()
    AND room_memberships.role IN ('owner', 'admin', 'moderator')
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_is_archived ON rooms(is_archived);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);
CREATE INDEX IF NOT EXISTS idx_room_categories_user_id ON room_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_room_user_categories_room_user ON room_user_categories(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_room_banned_users_room_user ON room_banned_users(room_id, user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_room_categories_updated_at ON room_categories;

-- Add trigger for room_categories
CREATE TRIGGER update_room_categories_updated_at
  BEFORE UPDATE ON room_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for rooms table to allow updates
DROP POLICY IF EXISTS "Room owners can update room info" ON rooms;

CREATE POLICY "Room owners can update room info"
ON rooms FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_memberships
    WHERE room_memberships.room_id = rooms.id
    AND room_memberships.user_id = auth.uid()
    AND room_memberships.role IN ('owner', 'admin')
  )
);
