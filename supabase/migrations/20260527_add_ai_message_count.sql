-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter users table to track daily message counts and last message timestamp
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_message_count INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_message_date TIMESTAMPTZ DEFAULT NOW();

-- Alter profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_message_count INT DEFAULT 0;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_message_date TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add embedding vector column to notes table (768 dimensions for Gemini text-embedding-004)
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create a helper function for notes vector similarity search (RAG)
CREATE OR REPLACE FUNCTION public.match_notes (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.title,
    notes.content,
    1 - (notes.embedding <=> query_embedding) AS similarity
  FROM notes
  WHERE notes.user_id = p_user_id
    AND notes.is_deleted = false
    AND notes.embedding IS NOT NULL
    AND 1 - (notes.embedding <=> query_embedding) > match_threshold
  ORDER BY notes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
