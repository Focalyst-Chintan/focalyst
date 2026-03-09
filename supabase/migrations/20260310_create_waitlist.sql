-- Waitlist table for tracking Pro/Lifetime interest
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_interest TEXT NOT NULL CHECK (plan_interest IN ('pro', 'lifetime')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_interest)
);

-- Allow authenticated users to insert their own entries
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own waitlist entry"
  ON waitlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own waitlist entry"
  ON waitlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
