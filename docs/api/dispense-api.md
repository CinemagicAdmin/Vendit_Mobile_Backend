# Dispense API Documentation

**Version:** 2.0 (Secured)  
**Last Updated:** January 6, 2026

---

## Overview

The Dispense API enables physical product dispensing from vending machines after payment verification. This endpoint includes comprehensive security checks to prevent unauthorized access and ensure payment integrity.

---

## Authentication

**Required:** Bearer token in Authorization header

```http
Authorization: Bearer <your_jwt_token>
```

---

## Endpoint

```http
POST /api/users/machine/dispense
POST /api/machines/dispense
```

Both endpoints are equivalent (legacy and new paths).

---

## Request Format

### Single Product Dispense

```json
{
  "machineId": "VENDIT_0023",
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "slotNumber": "35"
}
```

### Multiple Products Dispense (Batch)

```json
{
  "machineId": "VENDIT_0023",
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "slots": [
    { "slotNumber": "10", "quantity": 1 },
    { "slotNumber": "15", "quantity": 2 },
    { "slotNumber": "20", "quantity": 1 }
  ]
}
```

---

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `machineId` | string | Yes | Machine identifier (alphanumeric, dashes, underscores) |
| `paymentId` | string (UUID) | Yes | Valid payment ID from successful transaction |
| `slotNumber` | string | Conditional* | Slot number (numeric string) for single dispense |
| `slots` | array | Conditional* | Array of slot objects for batch dispense |
| `slots[].slotNumber` | string | Yes** | Slot number (numeric string) |
| `slots[].quantity` | integer | No | Quantity to dispense (1-10), default: 1 |

*Either `slotNumber` OR `slots` must be provided, not both.  
**Required if using `slots` array.

---

## Validation Rules

### Machine ID
- Format: Alphanumeric with dashes/underscores
- Length: 1-50 characters
- Pattern: `^[A-Z0-9_-]+$` (case insensitive)
- Examples: ✅ `VENDIT_0023`, `VND-123` | ❌ `vend it!`, `abc@123`

### Payment ID
- Format: Valid UUID v4
- Example: ✅ `550e8400-e29b-41d4-a716-446655440000`

### Slot Number
- Format: Numeric string only
- Pattern: `^\d+$`
- Examples: ✅ `10`, `35`, `100` | ❌ `abc`, `10a`, `1.5`

### Quantity (Batch Mode)
- Type: Integer
- Range: 1-10 per slot
- Total limit: 50 items across all slots

---

## Security Checks (All Enforced)

Before dispensing, the API verifies:

1. **Authentication** - Valid JWT token
2. **Payment Exists** - Payment ID is valid
3. **Authorization** - User owns the payment
4. **Payment Status** - Payment is PAID or CAPTURED
5. **Machine Match** - Payment was made for this machine
6. **Idempotency** - Products not already dispensed
7. **Machine Status** - Machine is ONLINE and operational
8. **Slot Validation** - Requested slots exist in machine

---

## Response Codes

| Code | Meaning | Scenario |
|------|---------|----------|
| 200 | Success | Dispense command sent successfully |
| 400 | Bad Request | Invalid format, wrong machine, unpaid, etc. |
| 403 | Forbidden | User doesn't own payment |
| 404 | Not Found | Payment or machine not found |
| 409 | Conflict | Already dispensed (duplicate request) |
| 503 | Service Unavailable | Machine offline or in maintenance |

---

## Success Response (200)

### Single Product

```json
{
  "success": true,
  "data": {
    "acknowledged": true,
    "commandSent": true
  },
  "message": "Dispense command sent"
}
```

### Batch (Multiple Products)

```json
{
  "success": true,
  "data": {
    "total": 4,
    "successful": 4,
    "failed": 0,
    "results": [
      { "slotNumber": "10", "success": true },
      { "slotNumber": "15", "success": true },
      { "slotNumber": "15", "success": true },
      { "slotNumber": "20", "success": true }
    ],
    "partialSuccess": false
  },
  "message": "Batch dispense completed successfully"
}
```

---

## Error Responses

### 400 - Invalid Format

```json
{
  "success": false,
  "message": "Slot number must be numeric"
}
```

### 400 - Payment Status

```json
{
  "success": false,
  "message": "Payment status is PENDING. Cannot dispense until payment is completed."
}
```

### 400 - Wrong Machine

```json
{
  "success": false,
  "message": "Payment is for a different machine",
  "paymentMachine": "VENDIT_0023",
  "requestedMachine": "VENDIT_0042"
}
```

### 400 - Invalid Slots

```json
{
  "success": false,
  "message": "One or more slot numbers are invalid for this machine",
  "invalidSlots": ["99", "105"]
}
```

### 403 - Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized: You do not own this payment"
}
```

### 404 - Payment Not Found

```json
{
  "success": false,
  "message": "Payment not found"
}
```

### 404 - Machine Not Found

```json
{
  "success": false,
  "message": "Machine not found"
}
```

### 409 - Already Dispensed

```json
{
  "success": false,
  "message": "Products have already been dispensed for this payment",
  "dispensedAt": "2026-01-06T10:15:30.000Z"
}
```

### 503 - Machine Offline

```json
{
  "success": false,
  "message": "This machine is currently offline or in maintenance. Please try another machine.",
  "machineStatus": "OFFLINE"
}
```

---

## Complete Flow Example

### Step 1: Make Payment

```http
POST /api/payments/pay-by-Wallet HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1.500,
  "machineId": "VENDIT_0023",
  "products": [
    { "productId": "prod-cola", "quantity": 1 },
    { "productId": "prod-chips", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "PAID",
      "amount": 1.500
    }
  }
}
```

### Step 2: Get Machine Details (to find slots)

```http
GET /api/users/machine/detail/VENDIT_0023 HTTP/1.1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "machine": { "u_id": "VENDIT_0023", ... },
  "slots": [
    { "slot_number": "10", "product_u_id": "prod-cola", ... },
    { "slot_number": "15", "product_u_id": "prod-chips", ... }
  ]
}
```

### Step 3: Trigger Dispense

```http
POST /api/users/machine/dispense HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "machineId": "VENDIT_0023",
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "slots": [
    { "slotNumber": "10", "quantity": 1 },
    { "slotNumber": "15", "quantity": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0
  },
  "message": "Batch dispense completed successfully"
}
```

### Step 4: Update Dispensed Status (Optional)

```http
POST /api/payments/product/update/dispensedQty HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "machineId": "VENDIT_0023",
  "vendorPartNumbers": ["VP-COLA", "VP-CHIPS", "VP-CHIPS"]
}
```

---

## Rate Limiting

- **Endpoint:** Limited to prevent abuse
- **Limit:** 10 requests per minute per user
- **Headers:** Check `X-RateLimit-*` headers in response

---

## Timing

| Products | Estimated Time |
|----------|----------------|
| 1 | ~8 seconds |
| 5 | ~20 seconds |
| 10 | ~30 seconds |
| 20 | ~60 seconds |

*Time includes WebSocket connection, command sending, and automatic delays between products*

---

## Best Practices

### ✅ DO

- Always use payment ID from successful payment
- Check machine status before attempting dispense
- Handle 409 errors gracefully (already dispensed)
- Show user-friendly error messages
- Implement loading states (dispense takes time)

### ❌ DON'T

- Don't retry on 409 (already dispensed)
- Don't reuse payment IDs across different machines
- Don't assume dispense succeeded without checking response
- Don't send parallel dispense requests for same payment

---

## Error Recovery

### If Dispense Fails

1. **Check error code** - Different codes need different actions
2. **For 503 (offline)** - Suggest another machine
3. **For 409 (already dispensed)** - Confirm with user, don't retry
4. **For 400/403/404** - Show error to user, don't retry
5. **For 500/502** - Safe to retry after delay

### Retry Logic

```typescript
async function dispenseWithRetry(payload, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await dispense(payload);
      return response;
    } catch (error) {
      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Retry on 5xx (server errors)
      if (attempt < maxRetries) {
        await delay(1000 * attempt); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

---

## Changelog

### v2.0.0 (2026-01-06) - BREAKING CHANGES

**Added:**
- ✅ `paymentId` parameter (now required)
- ✅ Payment verification and authorization
- ✅ Machine state validation
- ✅ Slot validation
- ✅ Idempotency checks
- ✅ Audit logging
- ✅ Enhanced error messages

**Changed:**
- 🔄 `machineId` now validates format
- 🔄 `slotNumber` must be numeric
- 🔄 Added max quantity limits

**Migration:** All clients must include `paymentId` in requests

### v1.0.0 (Previous)
- Basic dispense functionality
- No payment verification

---

## Support

**Issues?** Contact backend team or check:
- Dispense logs: `SELECT * FROM dispense_logs WHERE payment_id = 'your-id'`
- Payment status: `SELECT * FROM payments WHERE id = 'your-id'`
- Machine status: `SELECT machine_operation_state FROM machines WHERE u_id = 'machine-id'`

---

*Documentation last updated: January 6, 2026*
