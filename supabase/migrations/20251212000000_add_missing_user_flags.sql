-- ============================================
-- ADD MISSING USER COLUMNS
-- Adds is_notification, is_online, status integer flag columns
-- Adds user_socket_token, user_chat_token, video_url text columns
-- Converts is_otp_verify from boolean to integer
-- Date: 2025-12-12
-- ============================================

-- Only run if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN

    -- Add is_notification column as INTEGER if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_notification'
    ) THEN
      ALTER TABLE users ADD COLUMN is_notification INTEGER DEFAULT 0 NOT NULL;
      RAISE NOTICE 'Added is_notification column';
    ELSE
      -- If column exists but is boolean, convert to integer
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_notification'
        AND data_type IN ('boolean', 'bool')
      ) THEN
        ALTER TABLE users
          ALTER COLUMN is_notification DROP DEFAULT,
          ALTER COLUMN is_notification TYPE INTEGER USING (
            CASE
              WHEN is_notification IS TRUE THEN 1
              WHEN is_notification IS FALSE THEN 0
              ELSE 0
            END
          ),
          ALTER COLUMN is_notification SET DEFAULT 0;
        RAISE NOTICE 'Converted is_notification from boolean to integer';
      END IF;
    END IF;

    -- Add is_online column as INTEGER if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_online'
    ) THEN
      ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0 NOT NULL;
      RAISE NOTICE 'Added is_online column';
    ELSE
      -- If column exists but is boolean, convert to integer
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_online'
        AND data_type IN ('boolean', 'bool')
      ) THEN
        ALTER TABLE users
          ALTER COLUMN is_online DROP DEFAULT,
          ALTER COLUMN is_online TYPE INTEGER USING (
            CASE
              WHEN is_online IS TRUE THEN 1
              WHEN is_online IS FALSE THEN 0
              ELSE 0
            END
          ),
          ALTER COLUMN is_online SET DEFAULT 0;
        RAISE NOTICE 'Converted is_online from boolean to integer';
      END IF;
    END IF;

    -- Convert is_otp_verify from BOOLEAN to INTEGER if it exists as boolean
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_otp_verify'
      AND data_type IN ('boolean', 'bool')
    ) THEN
      ALTER TABLE users
        ALTER COLUMN is_otp_verify DROP DEFAULT,
        ALTER COLUMN is_otp_verify TYPE INTEGER USING (
          CASE
            WHEN is_otp_verify IS TRUE THEN 1
            WHEN is_otp_verify IS FALSE THEN 0
            ELSE 0
          END
        ),
        ALTER COLUMN is_otp_verify SET DEFAULT 0;
      RAISE NOTICE 'Converted is_otp_verify from boolean to integer';
    ELSIF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_otp_verify'
    ) THEN
      -- Add column if it doesn't exist at all
      ALTER TABLE users ADD COLUMN is_otp_verify INTEGER DEFAULT 0 NOT NULL;
      RAISE NOTICE 'Added is_otp_verify column';
    END IF;

    -- Add status column as INTEGER if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
    ) THEN
      ALTER TABLE users ADD COLUMN status INTEGER DEFAULT 0 NOT NULL;
      RAISE NOTICE 'Added status column';
    ELSE
      -- If column exists but is not integer, convert to integer
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
        AND data_type IN ('integer', 'smallint', 'bigint')
      ) THEN
        ALTER TABLE users
          ALTER COLUMN status DROP DEFAULT,
          ALTER COLUMN status TYPE INTEGER USING (
            CASE
              WHEN status::text ~ '^[0-9]+$' THEN status::integer
              ELSE 0
            END
          ),
          ALTER COLUMN status SET DEFAULT 0;
        RAISE NOTICE 'Converted status to integer';
      END IF;
    END IF;

    -- Add user_socket_token column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS user_socket_token TEXT;

    -- Add user_chat_token column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS user_chat_token TEXT;

    -- Add video_url column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS video_url TEXT;

    -- Add dob column if it doesn't exist (maps to date_of_birth)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;

    -- Add age column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;

    -- Add address column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

    -- Add latitude column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);

    -- Add longitude column if it doesn't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

    -- Make password column nullable (OTP-based auth doesn't require password)
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

    RAISE NOTICE 'User columns migration completed successfully!';
  ELSE
    RAISE NOTICE 'Users table does not exist, skipping user columns migration';
  END IF;
END $$;
