-- Add missing country_code column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);
