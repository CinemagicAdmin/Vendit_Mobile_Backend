import { z } from 'zod';

// Unified dispense schema - handles both single and batch
export const dispenseCommandSchema = z
  .object({
    machineId: z
      .string()
      .regex(/^[A-Z0-9_-]+$/i, 'Machine ID must be alphanumeric with dashes/underscores')
      .min(1, 'Machine ID is required')
      .max(50, 'Machine ID too long'),
    paymentId: z.string().uuid('Valid payment ID required'), // CRITICAL: Now required
    // Single slot format (backward compatible)
    slotNumber: z
      .string()
      .regex(/^\d+$/, 'Slot number must be numeric')
      .optional(),
    // Batch format (new)
    slots: z
      .array(
        z.object({
          slotNumber: z
            .string()
            .regex(/^\d+$/, 'Slot number must be numeric')
            .min(1, 'Slot number is required'),
          quantity: z.coerce.number().int().min(1).max(10).default(1)
        })
      )
      .min(1)
      .max(20)
      .optional()
  })
  .refine(
    (data) => data.slotNumber !== undefined || (data.slots !== undefined && data.slots.length > 0),
    {
      message: 'Either slotNumber or slots array is required'
    }
  )
  .refine(
    (data) => {
      if (!data.slots) return true;
      const total = data.slots.reduce((sum, s) => sum + s.quantity, 0);
      return total <= 50;
    },
    {
      message: 'Total dispense quantity exceeds maximum of 50 items'
    }
  );
