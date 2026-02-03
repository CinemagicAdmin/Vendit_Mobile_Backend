-- Migration: Add unique constraint to user_badges
-- Date: 2026-02-03

ALTER TABLE user_badges 
ADD CONSTRAINT unique_user_challenge_badge 
UNIQUE (user_id, challenge_id, badge_name);
