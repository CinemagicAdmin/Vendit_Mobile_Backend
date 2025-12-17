-- =====================================================
-- REVERT CATEGORIES ID BACK TO BIGSERIAL
-- The category list API should return numeric IDs
-- =====================================================

DO $$
DECLARE
    max_old_id BIGINT := 0;
BEGIN
  -- Only run if categories.id is currently UUID
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'categories' AND column_name = 'id' 
             AND data_type = 'uuid') THEN
    
    -- Drop FK from products
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
    
    -- Get max id from any existing numeric id backup or start fresh
    -- We need to generate sequential IDs
    
    -- Add new BIGSERIAL column
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS old_id BIGSERIAL;
    
    -- Create mapping table
    CREATE TEMP TABLE IF NOT EXISTS categories_uuid_map AS 
    SELECT id AS uuid_id, old_id FROM categories;
    
    -- Update products with new numeric category_id
    ALTER TABLE products ADD COLUMN IF NOT EXISTS old_category_id BIGINT;
    UPDATE products p 
    SET old_category_id = m.old_id 
    FROM categories_uuid_map m 
    WHERE p.category_id::text = m.uuid_id::text;
    
    -- Drop UUID id and rename old_id to id
    ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_pkey;
    ALTER TABLE categories DROP COLUMN id;
    ALTER TABLE categories RENAME COLUMN old_id TO id;
    ALTER TABLE categories ADD PRIMARY KEY (id);
    
    -- Update products column
    ALTER TABLE products DROP COLUMN IF EXISTS category_id;
    ALTER TABLE products RENAME COLUMN old_category_id TO category_id;
    
    -- Re-add FK
    ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    
    -- Cleanup
    DROP TABLE IF EXISTS categories_uuid_map;
  END IF;
END $$;
