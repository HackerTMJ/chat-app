-- Update Room Management and Kick Functionality
-- Remove moderators from PUBLIC room and add kick functionality

-- First, remove any moderator roles from PUBLIC room
UPDATE room_memberships 
SET role = 'member' 
WHERE room_id IN (SELECT id FROM rooms WHERE code = 'PUBLIC') 
AND role = 'moderator';

-- Ensure PUBLIC room creator is always member, not owner
UPDATE room_memberships 
SET role = 'member' 
WHERE room_id IN (SELECT id FROM rooms WHERE code = 'PUBLIC');

-- Add function to kick user from room
CREATE OR REPLACE FUNCTION kick_user_from_room(
  target_user_id UUID,
  target_room_id UUID,
  kicker_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  kicker_role TEXT;
  target_role TEXT;
  room_code TEXT;
BEGIN
  -- Get room code to check if it's PUBLIC
  SELECT code INTO room_code FROM rooms WHERE id = target_room_id;
  
  -- Cannot kick from PUBLIC room
  IF room_code = 'PUBLIC' THEN
    RAISE EXCEPTION 'Cannot kick users from PUBLIC room';
  END IF;
  
  -- Get kicker's role
  SELECT role INTO kicker_role 
  FROM room_memberships 
  WHERE room_id = target_room_id AND user_id = kicker_user_id;
  
  -- Get target's role
  SELECT role INTO target_role 
  FROM room_memberships 
  WHERE room_id = target_room_id AND user_id = target_user_id;
  
  -- Check permissions: only owner and moderator can kick
  IF kicker_role NOT IN ('owner', 'moderator') THEN
    RAISE EXCEPTION 'Insufficient permissions to kick users';
  END IF;
  
  -- Cannot kick owner
  IF target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot kick room owner';
  END IF;
  
  -- Moderators cannot kick other moderators, only owner can
  IF kicker_role = 'moderator' AND target_role = 'moderator' THEN
    RAISE EXCEPTION 'Moderators cannot kick other moderators';
  END IF;
  
  -- Cannot kick yourself
  IF target_user_id = kicker_user_id THEN
    RAISE EXCEPTION 'Cannot kick yourself';
  END IF;
  
  -- Perform the kick
  DELETE FROM room_memberships 
  WHERE room_id = target_room_id AND user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Add function to promote user to moderator
CREATE OR REPLACE FUNCTION promote_user_to_moderator(
  target_user_id UUID,
  target_room_id UUID,
  promoter_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  promoter_role TEXT;
  room_code TEXT;
BEGIN
  -- Get room code to check if it's PUBLIC
  SELECT code INTO room_code FROM rooms WHERE id = target_room_id;
  
  -- Cannot promote in PUBLIC room
  IF room_code = 'PUBLIC' THEN
    RAISE EXCEPTION 'Cannot promote users in PUBLIC room';
  END IF;
  
  -- Get promoter's role
  SELECT role INTO promoter_role 
  FROM room_memberships 
  WHERE room_id = target_room_id AND user_id = promoter_user_id;
  
  -- Only owner can promote to moderator
  IF promoter_role != 'owner' THEN
    RAISE EXCEPTION 'Only room owner can promote users to moderator';
  END IF;
  
  -- Update user role to moderator
  UPDATE room_memberships 
  SET role = 'moderator'
  WHERE room_id = target_room_id AND user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Add function to demote moderator
CREATE OR REPLACE FUNCTION demote_moderator_to_member(
  target_user_id UUID,
  target_room_id UUID,
  demoter_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  demoter_role TEXT;
  room_code TEXT;
BEGIN
  -- Get room code to check if it's PUBLIC
  SELECT code INTO room_code FROM rooms WHERE id = target_room_id;
  
  -- Cannot demote in PUBLIC room (no moderators anyway)
  IF room_code = 'PUBLIC' THEN
    RAISE EXCEPTION 'Cannot demote users in PUBLIC room';
  END IF;
  
  -- Get demoter's role
  SELECT role INTO demoter_role 
  FROM room_memberships 
  WHERE room_id = target_room_id AND user_id = demoter_user_id;
  
  -- Only owner can demote moderators
  IF demoter_role != 'owner' THEN
    RAISE EXCEPTION 'Only room owner can demote moderators';
  END IF;
  
  -- Update user role to member
  UPDATE room_memberships 
  SET role = 'member'
  WHERE room_id = target_room_id AND user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;