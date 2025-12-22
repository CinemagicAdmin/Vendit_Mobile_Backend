-- Add order reference system to payments table
-- This migration adds user-friendly order references like ORD-00001234
-- Safe to re-run - uses IF NOT EXISTS and OR REPLACE

-- Step 1: Add order_reference column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'order_reference'
    ) THEN
        ALTER TABLE payments ADD COLUMN order_reference VARCHAR(20);
    END IF;
END $$;

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
DO $$
DECLARE
    payment_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR payment_record IN 
        SELECT id FROM payments WHERE order_reference IS NULL ORDER BY created_at ASC
    LOOP
        UPDATE payments 
        SET order_reference = 'ORD-' || LPAD((counter + 999)::TEXT, 8, '0')
        WHERE id = payment_record.id;
        counter := counter + 1;
    END LOOP;
    
    -- Update sequence to continue from where we left off
    IF counter > 1 THEN
        PERFORM setval('order_reference_seq', counter + 999);
    END IF;
END $$;

-- Step 7: Add index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_payments_order_reference ON payments(order_reference);

-- Step 8: Add unique constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_order_reference_key'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT payments_order_reference_key UNIQUE (order_reference);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 9: Add comment
COMMENT ON COLUMN payments.order_reference IS 'User-friendly order reference (e.g., ORD-00001234)';
