-- Migration: Efficient user rank lookup function
-- Date: 2026-02-03

CREATE OR REPLACE FUNCTION get_user_rank(p_challenge_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_rank INTEGER;
BEGIN
  SELECT rank INTO user_rank
  FROM (
    SELECT 
      user_id,
      RANK() OVER (ORDER BY total_steps DESC) as rank
    FROM step_challenge_participants
    WHERE challenge_id = p_challenge_id
  ) ranked
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(user_rank, 0);
END;
$$ LANGUAGE plpgsql;
