-- Prevent concurrent dispense attempts for the same payment
-- This ensures only one active (pending or sent) dispense attempt exists per payment
-- Prevents race condition where two requests could both pass idempotency check

-- Step 1: Clean up existing duplicates
-- Keep only the most recent log for each payment_id + slot_number with active status
DELETE FROM dispense_logs
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY payment_id, slot_number
        ORDER BY created_at DESC
      ) as rn
    FROM dispense_logs
    WHERE status IN ('pending', 'sent')
  ) sub
  WHERE rn > 1
);

-- Drop old constraint if exists (might be wrong)
DROP INDEX IF EXISTS idx_dispense_logs_payment_active;

-- Step 2: Create unique index per payment + slot (allows batch dispenses)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dispense_logs_payment_slot_active
ON dispense_logs(payment_id, slot_number)
WHERE status IN ('pending', 'sent');

COMMENT ON INDEX idx_dispense_logs_payment_slot_active IS 
'Ensures only one active dispense attempt per payment+slot - prevents race conditions while allowing batch dispenses';
