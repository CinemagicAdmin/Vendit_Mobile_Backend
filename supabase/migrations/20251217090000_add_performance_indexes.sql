-- =====================================================
-- ADD PERFORMANCE OPTIMIZATION INDEXES FROM DEV
-- These indexes improve query performance for common operations
-- =====================================================

-- Audit Logs - Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Payments - Tap integration and points tracking
CREATE INDEX IF NOT EXISTS idx_payments_tap_customer ON payments(tap_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_earned_points ON payments(earned_points);

-- Loyalty Points - Reason tracking
CREATE INDEX IF NOT EXISTS idx_loyalty_points_reason ON loyalty_points(reason);

-- Notifications - Sender tracking
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);

-- Users - Referral and Tap tracking
CREATE INDEX IF NOT EXISTS idx_users_tap_customer ON users(tap_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_user_id);

-- Referrals - Invited user and code tracking
CREATE INDEX IF NOT EXISTS idx_referrals_invited ON referrals(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code) WHERE referral_code IS NOT NULL;

-- Ratings - Payment relationship
CREATE INDEX IF NOT EXISTS idx_ratings_payment ON ratings(payment_id);
