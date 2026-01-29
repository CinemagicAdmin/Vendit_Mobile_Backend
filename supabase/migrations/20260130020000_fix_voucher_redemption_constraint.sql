-- Drop unique constraint that prevents multiple redemptions per user
-- The max_uses_per_user limit is enforced in application logic via getUserRedemptionCount

ALTER TABLE voucher_redemptions
DROP CONSTRAINT IF EXISTS unique_user_voucher;

-- Add composite index for efficient lookup of user's redemptions for a voucher
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_voucher 
ON voucher_redemptions(voucher_id, user_id);
