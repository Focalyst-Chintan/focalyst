-- ============================================================================
-- Focalyst Voice Notes · Azure PostgreSQL Schema
-- Safe to run more than once.
-- Preserves all columns from Supabase voice_notes and notes voice fields.
-- ============================================================================

create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text default 'Voice Note',
  audio_blob_url text,
  audio_url text,
  duration_seconds int default 0,
  transcript text,
  raw_transcript text,
  summary text,
  extracted_tasks jsonb default '[]'::jsonb,
  local_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user timeline retrieval ordered by newest first
create index if not exists idx_voice_notes_user_created
  on public.voice_notes (user_id, created_at desc);

-- Index on id and user_id for specific note lookups and ownership checks
create index if not exists idx_voice_notes_id_user
  on public.voice_notes (id, user_id);
