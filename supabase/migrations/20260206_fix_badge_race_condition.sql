-- Fix Badge Race Condition
-- Adds unique constraint to prevent duplicate badges from concurrent requests

-- Add unique constraint
ALTER TABLE user_badges
  ADD CONSTRAINT unique_user_challenge_badge 
  UNIQUE(user_id, challenge_id, badge_name);

-- Add constraint comment
COMMENT ON CONSTRAINT unique_user_challenge_badge ON user_badges 
  IS 'Prevents race condition where concurrent step submissions award duplicate badges';
