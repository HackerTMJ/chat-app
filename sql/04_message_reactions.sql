-- Message Reactions Table
-- This table stores emoji reactions that users can add to messages

CREATE TABLE message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL, -- Emoji unicode or shortcode like '👍', '❤️', ':heart:'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one reaction per user per message per emoji
  UNIQUE(message_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_message_reactions_emoji ON message_reactions(emoji);

-- RLS (Row Level Security) policies
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read all reactions
CREATE POLICY "Anyone can view message reactions" ON message_reactions
  FOR SELECT USING (true);

-- Users can add reactions to messages in any room they can access
CREATE POLICY "Users can add reactions to accessible messages" ON message_reactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Function to get reaction counts for messages
CREATE OR REPLACE FUNCTION get_message_reactions(message_ids UUID[])
RETURNS TABLE (
  message_id UUID,
  emoji TEXT,
  count BIGINT,
  user_reacted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.message_id,
    mr.emoji,
    COUNT(*) as count,
    BOOL_OR(mr.user_id = auth.uid()) as user_reacted
  FROM message_reactions mr
  WHERE mr.message_id = ANY(message_ids)
  GROUP BY mr.message_id, mr.emoji
  ORDER BY mr.message_id, count DESC, mr.emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;