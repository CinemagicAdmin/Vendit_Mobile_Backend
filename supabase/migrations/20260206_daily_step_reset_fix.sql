-- Daily Step Reset Fix
-- Adds fields to properly track daily step counts from health apps
-- Fixes issue where Day 2+ submissions were incorrectly rejected

-- Add new columns to track daily snapshots and sync dates
ALTER TABLE step_challenge_participants
  ADD COLUMN IF NOT EXISTS last_daily_steps_snapshot INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_date DATE;

-- Add index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_participants_last_sync 
  ON step_challenge_participants(last_sync_date);

-- Add comments
COMMENT ON COLUMN step_challenge_participants.last_daily_steps_snapshot IS 'Last reported daily step count from health app (resets daily)';
COMMENT ON COLUMN step_challenge_participants.last_sync_date IS 'Date of last successful sync (used to detect daily resets)';
