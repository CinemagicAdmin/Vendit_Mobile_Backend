-- =====================================================
-- Discount Coupon System Migration
-- =====================================================
-- Creates tables for discount coupons with admin management
-- and user redemption tracking
-- =====================================================

-- Create discount_coupons table
CREATE TABLE discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Coupon Details
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Discount Configuration
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value DECIMAL(10,3) NOT NULL CHECK (discount_value > 0),
    
    -- Constraints
    min_purchase_amount DECIMAL(10,3) DEFAULT 0 CHECK (min_purchase_amount >= 0),
    max_discount_amount DECIMAL(10,3) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    
    -- Usage Limits
    max_uses_per_user INTEGER DEFAULT 1 CHECK (max_uses_per_user > 0),
    max_total_uses INTEGER CHECK (max_total_uses IS NULL OR max_total_uses > 0),
    current_total_uses INTEGER DEFAULT 0 CHECK (current_total_uses >= 0),
    
    -- Validity Period
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL CHECK (valid_until > valid_from),
    
    -- Status & Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for discount_coupons
CREATE INDEX idx_coupons_code ON discount_coupons(code);
CREATE INDEX idx_coupons_active_dates ON discount_coupons(is_active, valid_from, valid_until) 
WHERE is_active = TRUE;
CREATE INDEX idx_coupons_created_by ON discount_coupons(created_by_admin_id);

-- Add comment
COMMENT ON TABLE discount_coupons IS 'Discount coupons managed by admins for user redemption';

-- Create coupon_usage table
CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    coupon_id UUID NOT NULL REFERENCES discount_coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    
    -- Usage Details
    discount_applied DECIMAL(10,3) NOT NULL CHECK (discount_applied >= 0),
    original_amount DECIMAL(10,3) NOT NULL CHECK (original_amount >= 0),
    final_amount DECIMAL(10,3) NOT NULL CHECK (final_amount >= 0),
    
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate redemptions
    UNIQUE(coupon_id, user_id, payment_id)
);

-- Create indexes for coupon_usage
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_payment ON coupon_usage(payment_id);
CREATE INDEX idx_coupon_usage_date ON coupon_usage(used_at);

-- Add comment
COMMENT ON TABLE coupon_usage IS 'Tracks coupon redemptions and application history';

-- Modify payments table to track coupons
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES discount_coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,3) DEFAULT 0 CHECK (discount_amount >= 0),
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,3);

-- Create index on payments.coupon_id
CREATE INDEX IF NOT EXISTS idx_payments_coupon ON payments(coupon_id);

-- Add comment to columns
COMMENT ON COLUMN payments.coupon_id IS 'Reference to applied discount coupon';
COMMENT ON COLUMN payments.discount_amount IS 'Discount amount from coupon (KWD)';
COMMENT ON COLUMN payments.original_amount IS 'Original cart amount before discount (KWD)';

-- Create function to atomically increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(
    p_coupon_id UUID,
    p_max_total_uses INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_uses INTEGER;
BEGIN
    -- Lock the row for update
    SELECT current_total_uses INTO v_current_uses
    FROM discount_coupons
    WHERE id = p_coupon_id
    FOR UPDATE;
    
    -- Check if limit would be exceeded
    IF p_max_total_uses IS NOT NULL AND v_current_uses >= p_max_total_uses THEN
        RETURN FALSE;
    END IF;
    
    -- Increment usage count
    UPDATE discount_coupons
    SET current_total_uses = current_total_uses + 1,
        updated_at = NOW()
    WHERE id = p_coupon_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_coupon_usage IS 'Atomically increment coupon usage count with limit check';
