import { z } from 'zod';

// Preprocess rating to handle empty strings, null, or invalid values
const ratingPreprocess = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

export const ratingSchema = z.object({
  orderId: z.string().min(1).optional(),
  rating: z.preprocess(ratingPreprocess, z.number().min(0).max(5)),
  emoji: z.string().max(100).optional(), // Increased for emojis (multi-byte chars)
  comment: z.string().max(1000).optional() // Increased limit for longer feedback
});
