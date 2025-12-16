-- Create wallet_transactions table
-- This table tracks wallet credits and debits

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Credit', 'Debit', 'credit', 'debit')),
  amount NUMERIC(10, 3) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Add table comment
COMMENT ON TABLE wallet_transactions IS 'Wallet transaction history - tracks credits and debits for user wallets';

