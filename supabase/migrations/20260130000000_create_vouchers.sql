-- Vouchers Module
-- Create voucher system for wallet credits with QR code generation

-- Vouchers table
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  amount DECIMAL(10,3) NOT NULL CHECK (amount > 0),
  qr_code_url TEXT,
  max_uses_per_user INT DEFAULT 1 CHECK (max_uses_per_user > 0),
  max_total_uses INT CHECK (max_total_uses IS NULL OR max_total_uses > 0),
  current_total_uses INT DEFAULT 0 CHECK (current_total_uses >= 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (valid_from < valid_until)
);

-- Indexes for performance
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_active ON vouchers(is_active);
CREATE INDEX idx_vouchers_validity ON vouchers(valid_from, valid_until);
CREATE INDEX idx_vouchers_created_by ON vouchers(created_by_admin_id);

-- Voucher redemptions tracking
CREATE TABLE voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  amount_credited DECIMAL(10,3) NOT NULL CHECK (amount_credited > 0),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate redemptions per user per voucher
  CONSTRAINT unique_user_voucher UNIQUE(voucher_id, user_id)
);

-- Indexes for voucher redemptions
CREATE INDEX idx_voucher_redemptions_voucher ON voucher_redemptions(voucher_id);
CREATE INDEX idx_voucher_redemptions_user ON voucher_redemptions(user_id);
CREATE INDEX idx_voucher_redemptions_date ON voucher_redemptions(redeemed_at);

-- Atomic increment function to prevent race conditions
CREATE OR REPLACE FUNCTION increment_voucher_usage(
  p_voucher_id UUID,
  p_max_uses INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Increment usage count only if limit not exceeded
  UPDATE vouchers
  SET current_total_uses = current_total_uses + 1,
      updated_at = NOW()
  WHERE id = p_voucher_id
    AND (p_max_uses IS NULL OR current_total_uses < p_max_uses);
  
  -- Return true if row was updated, false otherwise
  RETURN FOUND;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE vouchers IS 'Voucher codes that users can redeem for wallet credits';
COMMENT ON TABLE voucher_redemptions IS 'Tracks all voucher redemptions with user and wallet references';
COMMENT ON FUNCTION increment_voucher_usage IS 'Atomically increments voucher usage count, prevents overselling';
