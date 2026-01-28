# Running the Discount Coupon Migration

## Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard
   - Navigate to **SQL Editor**

2. **Copy Migration SQL**
   - File: `supabase/migrations/20260127000000_create_discount_coupons.sql`
   - Copy the entire contents

3. **Execute Migration**
   - Paste into SQL Editor
   - Click **Run** or press `Ctrl/Cmd + Enter`
   - Verify success message

4. **Verify Tables Created**
   ```sql
   -- Check if tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('discount_coupons', 'coupon_usage');
   
   -- Check if payments columns were added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'payments' 
   AND column_name IN ('coupon_id', 'discount_amount', 'original_amount');
   
   -- Check if function exists
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'increment_coupon_usage';
   ```

## Option 2: Supabase CLI (If installed)

```bash
cd /Users/java/MyFiles/Cinemagic/cinemagic-backup/Vend-IT-backend

# Login to Supabase (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
npx supabase db push

# Or apply specific migration
npx supabase db execute --file supabase/migrations/20260127000000_create_discount_coupons.sql
```

## Option 3: Direct PostgreSQL Connection

If you have direct database access:

```bash
# Copy migration file path
export MIGRATION_FILE="/Users/java/MyFiles/Cinemagic/cinemagic-backup/Vend-IT-backend/supabase/migrations/20260127000000_create_discount_coupons.sql"

# Run with psql
psql $DATABASE_URL -f $MIGRATION_FILE
```

## What Gets Created

### Tables
1. **discount_coupons**
   - Stores coupon definitions
   - 14 columns including code, discount_type, discount_value, etc.
   - 3 indexes for optimal query performance

2. **coupon_usage**
   - Tracks every redemption
   - Links to coupons, users, and payments
   - 4 indexes for fast lookups

### Modifications
3. **payments table**
   - Adds 3 new columns: `coupon_id`, `discount_amount`, `original_amount`
   - Adds 1 index on `coupon_id`

### Functions
4. **increment_coupon_usage()**
   - Atomic increment with limit check
   - Prevents race conditions
   - Returns boolean (success/failure)

## Post-Migration Verification

Run these queries to confirm everything is set up correctly:

```sql
-- 1. Check table structure
\d discount_coupons
\d coupon_usage

-- 2. Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('discount_coupons', 'coupon_usage');

-- 3. Test function (should return error about non-existent coupon)
SELECT increment_coupon_usage('00000000-0000-0000-0000-000000000000'::uuid, 100);

-- 4. Ready to create first coupon!
INSERT INTO discount_coupons (
  code, description, discount_type, discount_value,
  min_purchase_amount, max_uses_per_user,
  valid_from, valid_until, is_active
) VALUES (
  'TEST10',
  'Test 10% discount',
  'PERCENTAGE',
  10,
  0,
  1,
  NOW(),
  NOW() + INTERVAL '30 days',
  true
) RETURNING *;
```

## Troubleshooting

### Error: "relation already exists"
- Tables might already exist from a previous attempt
- Drop and recreate:
  ```sql
  DROP TABLE IF EXISTS coupon_usage CASCADE;
  DROP TABLE IF EXISTS discount_coupons CASCADE;
  DROP FUNCTION IF EXISTS increment_coupon_usage CASCADE;
  -- Then re-run migration
  ```

### Error: "column already exists" (on payments table)
- Columns might have been added before
- Check existing:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'payments';
  ```

### Permission Denied
- Ensure you're using an admin/service role connection
- Check Supabase project settings → Database → Connection string

## Next Steps After Migration

1. ✅ **Test with curl/Postman**
   - Create a test coupon via admin API
   - Validate it via user API
   - Make a payment with coupon

2. **Monitor in production**
   - Check audit_logs for coupon CRUD actions
   - Monitor coupon_usage table for redemptions
   - Track discount_amount in payments

3. **Build frontend UI**
   - Admin pages for coupon management
   - User checkout integration
