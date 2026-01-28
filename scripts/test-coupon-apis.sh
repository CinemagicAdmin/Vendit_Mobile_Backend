#!/bin/bash

# =====================================================
# Discount Coupon Module - API Test Script
# =====================================================
# Tests all coupon endpoints after migration deployment
# =====================================================

# Configuration
API_BASE="http://localhost:3000"
ADMIN_COOKIE="your-admin-session-cookie-here"
USER_JWT="your-user-jwt-token-here"

echo "======================================"
echo "Coupon Module API Tests"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =====================================================
# ADMIN TESTS
# =====================================================

echo -e "\n${YELLOW}1. Testing Admin - Create Coupon${NC}"
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE}/admin/coupons" \
  -H "Cookie: ${ADMIN_COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "description": "10% off for new users",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "minPurchaseAmount": 5,
    "maxDiscountAmount": 3,
    "maxUsesPerUser": 1,
    "maxTotalUses": 100,
    "validFrom": "2026-01-27T00:00:00Z",
    "validUntil": "2026-02-28T23:59:59Z",
    "isActive": true
  }')

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Coupon created successfully${NC}"
  COUPON_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "  Coupon ID: $COUPON_ID"
else
  echo -e "${RED}✗ Failed to create coupon${NC}"
  echo "$CREATE_RESPONSE"
fi

echo -e "\n${YELLOW}2. Testing Admin - List Coupons${NC}"
LIST_RESPONSE=$(curl -s -X GET "${API_BASE}/admin/coupons?page=1&limit=10" \
  -H "Cookie: ${ADMIN_COOKIE}")

if echo "$LIST_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ List coupons successful${NC}"
  TOTAL=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "  Total coupons: ${TOTAL:-0}"
else
  echo -e "${RED}✗ Failed to list coupons${NC}"
  echo "$LIST_RESPONSE"
fi

if [ -n "$COUPON_ID" ]; then
  echo -e "\n${YELLOW}3. Testing Admin - Get Coupon Details${NC}"
  DETAILS_RESPONSE=$(curl -s -X GET "${API_BASE}/admin/coupons/${COUPON_ID}" \
    -H "Cookie: ${ADMIN_COOKIE}")

  if echo "$DETAILS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Get coupon details successful${NC}"
    echo "  Code: $(echo "$DETAILS_RESPONSE" | grep -o '"code":"[^"]*' | cut -d'"' -f4)"
  else
    echo -e "${RED}✗ Failed to get coupon details${NC}"
    echo "$DETAILS_RESPONSE"
  fi

  echo -e "\n${YELLOW}4. Testing Admin - Update Coupon${NC}"
  UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/admin/coupons/${COUPON_ID}" \
    -H "Cookie: ${ADMIN_COOKIE}" \
    -H "Content-Type: application/json" \
    -d '{
      "description": "Updated: 10% off for new users"
    }')

  if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Coupon updated successfully${NC}"
  else
    echo -e "${RED}✗ Failed to update coupon${NC}"
    echo "$UPDATE_RESPONSE"
  fi

  echo -e "\n${YELLOW}5. Testing Admin - Get Usage History${NC}"
  USAGE_RESPONSE=$(curl -s -X GET "${API_BASE}/admin/coupons/${COUPON_ID}/usage" \
    -H "Cookie: ${ADMIN_COOKIE}")

  if echo "$USAGE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Get usage history successful${NC}"
  else
    echo -e "${RED}✗ Failed to get usage history${NC}"
    echo "$USAGE_RESPONSE"
  fi
fi

# =====================================================
# USER TESTS
# =====================================================

echo -e "\n${YELLOW}6. Testing User - Validate Coupon${NC}"
VALIDATE_RESPONSE=$(curl -s -X POST "${API_BASE}/api/coupons/validate" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "amount": 15.5,
    "products": [
      {"productId": "test-product-1", "quantity": 2}
    ]
  }')

if echo "$VALIDATE_RESPONSE" | grep -q '"valid":true'; then
  echo -e "${GREEN}✓ Coupon validation successful${NC}"
  DISCOUNT=$(echo "$VALIDATE_RESPONSE" | grep -o '"discountAmount":[0-9.]*' | cut -d':' -f2)
  FINAL=$(echo "$VALIDATE_RESPONSE" | grep -o '"finalAmount":[0-9.]*' | cut -d':' -f2)
  echo "  Discount: ${DISCOUNT:-0} KWD"
  echo "  Final Amount: ${FINAL:-0} KWD"
elif echo "$VALIDATE_RESPONSE" | grep -q '"valid":false'; then
  echo -e "${YELLOW}⚠ Coupon is not valid${NC}"
  ERROR=$(echo "$VALIDATE_RESPONSE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
  echo "  Reason: ${ERROR}"
else
  echo -e "${RED}✗ Failed to validate coupon${NC}"
  echo "$VALIDATE_RESPONSE"
fi

echo -e "\n${YELLOW}7. Testing User - List Available Coupons${NC}"
AVAILABLE_RESPONSE=$(curl -s -X GET "${API_BASE}/api/coupons/available" \
  -H "Authorization: Bearer ${USER_JWT}")

if echo "$AVAILABLE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ List available coupons successful${NC}"
  COUNT=$(echo "$AVAILABLE_RESPONSE" | grep -o '"coupons":\[' | wc -l)
  echo "  Available coupons loaded"
else
  echo -e "${RED}✗ Failed to list available coupons${NC}"
  echo "$AVAILABLE_RESPONSE"
fi

# =====================================================
# CLEANUP (Optional)
# =====================================================

if [ -n "$COUPON_ID" ]; then
  echo -e "\n${YELLOW}8. Testing Admin - Deactivate Coupon${NC}"
  DEACTIVATE_RESPONSE=$(curl -s -X PATCH "${API_BASE}/admin/coupons/${COUPON_ID}/deactivate" \
    -H "Cookie: ${ADMIN_COOKIE}")

  if echo "$DEACTIVATE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Coupon deactivated successfully${NC}"
  else
    echo -e "${RED}✗ Failed to deactivate coupon${NC}"
    echo "$DEACTIVATE_RESPONSE"
  fi

  # Uncomment to delete test coupon
  # echo -e "\n${YELLOW}9. Testing Admin - Delete Coupon${NC}"
  # DELETE_RESPONSE=$(curl -s -X DELETE "${API_BASE}/admin/coupons/${COUPON_ID}" \
  #   -H "Cookie: ${ADMIN_COOKIE}")
  # 
  # if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
  #   echo -e "${GREEN}✓ Coupon deleted successfully${NC}"
  # else
  #   echo -e "${RED}✗ Failed to delete coupon${NC}"
  #   echo "$DELETE_RESPONSE"
  # fi
fi

echo -e "\n${GREEN}======================================"
echo "Test Suite Complete!"
echo -e "======================================${NC}"
