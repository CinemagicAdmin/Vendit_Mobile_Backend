-- =====================================================
-- ADD ALL MISSING COLUMNS TO USERS TABLE
-- Based on User interface in types/entities.ts
-- =====================================================

-- Add all potentially missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_socket_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_chat_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Ensure these exist (from previous migrations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tap_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_token TEXT;
