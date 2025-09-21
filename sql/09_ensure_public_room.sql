-- Ensure PUBLIC room exists and user is a member
-- This fixes common issues where users aren't in any rooms

-- Create PUBLIC room if it doesn't exist
INSERT INTO rooms (code, name, created_by) 
VALUES ('PUBLIC', 'Public Chat', auth.uid())
ON CONFLICT (code) DO NOTHING;

-- Get the PUBLIC room ID
DO $$
DECLARE
    public_room_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT auth.uid() INTO current_user_id;
    
    -- Get PUBLIC room ID
    SELECT id INTO public_room_id FROM rooms WHERE code = 'PUBLIC';
    
    -- Ensure current user is a member of PUBLIC room
    IF public_room_id IS NOT NULL AND current_user_id IS NOT NULL THEN
        INSERT INTO room_memberships (room_id, user_id, role)
        VALUES (public_room_id, current_user_id, 'member')
        ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;
END $$;

-- Verify the setup
SELECT 
    r.id,
    r.code,
    r.name,
    rm.user_id,
    rm.role
FROM rooms r
LEFT JOIN room_memberships rm ON r.id = rm.room_id
WHERE r.code = 'PUBLIC';