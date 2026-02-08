-- Fix leaderboard profile URL to return full storage URL
-- The user_profile column stores relative path, need to construct full URL

DROP FUNCTION IF EXISTS get_challenge_leaderboard(UUID, INT);

CREATE OR REPLACE FUNCTION get_challenge_leaderboard(
  p_challenge_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  user_name TEXT,
  user_profile TEXT,
  total_steps INT,
  last_update TIMESTAMPTZ
) AS $$
DECLARE
  storage_base_url TEXT := 'https://glehkduvpzemfedfsjaq.supabase.co/storage/v1/object/public/users/';
BEGIN
  RETURN QUERY
  SELECT 
    RANK() OVER (ORDER BY p.total_steps DESC) as rank,
    p.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as user_name,
    CASE 
      WHEN u.user_profile IS NOT NULL AND u.user_profile != '' 
      THEN storage_base_url || u.user_profile
      ELSE NULL
    END as user_profile,
    p.total_steps,
    p.last_step_update as last_update
  FROM step_challenge_participants p
  JOIN users u ON u.id = p.user_id
  WHERE p.challenge_id = p_challenge_id
  ORDER BY p.total_steps DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_challenge_leaderboard(UUID, INT) IS 'Returns ranked leaderboard with full user profile picture URLs';
