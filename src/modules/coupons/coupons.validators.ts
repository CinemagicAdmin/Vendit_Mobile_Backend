import { z } from 'zod';

// =====================================================
// COUPON CREATION/UPDATE SCHEMAS
// =====================================================

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers'),
  
  description: z.string().optional(),
  
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  
  discountValue: z
    .number()
    .positive('Discount value must be greater than 0'),
  
  minPurchaseAmount: z.number().min(0, 'Minimum purchase must be 0 or greater').optional(),
  
  maxDiscountAmount: z.number().positive('Max discount must be greater than 0').optional().nullable(),
  
  maxUsesPerUser: z.number().int().positive('Max uses per user must be at least 1').optional(),
  
  maxTotalUses: z.number().int().positive('Max total uses must be at least 1').optional().nullable(),
  
  validFrom: z.string().datetime('Invalid date format for valid from'),
  
  validUntil: z.string().datetime('Invalid date format for valid until'),
  
  isActive: z.boolean().optional()
}).refine(
  (data) => {
    // Percentage discount cannot exceed 100
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100',
    path: ['discountValue']
  }
).refine(
  (data) => new Date(data.validUntil) > new Date(data.validFrom),
  {
    message: 'Valid until must be after valid from',
    path: ['validUntil']
  }
);

export const updateCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers')
    .optional(),
  
  description: z.string().optional(),
  
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  
  discountValue: z.number().positive('Discount value must be greater than 0').optional(),
  
  minPurchaseAmount: z.number().min(0, 'Minimum purchase must be 0 or greater').optional(),
  
  maxDiscountAmount: z.number().positive('Max discount must be greater than 0').optional().nullable(),
  
  maxUsesPerUser: z.number().int().positive('Max uses per user must be at least 1').optional(),
  
  maxTotalUses: z.number().int().positive('Max total uses must be at least 1').optional().nullable(),
  
  validFrom: z.string().datetime('Invalid date format for valid from').optional(),
  
  validUntil: z.string().datetime('Invalid date format for valid until').optional(),
  
  isActive: z.boolean().optional()
});

// =====================================================
// USER-SIDE VALIDATION SCHEMA
// =====================================================

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  
  amount: z.number().positive('Amount must be greater than 0'),
  
  products: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  })).optional()
});

// =====================================================
// QUERY SCHEMAS
// =====================================================

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  search: z.string().optional()
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
