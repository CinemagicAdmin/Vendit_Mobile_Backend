-- Migration: Atomic toggle function for challenge status
-- Date: 2026-02-03

CREATE OR REPLACE FUNCTION toggle_challenge_status(p_challenge_id UUID)
RETURNS TABLE(id UUID, is_active BOOLEAN, updated_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  UPDATE step_challenges
  SET is_active = NOT step_challenges.is_active,
      updated_at = NOW()
  WHERE step_challenges.id = p_challenge_id
  RETURNING step_challenges.id, step_challenges.is_active, step_challenges.updated_at;
END;
$$ LANGUAGE plpgsql;
