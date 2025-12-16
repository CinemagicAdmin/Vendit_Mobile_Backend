-- =====================================================
-- FIX COLUMN MISMATCHES MIGRATION
-- Adds missing columns to match codebase expectations
-- Date: 2025-12-16
-- =====================================================

-- =====================================================
-- USERS TABLE - Add missing columns
-- =====================================================

-- Rename phone to phone_number if it exists as phone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users RENAME COLUMN phone TO phone_number;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tap_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_token TEXT;

-- =====================================================
-- CARDS TABLE - Add missing columns
-- =====================================================

ALTER TABLE cards ADD COLUMN IF NOT EXISTS tap_card_id VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS last4 VARCHAR(4);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS holder_name VARCHAR(255);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS exp_month VARCHAR(2);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS exp_year VARCHAR(4);

-- Add unique constraint for tap_card_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cards_user_id_tap_card_id_key'
  ) THEN
    ALTER TABLE cards ADD CONSTRAINT cards_user_id_tap_card_id_key UNIQUE (user_id, tap_card_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist with different name
  NULL;
END $$;

-- =====================================================
-- PAYMENTS TABLE - Add missing columns
-- =====================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS machine_u_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tap_customer_id VARCHAR(255);

-- Add foreign key constraint for machine_u_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_machine_u_id_fkey'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_machine_u_id_fkey 
    FOREIGN KEY (machine_u_id) REFERENCES machines(u_id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- =====================================================
-- PAYMENT_PRODUCTS TABLE - Add missing columns
-- =====================================================

ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS product_u_id VARCHAR(255);

-- Add foreign key constraint for product_u_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_products_product_u_id_fkey'
  ) THEN
    ALTER TABLE payment_products ADD CONSTRAINT payment_products_product_u_id_fkey 
    FOREIGN KEY (product_u_id) REFERENCES products(product_u_id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- =====================================================
-- RATINGS TABLE - Add missing columns
-- =====================================================

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS payment_id BIGINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS emoji VARCHAR(50);
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add foreign key constraint for payment_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ratings_payment_id_fkey'
  ) THEN
    ALTER TABLE ratings ADD CONSTRAINT ratings_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- =====================================================
-- LOYALTY TABLES - Create and fix
-- =====================================================

-- Create loyalty_points table if not exists (transaction log)
CREATE TABLE IF NOT EXISTS loyalty_points (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
    points DECIMAL(12,3) DEFAULT 0,
    type VARCHAR(50),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_loyalty_points table if not exists (balance table)
CREATE TABLE IF NOT EXISTS user_loyalty_points (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    points_balance DECIMAL(12,3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for loyalty tables
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_payment ON loyalty_points(payment_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON loyalty_points(type);
CREATE INDEX IF NOT EXISTS idx_user_loyalty_points_user ON user_loyalty_points(user_id);

-- Update loyalty_increment function to use correct table and column
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

-- =====================================================
-- CREATE WALLET_TRANSACTIONS TABLE IF NOT EXISTS
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
-- DONE
-- =====================================================
COMMENT ON TABLE user_loyalty_points IS 'User loyalty points balance - aggregate balance per user';
COMMENT ON TABLE loyalty_points IS 'Loyalty points transaction log - tracks individual point transactions';
COMMENT ON TABLE wallet_transactions IS 'Wallet transaction history - tracks credits and debits for user wallets';
