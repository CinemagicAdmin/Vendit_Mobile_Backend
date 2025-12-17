-- =====================================================
-- FIX LOYALTY FUNCTION AND TABLE - ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to user_loyalty_points
ALTER TABLE user_loyalty_points ADD COLUMN IF NOT EXISTS total_points_earned DECIMAL(12,3) DEFAULT 0;
ALTER TABLE user_loyalty_points ADD COLUMN IF NOT EXISTS total_points_redeemed DECIMAL(12,3) DEFAULT 0;

-- Drop existing function first (has different return type)
DROP FUNCTION IF EXISTS loyalty_increment(UUID, NUMERIC);

-- Update the loyalty_increment function to match dev (better version with tracking)
CREATE OR REPLACE FUNCTION loyalty_increment(p_user_id UUID, p_points NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    -- Try to update existing record
    UPDATE user_loyalty_points
    SET 
        points_balance = points_balance + p_points,
        total_points_earned = CASE WHEN p_points > 0 THEN total_points_earned + p_points ELSE total_points_earned END,
        total_points_redeemed = CASE WHEN p_points < 0 THEN total_points_redeemed + ABS(p_points) ELSE total_points_redeemed END,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING points_balance INTO v_balance;
    
    -- If no rows updated, insert new record
    IF NOT FOUND THEN
        INSERT INTO user_loyalty_points (user_id, points_balance, total_points_earned, total_points_redeemed)
        VALUES (
            p_user_id, 
            GREATEST(p_points, 0), 
            GREATEST(p_points, 0), 
            CASE WHEN p_points < 0 THEN ABS(p_points) ELSE 0 END
        )
        RETURNING points_balance INTO v_balance;
    END IF;
    
    RETURN v_balance;
END;
$$;
