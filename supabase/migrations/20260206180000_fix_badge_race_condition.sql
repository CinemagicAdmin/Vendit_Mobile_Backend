-- Fix Badge Race Condition
-- Adds unique constraint to prevent duplicate badges from concurrent requests

-- Add unique constraint (idempotent - checks if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_challenge_badge'
  ) THEN
    ALTER TABLE user_badges
      ADD CONSTRAINT unique_user_challenge_badge 
      UNIQUE(user_id, challenge_id, badge_name);
  END IF;
END $$;
