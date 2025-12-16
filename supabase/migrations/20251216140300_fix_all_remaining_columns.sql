-- =====================================================
-- COMPREHENSIVE FIX FOR ALL REMAINING TABLE MISMATCHES
-- =====================================================

-- =====================================================
-- CARTS TABLE - Add missing columns
-- The code expects cart to have machine_u_id, slot_number, product_u_id, unit_price
-- =====================================================

ALTER TABLE carts ADD COLUMN IF NOT EXISTS machine_u_id VARCHAR(255);
ALTER TABLE carts ADD COLUMN IF NOT EXISTS slot_number VARCHAR(50);
ALTER TABLE carts ADD COLUMN IF NOT EXISTS product_u_id VARCHAR(255);
ALTER TABLE carts ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);

-- Add unique constraint for cart items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'carts_user_machine_slot_product_key'
  ) THEN
    ALTER TABLE carts ADD CONSTRAINT carts_user_machine_slot_product_key 
    UNIQUE (user_id, machine_u_id, slot_number, product_u_id);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- =====================================================
-- CAMPAIGN_VIEWS TABLE - Add unique constraint
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campaign_views_user_campaign_key'
  ) THEN
    ALTER TABLE campaign_views ADD CONSTRAINT campaign_views_user_campaign_key 
    UNIQUE (user_id, campaign_id);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- =====================================================
-- WALLET_TRANSACTIONS TABLE - Ensure it exists
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Credit', 'Debit', 'credit', 'debit')),
  amount NUMERIC(10, 3) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- =====================================================
-- LOYALTY_POINTS TABLE - Ensure all columns exist
-- =====================================================

ALTER TABLE loyalty_points ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE loyalty_points ADD COLUMN IF NOT EXISTS reason TEXT;

-- =====================================================
-- USER_LOYALTY_POINTS TABLE - Ensure points_balance exists
-- =====================================================

ALTER TABLE user_loyalty_points ADD COLUMN IF NOT EXISTS points_balance DECIMAL(12,3) DEFAULT 0;

-- =====================================================
-- RATINGS TABLE - Add index for payment_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ratings_payment ON ratings(payment_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order ON ratings(order_id);

-- =====================================================
-- PAYMENTS TABLE - Add indexes for foreign keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payments_machine_u_id ON payments(machine_u_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge_id ON payments(charge_id);

-- =====================================================
-- CARDS TABLE - Add index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_tap_card_id ON cards(tap_card_id);

-- =====================================================
-- DONE
-- =====================================================
