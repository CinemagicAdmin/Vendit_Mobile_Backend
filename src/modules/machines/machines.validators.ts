import { z } from 'zod';

export const dispenseCommandSchema = z.object({
  machineId: z.string().min(1, 'machineId is required'),
  slotNumber: z.string().min(1, 'slotNumber is required')
});

export const batchDispenseCommandSchema = z.object({
  machineId: z.string().min(1, 'machineId is required'),
  slots: z
    .array(
      z.object({
        slotNumber: z.string().min(1, 'slotNumber is required'),
        quantity: z.coerce.number().int().min(1).max(10).default(1) // Max 10 per slot for safety
      })
    )
    .min(1, 'At least one slot required')
    .max(20) // Max 20 total dispenses for safety
});
