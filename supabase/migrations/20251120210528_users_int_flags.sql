-- Convert boolean flag columns on users table to integer (0/1) to match mobile API contract

-- Only run if users table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RETURN;
  END IF;

  -- Convert is_notification from boolean to integer (only if column exists and is boolean)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_notification'
    AND data_type = 'boolean'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN is_notification DROP DEFAULT,
      ALTER COLUMN is_notification TYPE INTEGER USING (
        CASE
          WHEN is_notification IS TRUE THEN 1
          WHEN is_notification IS FALSE THEN 0
          ELSE NULL
        END
      ),
      ALTER COLUMN is_notification SET DEFAULT 0;
  END IF;

  -- Convert is_online from boolean to integer (or add if doesn't exist)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'is_online'
      AND data_type = 'boolean'
  ) THEN
    EXECUTE $stmt$
      ALTER TABLE public.users
        ALTER COLUMN is_online DROP DEFAULT,
        ALTER COLUMN is_online TYPE INTEGER USING (
          CASE
            WHEN is_online IS TRUE THEN 1
            WHEN is_online IS FALSE THEN 0
            ELSE NULL
          END
        ),
        ALTER COLUMN is_online SET DEFAULT 0;
    $stmt$;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'is_online'
  ) THEN
    EXECUTE 'ALTER TABLE public.users ADD COLUMN is_online INTEGER DEFAULT 0';
  END IF;

  -- Convert is_otp_verify from boolean to integer (only if exists and is boolean)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_otp_verify'
    AND data_type = 'boolean'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN is_otp_verify DROP DEFAULT,
      ALTER COLUMN is_otp_verify TYPE INTEGER USING (
        CASE
          WHEN is_otp_verify IS TRUE THEN 1
          WHEN is_otp_verify IS FALSE THEN 0
          ELSE NULL
        END
      ),
      ALTER COLUMN is_otp_verify SET DEFAULT 0;
  END IF;
END
$$;
