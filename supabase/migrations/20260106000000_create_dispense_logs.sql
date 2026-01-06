-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create dispense_logs table for tracking all dispense attempts
CREATE TABLE IF NOT EXISTS dispense_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  slot_number TEXT NOT NULL,
  product_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
  attempt_count INTEGER DEFAULT 1,
  error_message TEXT,
  websocket_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dispense_logs_payment ON dispense_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_dispense_logs_status ON dispense_logs(status);
CREATE INDEX IF NOT EXISTS idx_dispense_logs_machine ON dispense_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_dispense_logs_created ON dispense_logs(created_at DESC);

-- Add dispensed_at timestamp to payment_products
ALTER TABLE payment_products 
ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON TABLE dispense_logs IS 'Tracks all dispense attempts for audit and debugging';
COMMENT ON COLUMN dispense_logs.status IS 'pending: created, sent: WebSocket sent, confirmed: acknowledged, failed: error occurred';
