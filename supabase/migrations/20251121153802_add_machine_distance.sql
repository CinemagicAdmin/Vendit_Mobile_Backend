-- Adds the optional distance column used by the API responses

-- Try to add to 'machine' (singular) if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machine') THEN
    ALTER TABLE public.machine ADD COLUMN IF NOT EXISTS distance DOUBLE PRECISION;
  END IF;
END $$;

-- Try to add to 'machines' (plural) if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machines') THEN
    ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS distance DOUBLE PRECISION;
  END IF;
END $$;
