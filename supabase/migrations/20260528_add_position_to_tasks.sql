-- Migration: Add position column to tasks table for reordering support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Index to optimize querying ordered tasks
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
