-- Create table for storing KNET saved tokens (KFAST)
-- Tokens are returned by Tap after successful KNET payments with saveCard:true

CREATE TABLE IF NOT EXISTS knet_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tap_customer_id TEXT NOT NULL,
  token_id TEXT NOT NULL, -- tok_xxx from Tap
  last_four TEXT, -- Last 4 digits if available
  brand TEXT, -- Card brand if available
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one token per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_knet_tokens_user_token 
  ON knet_tokens(user_id, token_id);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_knet_tokens_user_id 
  ON knet_tokens(user_id);

-- Index for lookups by customer ID
CREATE INDEX IF NOT EXISTS idx_knet_tokens_customer_id 
  ON knet_tokens(tap_customer_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knet_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knet_tokens_updated_at
  BEFORE UPDATE ON knet_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_knet_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE knet_tokens IS 'Stores KNET saved card tokens from Tap for KFAST repeat payments';
COMMENT ON COLUMN knet_tokens.token_id IS 'Tap saved card token (tok_xxx) returned after KNET payment with save_card:true';
