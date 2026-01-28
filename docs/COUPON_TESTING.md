# Coupon Module Testing Guide

## Quick Start

### 1. Run Migration

Choose one method:

**Option A: Supabase Dashboard** (Easiest)
```bash
# 1. Open https://supabase.com/dashboard
# 2. Go to SQL Editor
# 3. Paste contents of supabase/migrations/20260127000000_create_discount_coupons.sql
# 4. Click Run
```

**Option B: Supabase CLI**
```bash
npx supabase db push
```

**Option C: Direct SQL**
```bash
psql $DATABASE_URL -f supabase/migrations/20260127000000_create_discount_coupons.sql
```

### 2. Verify Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('discount_coupons', 'coupon_usage');

-- Should return 2 rows
```

### 3. Test APIs

**Update test script with your credentials:**
```bash
# Edit scripts/test-coupon-apis.sh
API_BASE="http://localhost:3000"
ADMIN_COOKIE="your-admin-session-cookie"
USER_JWT="your-user-jwt-token"

# Run tests
./scripts/test-coupon-apis.sh
```

## Manual Testing with curl

### Admin - Create Coupon

```bash
curl -X POST http://localhost:3000/admin/coupons \
  -H "Cookie: admin_session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "description": "20% off everything",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "minPurchaseAmount": 10,
    "maxDiscountAmount": 5,
    "maxUsesPerUser": 1,
    "maxTotalUses": 50,
    "validFrom": "2026-01-27T00:00:00Z",
    "validUntil": "2026-03-31T23:59:59Z",
    "isActive": true
  }'
```

### Admin - List Coupons

```bash
curl -X GET "http://localhost:3000/admin/coupons?page=1&limit=20&status=active" \
  -H "Cookie: admin_session=YOUR_SESSION"
```

### User - Validate Coupon

```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "amount": 25.500,
    "products": [
      {"productId": "prod-123", "quantity": 3}
    ]
  }'
```

### User - Make Payment with Coupon

```bash
curl -X POST http://localhost:3000/api/payments/card/pay \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "mach-456",
    "amount": 25.500,
    "products": [
      {"productId": "prod-123", "quantity": 3}
    ],
    "pointsToRedeem": 0,
    "couponCode": "SAVE20",
    "cardId": "card-789"
  }'
```

## Expected Responses

### Successful Create
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "id": "uuid-here",
    "code": "SAVE20",
    "discount_type": "PERCENTAGE",
    "discount_value": 20,
    ...
  }
}
```

### Successful Validation
```json
{
  "success": true,
  "message": "Coupon is valid",
  "data": {
    "valid": true,
    "coupon": {
      "code": "SAVE20",
      "discountType": "PERCENTAGE",
      "discountValue": 20,
      "discountAmount": 5.000,
      "finalAmount": 20.500,
      "message": "Coupon applied! You save KWD 5.000"
    }
  }
}
```

### Invalid Coupon
```json
{
  "success": true,
  "message": "Coupon validation failed",
  "data": {
    "valid": false,
    "error": "Coupon has expired"
  }
}
```

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Discount Coupons",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Admin - Create Coupon",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": "{{baseUrl}}/admin/coupons",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"code\": \"TEST10\",\n  \"description\": \"Test coupon\",\n  \"discountType\": \"PERCENTAGE\",\n  \"discountValue\": 10,\n  \"minPurchaseAmount\": 0,\n  \"maxUsesPerUser\": 1,\n  \"validFrom\": \"2026-01-27T00:00:00Z\",\n  \"validUntil\": \"2026-12-31T23:59:59Z\",\n  \"isActive\": true\n}"
        }
      }
    },
    {
      "name": "Admin - List Coupons",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/admin/coupons?page=1&limit=20"
      }
    },
    {
      "name": "User - Validate Coupon",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"},
          {"key": "Authorization", "value": "Bearer {{userToken}}"}
        ],
        "url": "{{baseUrl}}/api/coupons/validate",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"code\": \"TEST10\",\n  \"amount\": 15.5\n}"
        }
      }
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:3000"}
  ]
}
```

## Troubleshooting

### "Unauthorized" errors
- Admin endpoints need cookie session
- User endpoints need JWT token
- Check authentication headers

### "Validation failed" errors
- Check request body matches schema
- Code must be uppercase alphanumeric
- Dates must be ISO 8601 format
- discountType must be 'PERCENTAGE' or 'FIXED_AMOUNT'

### "Coupon not found" errors
- Verify coupon was created
- Check code spelling (case-sensitive)
- Ensure coupon is active

### Migration errors
- Check if tables already exist
- Verify foreign key constraints (admins, users, payments tables must exist)
- Check PostgreSQL version (need 12+)

## Next Steps

1. ✅ Run migration
2. ✅ Test APIs with script or Postman
3. Create some real coupons
4. Test payment flow end-to-end
5. Build frontend admin UI
6. Add user checkout integration
