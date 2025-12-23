import { z } from 'zod';

// Preprocess rating to handle empty strings, null, or invalid values
const ratingPreprocess = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return 1; // Default to 1 (db constraint)
  const num = Number(val);
  if (isNaN(num) || num < 1) return 1; // Min 1 for database constraint
  if (num > 5) return 5; // Max 5
  return Math.round(num); // Ensure integer
};

export const ratingSchema = z.object({
  orderId: z.string().min(1).optional(),
  rating: z.preprocess(ratingPreprocess, z.number().min(1).max(5)),
  emoji: z.string().max(100).optional(),
  comment: z.string().max(1000).optional()
});
