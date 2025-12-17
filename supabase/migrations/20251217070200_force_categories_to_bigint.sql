-- =====================================================
-- FORCE REVERT CATEGORIES ID TO BIGINT
-- This migration forcefully converts categories.id from UUID to BIGINT
-- =====================================================

-- Step 1: Drop FK constraint from products
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Step 2: Create a new table with the correct structure
CREATE TABLE IF NOT EXISTS categories_new (
    id BIGSERIAL PRIMARY KEY,
    category_u_id VARCHAR(255),
    category_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Copy data from old table (ignoring the UUID id)
INSERT INTO categories_new (category_name, description, icon_url, is_active, created_at, updated_at, category_u_id)
SELECT category_name, description, icon_url, is_active, created_at, updated_at, category_u_id
FROM categories
ON CONFLICT (category_name) DO NOTHING;

-- Step 4: Create mapping from old UUID to new BIGINT id
CREATE TEMP TABLE categories_mapping AS
SELECT c.id AS old_uuid, cn.id AS new_bigint
FROM categories c
JOIN categories_new cn ON c.category_name = cn.category_name;

-- Step 5: Update products.category_id from UUID to BIGINT
-- First, add a temp column
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id_new BIGINT;

-- Update with mapped values
UPDATE products p
SET category_id_new = m.new_bigint
FROM categories_mapping m
WHERE p.category_id::text = m.old_uuid::text;

-- Step 6: Drop old category_id and rename new one
ALTER TABLE products DROP COLUMN IF EXISTS category_id;
ALTER TABLE products RENAME COLUMN category_id_new TO category_id;

-- Step 7: Drop old categories table and rename new one
DROP TABLE IF EXISTS categories CASCADE;
ALTER TABLE categories_new RENAME TO categories;

-- Step 8: Re-add FK constraint
ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Cleanup
DROP TABLE IF EXISTS categories_mapping;
