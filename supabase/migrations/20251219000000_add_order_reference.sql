-- Add order reference system to payments table
-- This migration adds user-friendly order references like ORD-00001234

-- Step 1: Add order_reference column
ALTER TABLE payments 
ADD COLUMN order_reference VARCHAR(20) UNIQUE;

-- Step 2: Create sequence for order numbers (starting at 1000)
CREATE SEQUENCE IF NOT EXISTS order_reference_seq START WITH 1000;

-- Step 3: Create function to generate order reference
CREATE OR REPLACE FUNCTION generate_order_reference()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
    ref_number BIGINT;
    ref_string VARCHAR(20);
BEGIN
    ref_number := nextval('order_reference_seq');
    ref_string := 'ORD-' || LPAD(ref_number::TEXT, 8, '0');
    RETURN ref_string;
END;
$$;

-- Step 4: Create trigger function to auto-generate order reference
CREATE OR REPLACE FUNCTION set_order_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.order_reference IS NULL THEN
        NEW.order_reference := generate_order_reference();
    END IF;
    RETURN NEW;
END;
$$;

-- Step 5: Create trigger on payments table
DROP TRIGGER IF EXISTS trigger_set_order_reference ON payments;
CREATE TRIGGER trigger_set_order_reference
BEFORE INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION set_order_reference();

-- Step 6: Backfill existing orders with order references
-- This will generate references for all existing payments
DO $$
DECLARE
    payment_record RECORD;
BEGIN
    FOR payment_record IN 
        SELECT id FROM payments WHERE order_reference IS NULL ORDER BY created_at ASC
    LOOP
        UPDATE payments 
        SET order_reference = generate_order_reference()
        WHERE id = payment_record.id;
    END LOOP;
END $$;

-- Step 7: Add index for performance
CREATE INDEX idx_payments_order_reference ON payments(order_reference);

-- Step 8: Add comment
COMMENT ON COLUMN payments.order_reference IS 'User-friendly order reference (e.g., ORD-00001234)';
