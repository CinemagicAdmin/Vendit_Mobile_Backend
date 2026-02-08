-- Migration: Add unique constraint to user_badges (idempotent)
-- Date: 2026-02-03

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_challenge_badge'
  ) THEN
    ALTER TABLE user_badges 
    ADD CONSTRAINT unique_user_challenge_badge 
    UNIQUE (user_id, challenge_id, badge_name);
  END IF;
END $$;
