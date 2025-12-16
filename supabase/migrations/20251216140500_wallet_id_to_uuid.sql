-- =====================================================
-- CHANGE WALLET ID TO UUID
-- =====================================================

-- Step 1: Add new UUID column to wallet
ALTER TABLE wallet ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();

-- Step 2: Make new_id not null
UPDATE wallet SET new_id = gen_random_uuid() WHERE new_id IS NULL;
ALTER TABLE wallet ALTER COLUMN new_id SET NOT NULL;

-- Step 3: Drop old primary key and column, rename new one
ALTER TABLE wallet DROP CONSTRAINT IF EXISTS wallet_pkey;
ALTER TABLE wallet DROP COLUMN IF EXISTS id;
ALTER TABLE wallet RENAME COLUMN new_id TO id;
ALTER TABLE wallet ADD PRIMARY KEY (id);

-- Make sure id is first column visually (optional, just for cleanliness)
-- PostgreSQL doesn't support column reordering, so the column stays where it is
