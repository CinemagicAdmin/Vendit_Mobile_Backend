-- =====================================================
-- Add Missing Unique Constraints for Upsert Operations
-- =====================================================
-- Date: 2025-12-16
-- Fixes "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- =====================================================

-- 1. Create 'machines' table (if not exists) or add constraint
-- The code uses table 'machines' but migration created 'machine'
-- Option A: Create new table with correct name
CREATE TABLE IF NOT EXISTS machines (
    id BIGSERIAL PRIMARY KEY,
    u_id VARCHAR(255) UNIQUE,
    machine_tag VARCHAR(255),
    model VARCHAR(255),
    serial_no VARCHAR(255),
    description TEXT,
    manufacturer VARCHAR(255),
    specification TEXT,
    country VARCHAR(255),
    state_province VARCHAR(255),
    location_address TEXT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    mac_address VARCHAR(255),
    security_id VARCHAR(255),
    machine_image_url TEXT,
    machine_operation_state VARCHAR(255),
    subscription_expiry DATE,
    last_hearbeat TIMESTAMP,
    last_machine_status VARCHAR(255),
    machine_currency VARCHAR(255),
    machine_pin VARCHAR(255),
    machine_qrcode TEXT,
    machine_socket TEXT,
    distance DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure u_id is unique (if table already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'machines_u_id_key' 
        AND conrelid = 'machines'::regclass
    ) THEN
        ALTER TABLE machines ADD CONSTRAINT machines_u_id_key UNIQUE (u_id);
    END IF;
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, will be created above
    NULL;
END $$;

-- 2. Create 'products' table (if not exists) with product_u_id unique
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    product_u_id VARCHAR(255) UNIQUE,
    machine_id BIGINT,
    category_id BIGINT,
    brand_name VARCHAR(255),
    description TEXT,
    vendor_part_no VARCHAR(255),
    for_sale BOOLEAN DEFAULT TRUE,
    quantity INTEGER DEFAULT 0,
    max_quantity INTEGER,
    health_rating INTEGER,
    unit_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    product_image_url TEXT,
    product_detail_image_url TEXT,
    product_type VARCHAR(100),
    storage_location_detail JSONB,
    metadata JSONB,
    category_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure product_u_id is unique (if table already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_product_u_id_key' 
        AND conrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_product_u_id_key UNIQUE (product_u_id);
    END IF;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- 3. Create 'categories' table with category_name unique
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    category_u_id VARCHAR(255),
    category_name VARCHAR(255) UNIQUE,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure category_name is unique (if table already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_category_name_key' 
        AND conrelid = 'categories'::regclass
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT categories_category_name_key UNIQUE (category_name);
    END IF;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- 4. Ensure machine_slots has composite unique constraint
-- This table was created in 002-add-machine-slots.sql with UNIQUE(machine_u_id, slot_number)
-- But let's ensure it exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'machine_slots_machine_u_id_slot_number_key' 
        AND conrelid = 'machine_slots'::regclass
    ) THEN
        ALTER TABLE machine_slots ADD CONSTRAINT machine_slots_machine_u_id_slot_number_key 
            UNIQUE (machine_u_id, slot_number);
    END IF;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_machines_u_id ON machines(u_id);
CREATE INDEX IF NOT EXISTS idx_products_product_u_id ON products(product_u_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_category_name ON categories(category_name);

-- Add comment
COMMENT ON TABLE machines IS 'Vending machines - synced from remote API';
COMMENT ON TABLE products IS 'Products - synced from remote API';
COMMENT ON TABLE categories IS 'Product categories';
