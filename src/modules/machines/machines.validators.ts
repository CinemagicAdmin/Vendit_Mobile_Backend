import { z } from 'zod';

// Unified dispense schema - handles both single and batch
export const dispenseCommandSchema = z
  .object({
    machineId: z.string().min(1, 'machineId is required'),
    // Single slot format (backward compatible)
    slotNumber: z.string().min(1).optional(),
    // Batch format (new)
    slots: z
      .array(
        z.object({
          slotNumber: z.string().min(1, 'slotNumber is required'),
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
  );
