import { z } from 'zod';

/**
 * Schema for creating/updating vouchers (admin)
 */
export const voucherCreateSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must not exceed 50 characters')
    .regex(/^[A-Z0-9-_]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
  
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000, 'Amount must not exceed 1000 KWD'),
  
  maxUsesPerUser: z
    .number()
    .int('Max uses per user must be an integer')
    .positive('Max uses per user must be positive')
    .optional()
    .default(1),
  
  maxTotalUses: z
    .number()
    .int('Max total uses must be an integer')
    .positive('Max total uses must be positive')
    .optional()
    .nullable(),
  
  validFrom: z
    .string()
    .datetime('Valid from must be a valid ISO datetime'),
  
  validUntil: z
    .string()
    .datetime('Valid until must be a valid ISO datetime'),
  
  isActive: z
    .boolean()
    .optional()
    .default(true)
}).refine(
  (data) => new Date(data.validFrom) < new Date(data.validUntil),
  {
    message: 'Valid from must be before valid until',
    path: ['validFrom']
  }
);

/**
 * Schema for updating vouchers (optional fields)
 */
export const voucherUpdateSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must not exceed 50 characters')
    .regex(/^[A-Z0-9-_]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase())
    .optional(),
  
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .nullable(),
  
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000, 'Amount must not exceed 1000 KWD')
    .optional(),
  
  maxUsesPerUser: z
    .number()
    .int('Max uses per user must be an integer')
    .positive('Max uses per user must be positive')
    .optional(),
  
  maxTotalUses: z
    .number()
    .int('Max total uses must be an integer')
    .positive('Max total uses must be positive')
    .optional()
    .nullable(),
  
  validFrom: z
    .string()
    .datetime('Valid from must be a valid ISO datetime')
    .optional(),
  
  validUntil: z
    .string()
    .datetime('Valid until must be a valid ISO datetime')
    .optional(),
  
  isActive: z
    .boolean()
    .optional()
}).refine(
  (data) => {
    if (data.validFrom && data.validUntil) {
      return new Date(data.validFrom) < new Date(data.validUntil);
    }
    return true;
  },
  {
    message: 'Valid from must be before valid until',
    path: ['validFrom']
  }
);

/**
 * Schema for redeeming vouchers (user)
 */
export const voucherRedeemSchema = z.object({
  code: z
    .string()
    .min(3, 'Voucher code is required')
    .max(50, 'Invalid voucher code')
    .transform((val) => val.toUpperCase())
});

/**
 * Query parameters for listing vouchers
 */
export const voucherListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all')
});

/**
 * Query parameters for voucher redemptions
 */
export const voucherRedemptionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

// Exported types inferred from schemas
export type VoucherCreateInput = z.infer<typeof voucherCreateSchema>;
export type VoucherUpdateInput = z.infer<typeof voucherUpdateSchema>;

