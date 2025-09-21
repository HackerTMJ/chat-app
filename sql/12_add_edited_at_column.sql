-- Add edited_at column to messages table if it doesn't exist
-- This fixes the "Could not find the 'edited_at' column" error

DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='edited_at') THEN
        -- Add the edited_at column
        ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
        
        -- Add comment for documentation
        COMMENT ON COLUMN messages.edited_at IS 'Timestamp when the message was last edited';
        
        -- Create index for performance if needed
        CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);
        
        RAISE NOTICE 'Added edited_at column to messages table';
    ELSE
        RAISE NOTICE 'edited_at column already exists in messages table';
    END IF;
END $$;