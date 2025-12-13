-- Fix users table column names to match application code expectations
-- The application uses phone_number and country_code (snake_case)

-- Rename phone to phone_number if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users RENAME COLUMN phone TO phone_number;
  END IF;
END $$;

-- Add country_code column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);

-- Add country column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Update index name if needed
DROP INDEX IF EXISTS idx_users_phone;
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Add index for country_code
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);
