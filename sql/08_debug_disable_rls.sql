-- Temporary: Disable RLS for debugging
-- This will help us identify if RLS is causing the room loading issue

-- Temporarily disable RLS on room_memberships to test
ALTER TABLE room_memberships DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on rooms to test  
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Check if tables exist and have data
-- You can run these queries separately to debug:

-- 1. Check if room_memberships table exists and has data
-- SELECT COUNT(*) as membership_count FROM room_memberships;

-- 2. Check if rooms table exists and has data  
-- SELECT COUNT(*) as room_count FROM rooms;

-- 3. Check if there are any rooms for the current user
-- SELECT rm.*, r.name, r.code 
-- FROM room_memberships rm 
-- JOIN rooms r ON rm.room_id = r.id 
-- WHERE rm.user_id = auth.uid();

-- 4. Check current user ID
-- SELECT auth.uid() as current_user_id;

-- Note: After debugging, you should re-enable RLS with:
-- ALTER TABLE room_memberships ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;