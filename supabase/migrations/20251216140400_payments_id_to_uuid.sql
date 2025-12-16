-- =====================================================
-- CHANGE PAYMENTS ID TO UUID
-- This is a significant schema change affecting multiple tables
-- =====================================================

-- Step 1: Drop foreign key constraints that reference payments.id
ALTER TABLE payment_products DROP CONSTRAINT IF EXISTS payment_products_payment_id_fkey;
ALTER TABLE loyalty_points DROP CONSTRAINT IF EXISTS loyalty_points_payment_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_order_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_payment_id_fkey;
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_payment_id_fkey;

-- Drop any legacy constraints from old table names
ALTER TABLE user_loyalty_points DROP CONSTRAINT IF EXISTS user_loyality_points_payment_id_fkey;
ALTER TABLE user_loyalty_points DROP CONSTRAINT IF EXISTS user_loyalty_points_payment_id_fkey;
DROP TABLE IF EXISTS user_loyality_points CASCADE;

-- Step 2: Add new UUID column to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();

-- Step 3: Make new_id not null and unique
UPDATE payments SET new_id = gen_random_uuid() WHERE new_id IS NULL;
ALTER TABLE payments ALTER COLUMN new_id SET NOT NULL;

-- Step 4: Create mapping table for old_id -> new_id
CREATE TEMP TABLE payments_id_mapping AS
SELECT id AS old_id, new_id FROM payments;

-- Step 5: Add UUID columns to referencing tables
ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS new_payment_id UUID;
ALTER TABLE loyalty_points ADD COLUMN IF NOT EXISTS new_payment_id UUID;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS new_order_id UUID;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS new_payment_id UUID;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS new_payment_id UUID;

-- Step 6: Update referencing tables with new UUIDs
UPDATE payment_products pp
SET new_payment_id = m.new_id
FROM payments_id_mapping m
WHERE pp.payment_id = m.old_id;

UPDATE loyalty_points lp
SET new_payment_id = m.new_id
FROM payments_id_mapping m
WHERE lp.payment_id = m.old_id;

UPDATE ratings r
SET new_order_id = m.new_id
FROM payments_id_mapping m
WHERE r.order_id = m.old_id;

UPDATE ratings r
SET new_payment_id = m.new_id
FROM payments_id_mapping m
WHERE r.payment_id = m.old_id;

UPDATE wallet_transactions wt
SET new_payment_id = m.new_id
FROM payments_id_mapping m
WHERE wt.payment_id = m.old_id;

-- Step 7: Drop old columns and rename new ones
-- Payments table
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE payments DROP COLUMN IF EXISTS id;
ALTER TABLE payments RENAME COLUMN new_id TO id;
ALTER TABLE payments ADD PRIMARY KEY (id);

-- Payment_products
ALTER TABLE payment_products DROP COLUMN IF EXISTS payment_id;
ALTER TABLE payment_products RENAME COLUMN new_payment_id TO payment_id;

-- Loyalty_points
ALTER TABLE loyalty_points DROP COLUMN IF EXISTS payment_id;
ALTER TABLE loyalty_points RENAME COLUMN new_payment_id TO payment_id;

-- Ratings
ALTER TABLE ratings DROP COLUMN IF EXISTS order_id;
ALTER TABLE ratings DROP COLUMN IF EXISTS payment_id;
ALTER TABLE ratings RENAME COLUMN new_order_id TO order_id;
ALTER TABLE ratings RENAME COLUMN new_payment_id TO payment_id;

-- Wallet_transactions - payment_id was already UUID, just ensure it's correct
ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS payment_id;
ALTER TABLE wallet_transactions RENAME COLUMN new_payment_id TO payment_id;

-- Step 8: Re-add foreign key constraints
ALTER TABLE payment_products ADD CONSTRAINT payment_products_payment_id_fkey 
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

ALTER TABLE loyalty_points ADD CONSTRAINT loyalty_points_payment_id_fkey 
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

ALTER TABLE ratings ADD CONSTRAINT ratings_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES payments(id) ON DELETE CASCADE;

ALTER TABLE ratings ADD CONSTRAINT ratings_payment_id_fkey 
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_payment_id_fkey 
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Step 9: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_payments_id ON payments(id);
CREATE INDEX IF NOT EXISTS idx_payment_products_payment_id ON payment_products(payment_id);

-- Drop temp table
DROP TABLE IF EXISTS payments_id_mapping;
