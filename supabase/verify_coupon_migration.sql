-- Verify Discount Coupon Migration
-- Run these queries in Supabase SQL Editor to confirm everything is set up correctly

-- =====================================================
-- 1. VERIFY TABLES EXIST
-- =====================================================

SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('discount_coupons', 'coupon_usage')
ORDER BY table_name;

-- Expected: 2 rows (discount_coupons, coupon_usage)

-- =====================================================
-- 2. VERIFY PAYMENTS TABLE MODIFICATIONS  
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('coupon_id', 'discount_amount', 'original_amount')
ORDER BY column_name;

-- Expected: 3 rows (coupon_id, discount_amount, original_amount)

-- =====================================================
-- 3. VERIFY FUNCTION EXISTS
-- =====================================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_coupon_usage';

-- Expected: 1 row (increment_coupon_usage, FUNCTION)

-- =====================================================
-- 4. CHECK INDEXES
-- =====================================================

SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('discount_coupons', 'coupon_usage', 'payments')
  AND indexname LIKE '%coupon%'
ORDER BY tablename, indexname;

-- Expected: Multiple rows showing indexes

-- =====================================================
-- 5. CREATE TEST COUPON
-- =====================================================

INSERT INTO discount_coupons (
    code,
    description,
    discount_type,
    discount_value,
    min_purchase_amount,
    max_discount_amount,
    max_uses_per_user,
    max_total_uses,
    valid_from,
    valid_until,
    is_active
) VALUES (
    'TEST10',
    'Migration test - 10% off',
    'PERCENTAGE',
    10,
    0,
    5,
    1,
    100,
    NOW(),
    NOW() + INTERVAL '30 days',
    true
) RETURNING id, code, discount_type, discount_value, created_at;

-- Expected: 1 row with the created coupon details

-- =====================================================
-- 6. VERIFY TEST COUPON
-- =====================================================

SELECT 
    code,
    discount_type,
    discount_value,
    max_uses_per_user,
    current_total_uses,
    is_active,
    valid_from,
    valid_until
FROM discount_coupons
WHERE code = 'TEST10';

-- Expected: 1 row showing the TEST10 coupon

-- =====================================================
-- 7. TEST ATOMIC INCREMENT FUNCTION
-- =====================================================

-- Get the coupon ID
DO $$
DECLARE
    v_coupon_id UUID;
    v_result BOOLEAN;
BEGIN
    SELECT id INTO v_coupon_id FROM discount_coupons WHERE code = 'TEST10';
    
    -- Test increment (should succeed)
    SELECT increment_coupon_usage(v_coupon_id, 100) INTO v_result;
    RAISE NOTICE 'Increment result: %', v_result;
    
    -- Verify count increased
    SELECT current_total_uses INTO v_result FROM discount_coupons WHERE id = v_coupon_id;
    RAISE NOTICE 'Current usage count: %', v_result;
END $$;

-- Expected: Notice showing TRUE and usage count of 1

-- =====================================================
-- 8. CHECK CURRENT USAGE
-- =====================================================

SELECT 
    code,
    current_total_uses,
    max_total_uses,
    CASE 
        WHEN max_total_uses IS NULL THEN 'Unlimited'
        ELSE CONCAT(current_total_uses, ' / ', max_total_uses)
    END as usage_status
FROM discount_coupons
WHERE code = 'TEST10';

-- Expected: Shows 1 / 100 usage

-- =====================================================
-- 9. CLEAN UP TEST DATA (Optional)
-- =====================================================

-- Uncomment to delete test coupon
-- DELETE FROM discount_coupons WHERE code = 'TEST10';

-- =====================================================
-- SUCCESS CRITERIA
-- =====================================================
-- ✅ All queries return expected results
-- ✅ Tables exist with correct structure
-- ✅ Function works and increments atomically
-- ✅ Indexes are in place for performance
-- ✅ Ready for production use!
