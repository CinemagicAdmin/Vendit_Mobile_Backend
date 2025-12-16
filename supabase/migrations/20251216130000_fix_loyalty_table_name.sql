-- Ensure the loyalty_increment function uses correct table and column names
-- This migration maintains the function with the proper schema

CREATE OR REPLACE FUNCTION loyalty_increment(p_user_id UUID, p_points NUMERIC)
RETURNS TABLE(balance NUMERIC) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE user_loyalty_points SET points_balance = COALESCE(user_loyalty_points.points_balance, 0) + p_points, updated_at = NOW()
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_loyalty_points (user_id, points_balance) VALUES (p_user_id, p_points);
  END IF;
  RETURN QUERY SELECT user_loyalty_points.points_balance FROM user_loyalty_points WHERE user_id = p_user_id;
END;
$$;

-- Update table comments
COMMENT ON TABLE user_loyalty_points IS 'User loyalty points balance - aggregate balance per user';
COMMENT ON TABLE loyalty_points IS 'Loyalty points transaction log - tracks individual point transactions';
