-- ============================================
-- ADD MISSING SYNC COLUMNS
-- Adds metadata column to products table
-- Adds raw column to machine_slots table
-- Date: 2025-12-12
-- ============================================

-- Add metadata column to products table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB;
    RAISE NOTICE 'Added metadata column to products table';
  END IF;
END $$;

-- Add raw column to machine_slots table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machine_slots') THEN
    ALTER TABLE machine_slots ADD COLUMN IF NOT EXISTS raw JSONB;
    RAISE NOTICE 'Added raw column to machine_slots table';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Sync columns migration completed successfully!';
END $$;