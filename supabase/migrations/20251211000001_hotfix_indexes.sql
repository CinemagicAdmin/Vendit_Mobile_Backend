-- Hotfix for referrals table index creation
-- The table already exists with different column names

-- Create indexes using correct column names from existing table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') THEN
    CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON public.referrals(inviter_user_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_invited ON public.referrals(invited_user_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
    CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
  END IF;
END $$;

-- Create index for user_loyalty_points if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_loyalty_points') THEN
    CREATE INDEX IF NOT EXISTS idx_user_loyalty_points_user ON public.user_loyalty_points(user_id);
  END IF;
END $$;

-- Create indexes for audit_logs if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);
  END IF;
END $$;

-- Create indexes for activity_logs if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(activity_type);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at);
  END IF;
END $$;

-- Create other missing indexes (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_tap_customer ON public.users(tap_customer_id);
    CREATE INDEX IF NOT EXISTS idx_users_referrer ON public.users(referrer_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_tap_customer ON public.payments(tap_customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_earned_points ON public.payments(earned_points);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_points') THEN
    CREATE INDEX IF NOT EXISTS idx_loyalty_points_reason ON public.loyalty_points(reason);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ratings') THEN
    CREATE INDEX IF NOT EXISTS idx_ratings_payment ON public.ratings(payment_id);
  END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Hotfix migration completed successfully!';
END $$;
