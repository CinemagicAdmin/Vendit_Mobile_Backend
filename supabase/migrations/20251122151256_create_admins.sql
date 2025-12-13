-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on email if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admins_email_key'
    AND table_schema = 'public'
    AND table_name = 'admins'
  ) THEN
    ALTER TABLE public.admins ADD CONSTRAINT admins_email_key UNIQUE (email);
  END IF;
END $$;

-- Seed default admin
INSERT INTO public.admins (name, email, password)
VALUES (
  'Super Admin',
  'admin@vendit.app',
  '$2a$12$wIzYz1fGMnezpvl5JKvmk.gw8aYtz9Bn2CKjhBR0i68M0QOFrFQx2'
)
ON CONFLICT (email) DO NOTHING;
