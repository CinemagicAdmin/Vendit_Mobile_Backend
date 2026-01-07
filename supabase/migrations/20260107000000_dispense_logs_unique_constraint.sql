-- Prevent concurrent dispense attempts for the same payment
-- This ensures only one active (pending or sent) dispense attempt exists per payment
-- Prevents race condition where two requests could both pass idempotency check

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispense_logs_payment_active
ON dispense_logs(payment_id)
WHERE status IN ('pending', 'sent');

COMMENT ON INDEX idx_dispense_logs_payment_active IS 
'Ensures only one active dispense attempt per payment - prevents race conditions';
