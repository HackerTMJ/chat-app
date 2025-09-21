-- Room Memberships Role Column Support
-- This adds the missing role column to room_memberships table

-- Add role column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'room_memberships' AND column_name = 'role') THEN
        ALTER TABLE room_memberships ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member'));
    END IF;
END $$;

-- Update existing room memberships to set role based on room creator
UPDATE room_memberships 
SET role = 'owner' 
WHERE user_id IN (
    SELECT r.created_by 
    FROM rooms r 
    WHERE r.id = room_memberships.room_id
) AND role = 'member';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_room_memberships_role ON room_memberships(role);

-- Update RLS policies to include role-based access
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view room members if they're members" ON room_memberships;
DROP POLICY IF EXISTS "Users can join rooms" ON room_memberships;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_memberships;

-- Users can view room members if they're members
CREATE POLICY "Users can view room members if they're members" ON room_memberships 
  FOR SELECT USING (room_id IN (
    SELECT room_id FROM room_memberships WHERE user_id = auth.uid()
  ));

-- Users can join rooms
CREATE POLICY "Users can join rooms" ON room_memberships 
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can leave rooms (but owners cannot leave their own rooms)
CREATE POLICY "Users can leave rooms" ON room_memberships 
  FOR DELETE USING (
    user_id = auth.uid() AND 
    (role != 'owner' OR NOT EXISTS (
      SELECT 1 FROM rooms WHERE id = room_id AND created_by = auth.uid()
    ))
  );

-- Function to automatically set room creator as owner
CREATE OR REPLACE FUNCTION set_room_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new room membership and the user is the room creator, set as owner
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM rooms WHERE id = NEW.room_id AND created_by = NEW.user_id) THEN
      NEW.role = 'owner';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set owner role
DROP TRIGGER IF EXISTS set_owner_role_trigger ON room_memberships;
CREATE TRIGGER set_owner_role_trigger
  BEFORE INSERT ON room_memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_room_creator_as_owner();

-- Ensure room_memberships table has proper constraints
-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'room_memberships_room_id_user_id_key' 
        AND table_name = 'room_memberships'
    ) THEN
        ALTER TABLE room_memberships ADD CONSTRAINT room_memberships_room_id_user_id_key UNIQUE (room_id, user_id);
    END IF;
END $$;