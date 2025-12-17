-- =====================================================
-- CONVERT ALL REMAINING BIGSERIAL IDS TO UUID
-- Tables: admins, categories, machines, products, machine_slots,
--         carts, cards, payment_products, loyalty_points,
--         user_loyalty_points, campaigns, campaign_views,
--         ratings, contact_us, static_content, machine_webhooks
-- =====================================================

-- Helper function to safely convert BIGSERIAL to UUID
-- We'll do this table by table

-- =====================================================
-- 1. ADMINS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'admins' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    -- Drop FK from admin_notifications
    ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_admin_id_fkey;
    ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
    ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_parent_admin_id_fkey;
    
    -- Add new column
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE admins SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    -- Create mapping
    CREATE TEMP TABLE IF NOT EXISTS admins_map AS SELECT id AS old_id, new_id FROM admins;
    
    -- Update referencing tables
    ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS new_admin_id UUID;
    UPDATE admin_notifications an SET new_admin_id = m.new_id FROM admins_map m WHERE an.admin_id = m.old_id;
    
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_admin_id UUID;
    UPDATE audit_logs al SET new_admin_id = m.new_id FROM admins_map m WHERE al.admin_id = m.old_id;
    
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS new_parent_admin_id UUID;
    UPDATE admins a SET new_parent_admin_id = m.new_id FROM admins_map m WHERE a.parent_admin_id = m.old_id;
    
    -- Swap columns
    ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_pkey;
    ALTER TABLE admins DROP COLUMN id;
    ALTER TABLE admins RENAME COLUMN new_id TO id;
    ALTER TABLE admins ADD PRIMARY KEY (id);
    ALTER TABLE admins DROP COLUMN IF EXISTS parent_admin_id;
    ALTER TABLE admins RENAME COLUMN new_parent_admin_id TO parent_admin_id;
    
    ALTER TABLE admin_notifications DROP COLUMN IF EXISTS admin_id;
    ALTER TABLE admin_notifications RENAME COLUMN new_admin_id TO admin_id;
    
    ALTER TABLE audit_logs DROP COLUMN IF EXISTS admin_id;
    ALTER TABLE audit_logs RENAME COLUMN new_admin_id TO admin_id;
    
    -- Re-add FK
    ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_admin_id_fkey 
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_admin_id_fkey 
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL;
    ALTER TABLE admins ADD CONSTRAINT admins_parent_admin_id_fkey 
      FOREIGN KEY (parent_admin_id) REFERENCES admins(id);
    
    DROP TABLE IF EXISTS admins_map;
  END IF;
END $$;

-- =====================================================
-- 2. CATEGORIES TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'categories' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
    
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE categories SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    CREATE TEMP TABLE IF NOT EXISTS categories_map AS SELECT id AS old_id, new_id FROM categories;
    
    ALTER TABLE products ADD COLUMN IF NOT EXISTS new_category_id UUID;
    UPDATE products p SET new_category_id = m.new_id FROM categories_map m WHERE p.category_id = m.old_id;
    
    ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_pkey;
    ALTER TABLE categories DROP COLUMN id;
    ALTER TABLE categories RENAME COLUMN new_id TO id;
    ALTER TABLE categories ADD PRIMARY KEY (id);
    
    ALTER TABLE products DROP COLUMN IF EXISTS category_id;
    ALTER TABLE products RENAME COLUMN new_category_id TO category_id;
    
    ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    
    DROP TABLE IF EXISTS categories_map;
  END IF;
END $$;

-- =====================================================
-- 3. MACHINES TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'machines' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_machine_id_fkey;
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_machine_id_fkey;
    ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_machine_id_fkey;
    
    ALTER TABLE machines ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE machines SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    CREATE TEMP TABLE IF NOT EXISTS machines_map AS SELECT id AS old_id, new_id FROM machines;
    
    ALTER TABLE products ADD COLUMN IF NOT EXISTS new_machine_id UUID;
    UPDATE products p SET new_machine_id = m.new_id FROM machines_map m WHERE p.machine_id = m.old_id;
    
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS new_machine_id UUID;
    UPDATE payments py SET new_machine_id = m.new_id FROM machines_map m WHERE py.machine_id = m.old_id;
    
    ALTER TABLE ratings ADD COLUMN IF NOT EXISTS new_machine_id UUID;
    UPDATE ratings r SET new_machine_id = m.new_id FROM machines_map m WHERE r.machine_id = m.old_id;
    
    ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_pkey;
    ALTER TABLE machines DROP COLUMN id;
    ALTER TABLE machines RENAME COLUMN new_id TO id;
    ALTER TABLE machines ADD PRIMARY KEY (id);
    
    ALTER TABLE products DROP COLUMN IF EXISTS machine_id;
    ALTER TABLE products RENAME COLUMN new_machine_id TO machine_id;
    ALTER TABLE products ADD CONSTRAINT products_machine_id_fkey 
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;
    
    ALTER TABLE payments DROP COLUMN IF EXISTS machine_id;
    ALTER TABLE payments RENAME COLUMN new_machine_id TO machine_id;
    ALTER TABLE payments ADD CONSTRAINT payments_machine_id_fkey 
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;
    
    ALTER TABLE ratings DROP COLUMN IF EXISTS machine_id;
    ALTER TABLE ratings RENAME COLUMN new_machine_id TO machine_id;
    ALTER TABLE ratings ADD CONSTRAINT ratings_machine_id_fkey 
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE;
    
    DROP TABLE IF EXISTS machines_map;
  END IF;
END $$;

-- =====================================================
-- 4. PRODUCTS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'products' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_product_id_fkey;
    ALTER TABLE payment_products DROP CONSTRAINT IF EXISTS payment_products_product_id_fkey;
    ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_product_id_fkey;
    
    ALTER TABLE products ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE products SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    CREATE TEMP TABLE IF NOT EXISTS products_map AS SELECT id AS old_id, new_id FROM products;
    
    ALTER TABLE carts ADD COLUMN IF NOT EXISTS new_product_id UUID;
    UPDATE carts c SET new_product_id = m.new_id FROM products_map m WHERE c.product_id = m.old_id;
    
    ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS new_product_id UUID;
    UPDATE payment_products pp SET new_product_id = m.new_id FROM products_map m WHERE pp.product_id = m.old_id;
    
    ALTER TABLE ratings ADD COLUMN IF NOT EXISTS new_product_id UUID;
    UPDATE ratings r SET new_product_id = m.new_id FROM products_map m WHERE r.product_id = m.old_id;
    
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;
    ALTER TABLE products DROP COLUMN id;
    ALTER TABLE products RENAME COLUMN new_id TO id;
    ALTER TABLE products ADD PRIMARY KEY (id);
    
    ALTER TABLE carts DROP COLUMN IF EXISTS product_id;
    ALTER TABLE carts RENAME COLUMN new_product_id TO product_id;
    ALTER TABLE carts ADD CONSTRAINT carts_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    
    ALTER TABLE payment_products DROP COLUMN IF EXISTS product_id;
    ALTER TABLE payment_products RENAME COLUMN new_product_id TO product_id;
    ALTER TABLE payment_products ADD CONSTRAINT payment_products_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    
    ALTER TABLE ratings DROP COLUMN IF EXISTS product_id;
    ALTER TABLE ratings RENAME COLUMN new_product_id TO product_id;
    ALTER TABLE ratings ADD CONSTRAINT ratings_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    
    DROP TABLE IF EXISTS products_map;
  END IF;
END $$;

-- =====================================================
-- 5. MACHINE_SLOTS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'machine_slots' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE machine_slots ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE machine_slots SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE machine_slots DROP CONSTRAINT IF EXISTS machine_slots_pkey;
    ALTER TABLE machine_slots DROP COLUMN id;
    ALTER TABLE machine_slots RENAME COLUMN new_id TO id;
    ALTER TABLE machine_slots ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 6. CARTS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'carts' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE carts ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE carts SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_pkey;
    ALTER TABLE carts DROP COLUMN id;
    ALTER TABLE carts RENAME COLUMN new_id TO id;
    ALTER TABLE carts ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 7. CARDS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'cards' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE cards SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_pkey;
    ALTER TABLE cards DROP COLUMN id;
    ALTER TABLE cards RENAME COLUMN new_id TO id;
    ALTER TABLE cards ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 8. PAYMENT_PRODUCTS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'payment_products' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE payment_products ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE payment_products SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE payment_products DROP CONSTRAINT IF EXISTS payment_products_pkey;
    ALTER TABLE payment_products DROP COLUMN id;
    ALTER TABLE payment_products RENAME COLUMN new_id TO id;
    ALTER TABLE payment_products ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 9. LOYALTY_POINTS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'loyalty_points' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE loyalty_points ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE loyalty_points SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE loyalty_points DROP CONSTRAINT IF EXISTS loyalty_points_pkey;
    ALTER TABLE loyalty_points DROP COLUMN id;
    ALTER TABLE loyalty_points RENAME COLUMN new_id TO id;
    ALTER TABLE loyalty_points ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 10. USER_LOYALTY_POINTS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_loyalty_points' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE user_loyalty_points ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE user_loyalty_points SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE user_loyalty_points DROP CONSTRAINT IF EXISTS user_loyalty_points_pkey;
    ALTER TABLE user_loyalty_points DROP COLUMN id;
    ALTER TABLE user_loyalty_points RENAME COLUMN new_id TO id;
    ALTER TABLE user_loyalty_points ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 11. CAMPAIGNS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'campaigns' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE campaign_views DROP CONSTRAINT IF EXISTS campaign_views_campaign_id_fkey;
    
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE campaigns SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    CREATE TEMP TABLE IF NOT EXISTS campaigns_map AS SELECT id AS old_id, new_id FROM campaigns;
    
    ALTER TABLE campaign_views ADD COLUMN IF NOT EXISTS new_campaign_id UUID;
    UPDATE campaign_views cv SET new_campaign_id = m.new_id FROM campaigns_map m WHERE cv.campaign_id = m.old_id;
    
    ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_pkey;
    ALTER TABLE campaigns DROP COLUMN id;
    ALTER TABLE campaigns RENAME COLUMN new_id TO id;
    ALTER TABLE campaigns ADD PRIMARY KEY (id);
    
    ALTER TABLE campaign_views DROP COLUMN IF EXISTS campaign_id;
    ALTER TABLE campaign_views RENAME COLUMN new_campaign_id TO campaign_id;
    ALTER TABLE campaign_views ADD CONSTRAINT campaign_views_campaign_id_fkey 
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    
    DROP TABLE IF EXISTS campaigns_map;
  END IF;
END $$;

-- =====================================================
-- 12. CAMPAIGN_VIEWS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'campaign_views' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE campaign_views ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE campaign_views SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE campaign_views DROP CONSTRAINT IF EXISTS campaign_views_pkey;
    ALTER TABLE campaign_views DROP COLUMN id;
    ALTER TABLE campaign_views RENAME COLUMN new_id TO id;
    ALTER TABLE campaign_views ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 13. RATINGS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'ratings' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE ratings ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE ratings SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_pkey;
    ALTER TABLE ratings DROP COLUMN id;
    ALTER TABLE ratings RENAME COLUMN new_id TO id;
    ALTER TABLE ratings ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 14. CONTACT_US TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'contact_us' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE contact_us ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE contact_us SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE contact_us DROP CONSTRAINT IF EXISTS contact_us_pkey;
    ALTER TABLE contact_us DROP COLUMN id;
    ALTER TABLE contact_us RENAME COLUMN new_id TO id;
    ALTER TABLE contact_us ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 15. STATIC_CONTENT TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'static_content' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE static_content ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE static_content SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE static_content DROP CONSTRAINT IF EXISTS static_content_pkey;
    ALTER TABLE static_content DROP COLUMN id;
    ALTER TABLE static_content RENAME COLUMN new_id TO id;
    ALTER TABLE static_content ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 16. MACHINE_WEBHOOKS TABLE
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'machine_webhooks' AND column_name = 'id' 
             AND data_type = 'bigint') THEN
    
    ALTER TABLE machine_webhooks ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
    UPDATE machine_webhooks SET new_id = gen_random_uuid() WHERE new_id IS NULL;
    
    ALTER TABLE machine_webhooks DROP CONSTRAINT IF EXISTS machine_webhooks_pkey;
    ALTER TABLE machine_webhooks DROP COLUMN id;
    ALTER TABLE machine_webhooks RENAME COLUMN new_id TO id;
    ALTER TABLE machine_webhooks ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- DONE - All IDs are now UUID
-- =====================================================
