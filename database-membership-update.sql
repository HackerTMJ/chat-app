-- Database Update: Add Room Membership System
-- Run this in your Supabase SQL Editor to add room memberships

-- Create room memberships table
CREATE TABLE IF NOT EXISTS room_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS for room memberships
ALTER TABLE room_memberships ENABLE ROW LEVEL SECURITY;

-- Auto-join everyone to the PUBLIC room when they sign up
INSERT INTO room_memberships (room_id, user_id)
SELECT r.id, p.id
FROM rooms r, profiles p
WHERE r.code = 'PUBLIC'
AND NOT EXISTS (
  SELECT 1 FROM room_memberships rm 
  WHERE rm.room_id = r.id AND rm.user_id = p.id
);

-- Drop and recreate room policies for proper membership-based access
DROP POLICY IF EXISTS "Public rooms visible" ON rooms;
DROP POLICY IF EXISTS "Users create rooms" ON rooms;

-- Users can only see rooms they are members of (or the PUBLIC room)
CREATE POLICY "Users see joined rooms" ON rooms 
  FOR SELECT USING (
    code = 'PUBLIC' OR 
    id IN (
      SELECT room_id FROM room_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create rooms (they'll auto-join when creating)
CREATE POLICY "Users create rooms" ON rooms 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Room membership policies
CREATE POLICY "Users see own memberships" ON room_memberships 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can join rooms" ON room_memberships 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms" ON room_memberships 
  FOR DELETE USING (user_id = auth.uid());

-- Update messages policy to check room membership
DROP POLICY IF EXISTS "Messages in accessible rooms" ON messages;
DROP POLICY IF EXISTS "Users send messages" ON messages;

CREATE POLICY "Messages in joined rooms" ON messages 
  FOR SELECT USING (
    room_id IN (
      SELECT r.id FROM rooms r
      LEFT JOIN room_memberships rm ON r.id = rm.room_id
      WHERE r.code = 'PUBLIC' OR rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users send messages to joined rooms" ON messages 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    room_id IN (
      SELECT r.id FROM rooms r
      LEFT JOIN room_memberships rm ON r.id = rm.room_id
      WHERE r.code = 'PUBLIC' OR rm.user_id = auth.uid()
    )
  );

-- Function to auto-join user to room when they create it
CREATE OR REPLACE FUNCTION auto_join_room_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO room_memberships (room_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-join creator to new rooms
DROP TRIGGER IF EXISTS on_room_created ON rooms;
CREATE TRIGGER on_room_created
  AFTER INSERT ON rooms
  FOR EACH ROW EXECUTE FUNCTION auto_join_room_creator();

-- Function to auto-join new users to PUBLIC room
CREATE OR REPLACE FUNCTION auto_join_public_room()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO room_memberships (room_id, user_id)
  SELECT r.id, NEW.id
  FROM rooms r
  WHERE r.code = 'PUBLIC';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to also join PUBLIC room
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Auto-join PUBLIC room
  INSERT INTO public.room_memberships (room_id, user_id)
  SELECT r.id, NEW.id
  FROM public.rooms r
  WHERE r.code = 'PUBLIC';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_room_memberships_user_id ON room_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_room_memberships_room_id ON room_memberships(room_id);
