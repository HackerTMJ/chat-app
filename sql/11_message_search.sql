-- Message Search Functionality Database Setup
-- Adds full-text search capabilities to messages

-- Add full-text search index to messages content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts 
ON messages USING gin(to_tsvector('english', content));

-- Add full-text search index to profiles username
CREATE INDEX IF NOT EXISTS idx_profiles_username_fts 
ON profiles USING gin(to_tsvector('english', username));

-- Add indexes for search filtering
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_room ON messages(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);

-- Function to search messages with filters
CREATE OR REPLACE FUNCTION search_messages(
  search_query TEXT,
  user_id_param UUID,
  room_id_param UUID DEFAULT NULL,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL,
  search_user_id UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  room_id UUID,
  username TEXT,
  room_name TEXT,
  room_code TEXT,
  rank REAL
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.created_at,
    m.user_id,
    m.room_id,
    p.username,
    r.name as room_name,
    r.code as room_code,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) as rank
  FROM messages m
  INNER JOIN profiles p ON m.user_id = p.id
  INNER JOIN rooms r ON m.room_id = r.id
  INNER JOIN room_memberships rm ON r.id = rm.room_id AND rm.user_id = user_id_param
  WHERE 
    -- Text search (search in both message content and username)
    -- Use ILIKE for partial matching and full-text search for better results
    (search_query = '' OR 
     m.content ILIKE '%' || search_query || '%' OR
     p.username ILIKE '%' || search_query || '%' OR
     to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query) OR
     to_tsvector('english', p.username) @@ plainto_tsquery('english', search_query))
    -- Room filter
    AND (room_id_param IS NULL OR m.room_id = room_id_param)
    -- Date range filter
    AND (start_date IS NULL OR m.created_at >= start_date)
    AND (end_date IS NULL OR m.created_at <= end_date)
    -- User filter
    AND (search_user_id IS NULL OR m.user_id = search_user_id)
  ORDER BY 
    CASE 
      WHEN search_query = '' THEN 0
      ELSE ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query))
    END DESC,
    m.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Function to count search results
CREATE OR REPLACE FUNCTION count_search_messages(
  search_query TEXT,
  user_id_param UUID,
  room_id_param UUID DEFAULT NULL,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL,
  search_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO result_count
  FROM messages m
  INNER JOIN profiles p ON m.user_id = p.id
  INNER JOIN room_memberships rm ON m.room_id = rm.room_id AND rm.user_id = user_id_param
  WHERE 
    -- Text search (search in both message content and username)
    -- Use ILIKE for partial matching and full-text search for better results
    (search_query = '' OR 
     m.content ILIKE '%' || search_query || '%' OR
     p.username ILIKE '%' || search_query || '%' OR
     to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query) OR
     to_tsvector('english', p.username) @@ plainto_tsquery('english', search_query))
    -- Room filter
    AND (room_id_param IS NULL OR m.room_id = room_id_param)
    -- Date range filter
    AND (start_date IS NULL OR m.created_at >= start_date)
    AND (end_date IS NULL OR m.created_at <= end_date)
    -- User filter
    AND (search_user_id IS NULL OR m.user_id = search_user_id);
    
  RETURN result_count;
END;
$$;

-- Function to get recent search terms (for search suggestions)
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_count INTEGER DEFAULT 1,
  last_searched TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, search_query)
);

-- Index for search history
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, last_searched DESC);

-- Function to save search history
CREATE OR REPLACE FUNCTION save_search_history(
  user_id_param UUID,
  search_query_param TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Don't save empty searches
  IF search_query_param = '' OR search_query_param IS NULL THEN
    RETURN;
  END IF;
  
  -- Update existing or insert new
  INSERT INTO search_history (user_id, search_query, search_count, last_searched)
  VALUES (user_id_param, search_query_param, 1, NOW())
  ON CONFLICT (user_id, search_query) 
  DO UPDATE SET 
    search_count = search_history.search_count + 1,
    last_searched = NOW();
END;
$$;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
  search_query TEXT,
  search_count INTEGER,
  last_searched TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sh.search_query,
    sh.search_count,
    sh.last_searched
  FROM search_history sh
  WHERE sh.user_id = user_id_param
  ORDER BY sh.search_count DESC, sh.last_searched DESC
  LIMIT limit_param;
END;
$$;

-- Function to delete a single search history item
CREATE OR REPLACE FUNCTION delete_search_history_item(
  user_id_param UUID,
  search_query_param TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM search_history 
  WHERE user_id = user_id_param AND search_query = search_query_param;
END;
$$;

-- Function to clear all search history for a user
CREATE OR REPLACE FUNCTION clear_all_search_history(
  user_id_param UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM search_history 
  WHERE user_id = user_id_param;
END;
$$;