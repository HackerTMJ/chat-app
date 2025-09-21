-- Fix Room Memberships RLS Policies
-- This fixes the RLS policies that are preventing room loading

-- First, let's ensure the policies allow proper room loading
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view room members if they're members" ON room_memberships;
DROP POLICY IF EXISTS "Users can join rooms" ON room_memberships;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_memberships;

-- Enable RLS if not already enabled
ALTER TABLE room_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view room memberships for rooms they are members of
CREATE POLICY "Users can view room memberships" ON room_memberships 
  FOR SELECT USING (
    -- Allow users to see memberships for rooms they belong to
    room_id IN (
      SELECT rm.room_id 
      FROM room_memberships rm 
      WHERE rm.user_id = auth.uid()
    )
    OR 
    -- Allow users to see their own memberships in any room
    user_id = auth.uid()
  );

-- Users can create their own room memberships
CREATE POLICY "Users can create room memberships" ON room_memberships 
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own room memberships (leave rooms)
-- But prevent owners from leaving their own rooms
CREATE POLICY "Users can delete own memberships" ON room_memberships 
  FOR DELETE USING (
    user_id = auth.uid() 
    AND (
      role != 'owner' 
      OR NOT EXISTS (
        SELECT 1 FROM rooms 
        WHERE id = room_id AND created_by = auth.uid()
      )
    )
  );

-- Also ensure rooms table has proper policies for the join query
-- Drop and recreate rooms policies
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON rooms;
DROP POLICY IF EXISTS "Users can view public rooms" ON rooms;

-- Users can view rooms they are members of
CREATE POLICY "Users can view rooms they are members of" ON rooms 
  FOR SELECT USING (
    id IN (
      SELECT room_id 
      FROM room_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create rooms
CREATE POLICY "Users can create rooms" ON rooms 
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Room owners and admins can update rooms
CREATE POLICY "Room owners can update rooms" ON rooms 
  FOR UPDATE USING (
    id IN (
      SELECT rm.room_id 
      FROM room_memberships rm 
      WHERE rm.user_id = auth.uid() 
      AND rm.role IN ('owner', 'admin')
    )
  );

-- Fix the room loading issue by ensuring proper data access
-- Add a function to get user rooms with membership info
CREATE OR REPLACE FUNCTION get_user_rooms(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  user_role TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.code,
    r.name,
    r.created_by,
    r.created_at,
    rm.role as user_role
  FROM rooms r
  INNER JOIN room_memberships rm ON r.id = rm.room_id
  WHERE rm.user_id = user_uuid
  ORDER BY r.name ASC;
END;
$$;