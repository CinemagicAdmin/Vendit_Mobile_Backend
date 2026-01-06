# Database Migration Guide - Dispense Logs

**Migration File:** `20260106000000_create_dispense_logs.sql`  
**Date:** January 6, 2026  
**Impact:** Low (adds new table, backward compatible)

---

## What This Migration Does

1. Creates `dispense_logs` table for audit trail
2. Adds `dispensed_at` column to `payment_products`
3. Creates indexes for performance

---

## Running the Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy Migration SQL:**
   ```bash
   # From your local repo
   cat supabase/migrations/20260106000000_create_dispense_logs.sql
   ```

4. **Paste and Execute:**
   - Paste the SQL into the editor
   - Click "Run" button
   - Verify success message

5. **Verify Tables Created:**
   ```sql
   -- Check dispense_logs table exists
   SELECT * FROM dispense_logs LIMIT 1;
   
   -- Check new column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'payment_products' 
   AND column_name = 'dispensed_at';
   ```

### Option 2: Supabase CLI

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Link to Your Project:**
   ```bash
   cd /path/to/Vend-IT-backend
   supabase link --project-ref <your-project-ref>
   ```

3. **Run Migration:**
   ```bash
   supabase db push
   ```

4. **Verify:**
   ```bash
   supabase db diff
   # Should show no differences
   ```

### Option 3: Direct Database Connection

1. **Get Connection String:**
   - Supabase Dashboard → Project Settings → Database
   - Copy connection string

2. **Connect with psql:**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
   ```

3. **Run Migration:**
   ```sql
   \i supabase/migrations/20260106000000_create_dispense_logs.sql
   ```

4. **Verify:**
   ```sql
   \dt dispense_logs
   \d payment_products
   ```

---

## Verification Checklist

After running migration, verify:

- [ ] `dispense_logs` table exists
- [ ] All 4 indexes created on `dispense_logs`
- [ ] `payment_products.dispensed_at` column exists
- [ ] Table comments added
- [ ] No errors in migration log

### Verification Queries

```sql
-- 1. Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'dispense_logs';

-- 2. Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dispense_logs'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'dispense_logs';

-- 4. Check constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name LIKE '%dispense_logs%';

-- 5. Test insert
INSERT INTO dispense_logs (
  payment_id,
  machine_id,
  slot_number,
  status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'TEST_MACHINE',
  '99',
  'pending'
);

-- 6. Verify insert worked
SELECT * FROM dispense_logs WHERE machine_id = 'TEST_MACHINE';

-- 7. Clean up test
DELETE FROM dispense_logs WHERE machine_id = 'TEST_MACHINE';
```

---

## Rollback Plan

If you need to undo this migration:

```sql
-- WARNING: This will delete all dispense logs!

DROP TABLE IF EXISTS dispense_logs CASCADE;

ALTER TABLE payment_products 
DROP COLUMN IF EXISTS dispensed_at;
```

⚠️ **Note:** Only rollback if there's a critical issue. The migration is designed to be safe and backward compatible.

---

## Performance Impact

**Expected:**
- Minimal impact (new table, no data yet)
- Indexes will improve query performance
- No changes to existing queries

**Monitor:**
```sql
-- Check table size (should be near 0 initially)
SELECT 
  pg_size_pretty(pg_total_relation_size('dispense_logs')) as total_size,
  pg_size_pretty(pg_relation_size('dispense_logs')) as table_size,
  pg_size_pretty(pg_indexes_size('dispense_logs')) as indexes_size;
```

---

## Common Issues & Solutions

### Issue 1: Permission Denied

**Error:** `permission denied for schema public`

**Solution:**
```sql
-- Grant permissions if needed
GRANT USAGE ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;
```

### Issue 2: UUID Extension Missing

**Error:** `function uuid_generate_v4() does not exist`

**Solution:**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue 3: Column Already Exists

**Error:** `column "dispensed_at" of relation "payment_products" already exists`

**Solution:**
This is fine! The migration uses `IF NOT EXISTS` to be idempotent. The migration has already been run.

---

## Post-Migration Testing

### 1. Test Dispense Logging

```typescript
// Make a test dispense request
POST /api/users/machine/dispense
{
  "machineId": "VENDIT_0023",
  "paymentId": "valid-payment-id",
  "slotNumber": "10"
}

// Check log was created
SELECT * FROM dispense_logs 
WHERE payment_id = 'valid-payment-id'
ORDER BY created_at DESC LIMIT 1;

// Should see status = 'sent' or 'pending'
```

### 2. Test Timestamp Tracking

```typescript
// Update dispensed quantity
POST /api/payments/product/update/dispensedQty
{
  "paymentId": "valid-payment-id",
  "machineId": "VENDIT_0023",
  "vendorPartNumbers": ["VP-123"]
}

// Check dispensed_at was set
SELECT 
  product_u_id,
  dispensed_quantity,
  dispensed_at
FROM payment_products
WHERE payment_id = 'valid-payment-id';

// dispensed_at should have timestamp
```

---

## Migration Logs

Keep a record of migration execution:

```sql
-- Create migrations log table (if not exists)
CREATE TABLE IF NOT EXISTS migration_logs (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by TEXT DEFAULT current_user,
  status TEXT NOT NULL
);

-- Log this migration
INSERT INTO migration_logs (migration_name, status)
VALUES ('20260106000000_create_dispense_logs', 'success');
```

---

## Next Steps After Migration

1. ✅ Verify migration successful
2. ✅ Test dispense endpoint with valid payment
3. ✅ Check logs are being created
4. ✅ Monitor for any errors
5. ✅ Update frontend to send paymentId

---

*Migration guide created January 6, 2026*
