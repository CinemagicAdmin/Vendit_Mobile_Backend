# Migration Execution Guide

**Quick guide to run the dispense_logs migration**

---

## Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar

---

## Step 2: Copy Migration SQL

```bash
# In your terminal
cat supabase/migrations/20260106000000_create_dispense_logs.sql
```

Or view the file: [20260106000000_create_dispense_logs.sql](file:///Users/java/MyFiles/Cinemagic/cinemagic-backup/Vend-IT-backend/supabase/migrations/20260106000000_create_dispense_logs.sql)

---

## Step 3: Execute in Supabase

1. Click **New query** in SQL Editor
2. Paste the SQL from migration file
3. Click **Run** button (or press Cmd/Ctrl + Enter)
4. Wait for "Success" message

---

## Step 4: Verify Migration

Run the verification script:

```bash
cd /Users/java/MyFiles/Cinemagic/cinemagic-backup/Vend-IT-backend

node scripts/verify-dispense-migration.js
```

Expected output:
```
🔍 Verifying Dispense Logs Migration...

1. Checking dispense_logs table exists...
   ✓ Table exists

2. Checking dispense_logs columns...
   ✓ All required columns present

3. Checking payment_products.dispensed_at column...
   ✓ Column exists

4. Testing insert into dispense_logs...
   ✓ Insert successful

5. Testing status constraint...
   ✓ Status constraint working

📊 Results: 5 passed, 0 failed

✓ Migration verified successfully!
```

---

## If Verification Fails

See detailed troubleshooting: [docs/migrations/20260106-dispense-logs-guide.md](file:///Users/java/MyFiles/Cinemagic/cinemagic-backup/Vend-IT-backend/docs/migrations/20260106-dispense-logs-guide.md)

---

## Step 5: Test Dispense Endpoint

After successful migration, test the dispense endpoint:

```bash
# Make a test payment first, then:
curl -X POST https://your-api.com/api/users/machine/dispense \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "VENDIT_0023",
    "paymentId": "your-payment-uuid",
    "slotNumber": "10"
  }'
```

Check logs were created:
```sql
SELECT * FROM dispense_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

---

**That's it! Migration complete.**
