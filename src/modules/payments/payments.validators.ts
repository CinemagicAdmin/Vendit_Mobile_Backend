import { z } from 'zod';
export const cardCreateSchema = z.object({
  number: z.string().min(12).max(19),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(new Date().getFullYear()),
  cvc: z.string().min(3).max(4),
  name: z.string().min(1)
});
export const walletChargeSchema = z.object({
  amount: z.coerce.number().positive(),
  machineId: z.string().optional(),
  customerId: z.string().optional(),
  cardId: z.string().optional(),
  type: z.enum(['android', 'iOS']).optional(),
  productIds: z
    .array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() }))
    .optional()
});
export const cardPaymentSchema = z.object({
  cardId: z.string().optional(), // Required for CARD, not needed for KNET
  tokenId: z.string().optional(), // For KNET repeat payments with saved tokens (tok_xxx)
  customerId: z.string().optional(), // Tap customer ID (enables KFAST for KNET)
  amount: z.coerce.number().positive(),
  machineId: z.string(),
  products: z.array(
    z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })
  ),
  pointsToRedeem: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(['CARD', 'KNET']).optional().default('CARD'), // KNET enables KFast
  saveCard: z.boolean().optional().default(false), // For KNET: enroll in KFAST
  redirectUrl: z.string().url().optional() // For KNET: redirect after payment
});
export const iosPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  chargeId: z.string(),
  customerId: z.string().optional(),
  machineId: z.string(),
  products: z.array(
    z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })
  ),
  pointsToRedeem: z.coerce.number().min(0).optional()
});
export const walletPaymentSchema = z.object({
  amount: z.coerce.number().min(0),
  machineId: z.string(),
  products: z.array(
    z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })
  ),
  pointsToRedeem: z.coerce.number().min(0).optional()
});
export const dispenseSchema = z.object({
  paymentId: z.string(),
  machineId: z.string(),
  vendorPartNumbers: z.array(z.string().min(1))
});
export const gpayTokenSchema = z.object({
  tokenData: z.unknown(),
  paymentMethodType: z.string().min(1)
});
export const gpayPaymentSchema = z.object({
  tokenId: z.string(),
  amount: z.coerce.number().positive(),
  machineId: z.string(),
  products: z.array(
    z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })
  ),
  pointsToRedeem: z.coerce.number().min(0).optional()
  // pointsToRedeem: z.coerce.number().int().positive().optional()
});

// KNET payment schema
export const knetPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  machineId: z.string(),
  products: z.array(
    z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })
  ),
  customerId: z.string().optional(), // For existing customers
  saveCard: z.boolean().optional().default(false), // Enable KFast enrollment
  redirectUrl: z.string().url().optional(),
  pointsToRedeem: z.coerce.number().min(0).optional()
});

// KFast payment schema (saved KNET cards)
export const kfastPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  machineId: z.string(),
  products: z.array(
    z.object({ productId: z.string(), quantity: z.coerce.number().int().positive() })
  ),
  customerId: z.string(), // Required for KFast
  redirectUrl: z.string().url().optional(),
  pointsToRedeem: z.coerce.number().min(0).optional()
});
