-- Create reports table to store pre-generated weekly productivity reports
CREATE TABLE IF NOT EXISTS reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date          TIMESTAMPTZ NOT NULL,
  end_date            TIMESTAMPTZ NOT NULL,
  score               INTEGER NOT NULL,
  focus_time          TEXT NOT NULL,
  tasks_completed     INTEGER NOT NULL,
  habit_consistency   TEXT NOT NULL,
  week_summary_text   TEXT NOT NULL,
  catalyst_insights   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can manage (SELECT/DELETE/etc.) their own reports
CREATE POLICY "Users can manage own reports"
  ON reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_start_end ON reports(user_id, start_date, end_date);
