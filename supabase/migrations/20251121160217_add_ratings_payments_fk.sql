-- Link ratings.order_id with payments.id so PostgREST can expose the relationship
DO $$
BEGIN
  -- First check if the ratings table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ratings'
  ) THEN
    RETURN;
  END IF;

  -- Then check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ratings_order_id_fkey'
    AND table_schema = 'public'
    AND table_name = 'ratings'
  ) THEN
    ALTER TABLE public.ratings
      ADD CONSTRAINT ratings_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.payments(id)
      ON DELETE CASCADE;
  END IF;
END $$;
