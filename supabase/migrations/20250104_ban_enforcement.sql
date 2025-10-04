-- Migration: Complete Ban System Enforcement
-- Date: 2025-01-04
-- Description: Comprehensive ban system with database-level enforcement

-- ========================================
-- PART 1: Fix RLS Policy for Banning Users
-- ========================================

-- Drop and recreate the ban INSERT policy with correct logic
DROP POLICY IF EXISTS "Room moderators can ban users" ON room_banned_users;

CREATE POLICY "Room moderators can ban users"
ON room_banned_users FOR INSERT
TO authenticated
WITH CHECK (
  -- The person DOING the ban (banned_by) must be a moderator/admin/owner
  EXISTS (
    SELECT 1 FROM room_memberships
    WHERE room_memberships.room_id = room_banned_users.room_id
    AND room_memberships.user_id = room_banned_users.banned_by
    AND room_memberships.role IN ('owner', 'admin', 'moderator')
  )
);

-- ========================================
-- PART 2: Prevent Banned Users from Sending Messages
-- ========================================

DROP POLICY IF EXISTS "Banned users cannot send messages" ON messages;

CREATE POLICY "Banned users cannot send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  -- User must NOT be banned from the room
  NOT EXISTS (
    SELECT 1 FROM room_banned_users
    WHERE room_banned_users.room_id = messages.room_id
    AND room_banned_users.user_id = auth.uid()
  )
);

-- ========================================
-- PART 3: Prevent Banned Users from Joining Rooms
-- ========================================

DROP POLICY IF EXISTS "Banned users cannot join rooms" ON room_memberships;

CREATE POLICY "Banned users cannot join rooms"
ON room_memberships FOR INSERT
TO authenticated
WITH CHECK (
  -- User must NOT be banned from the room
  NOT EXISTS (
    SELECT 1 FROM room_banned_users
    WHERE room_banned_users.room_id = room_memberships.room_id
    AND room_banned_users.user_id = auth.uid()
  )
);

-- ========================================
-- PART 4: Auto-Kick Function
-- ========================================

-- Function to automatically remove user from room when banned
CREATE OR REPLACE FUNCTION auto_kick_banned_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the user's membership when they get banned
  DELETE FROM room_memberships
  WHERE room_id = NEW.room_id
  AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_kick_banned_user ON room_banned_users;

-- Create trigger to auto-kick on ban
CREATE TRIGGER trigger_auto_kick_banned_user
  AFTER INSERT ON room_banned_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_kick_banned_user();

-- ========================================
-- PART 5: Prevent Banned Users from Reading Messages (Optional)
-- ========================================

-- Optionally prevent banned users from even reading messages
DROP POLICY IF EXISTS "Banned users cannot read messages" ON messages;

CREATE POLICY "Banned users cannot read messages"
ON messages FOR SELECT
TO authenticated
USING (
  -- Allow if user is not banned OR if they're checking another room
  NOT EXISTS (
    SELECT 1 FROM room_banned_users
    WHERE room_banned_users.room_id = messages.room_id
    AND room_banned_users.user_id = auth.uid()
  )
);

-- ========================================
-- PART 6: Verification Functions
-- ========================================

-- Helper function to check if user is banned (can be called from frontend)
CREATE OR REPLACE FUNCTION is_user_banned(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_banned_users
    WHERE room_id = p_room_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PART 7: Indexes for Performance
-- ========================================

-- Ensure fast lookups for ban checks
CREATE INDEX IF NOT EXISTS idx_room_banned_users_lookup 
ON room_banned_users(room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_room_banned_users_room 
ON room_banned_users(room_id);

-- ========================================
-- Summary
-- ========================================

-- This migration provides:
-- 1. ✅ Proper RLS policy for banning (checks banned_by role)
-- 2. ✅ Blocks banned users from sending messages (database level)
-- 3. ✅ Blocks banned users from joining rooms (database level)
-- 4. ✅ Auto-kicks banned users via trigger
-- 5. ✅ Prevents banned users from reading messages
-- 6. ✅ Helper function for ban status checks
-- 7. ✅ Performance indexes for fast lookups
