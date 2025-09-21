-- Add missing DELETE policy for messages
-- This allows users to delete their own messages

CREATE POLICY "Users can delete own messages" ON messages 
    FOR DELETE USING (auth.uid() = user_id);