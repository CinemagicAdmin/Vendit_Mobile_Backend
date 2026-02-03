import { z } from 'zod';

/**
 * UUID parameter validation schema
 */
export const uuidParamSchema = z.string().uuid('Invalid ID format');

/**
 * Badge threshold schema
 */
export const badgeThresholdSchema = z.object({
  steps: z.number().int().positive('Steps must be positive'),
  badge_name: z.string().min(1, 'Badge name required').max(50),
  badge_icon: z.string().max(512).optional().default('🏅')
});

/**
 * Schema for creating step challenges (admin)
 */
export const stepChallengeCreateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .nullable(),
  
  machineId: z
    .string()
    .uuid('Invalid machine ID')
    .optional()
    .nullable(),
  
  locationName: z
    .string()
    .max(200, 'Location name must not exceed 200 characters')
    .optional()
    .nullable(),
  
  locationLatitude: z
    .number()
    .min(-90).max(90)
    .optional()
    .nullable(),
  
  locationLongitude: z
    .number()
    .min(-180).max(180)
    .optional()
    .nullable(),
  
  startDate: z
    .string()
    .datetime('Start date must be a valid ISO datetime'),
  
  endDate: z
    .string()
    .datetime('End date must be a valid ISO datetime'),
  
  isActive: z
    .boolean()
    .optional()
    .default(true),
  
  badgeThresholds: z
    .array(badgeThresholdSchema)
    .optional()
    .default([])
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  {
    message: 'Start date must be before end date',
    path: ['startDate']
  }
);

/**
 * Schema for updating step challenges
 */
export const stepChallengeUpdateSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(100)
    .optional(),
  
  description: z
    .string()
    .max(1000)
    .optional()
    .nullable(),
  
  machineId: z
    .string()
    .uuid()
    .optional()
    .nullable(),
  
  locationName: z
    .string()
    .max(200)
    .optional()
    .nullable(),
  
  locationLatitude: z
    .number()
    .min(-90).max(90)
    .optional()
    .nullable(),
  
  locationLongitude: z
    .number()
    .min(-180).max(180)
    .optional()
    .nullable(),
  
  startDate: z
    .string()
    .datetime()
    .optional(),
  
  endDate: z
    .string()
    .datetime()
    .optional(),
  
  isActive: z
    .boolean()
    .optional(),
  
  badgeThresholds: z
    .array(badgeThresholdSchema)
    .optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before end date',
    path: ['startDate']
  }
);

/**
 * Schema for step submission from health apps
 * 
 * IMPORTANT: Step Submission Modes
 * 
 * 1. ABSOLUTE MODE (isAbsolute: true) - RECOMMENDED for Health Apps
 *    - Mobile app sends total cumulative steps from HealthKit/Health Connect
 *    - Backend calculates delta and adds only the new steps
 *    - Prevents duplication on multiple sync calls
 *    - Example: HealthKit shows 5000 steps total → send { steps: 5000, isAbsolute: true }
 * 
 * 2. INCREMENTAL MODE (isAbsolute: false) - For manual entry only
 *    - Steps are added to existing total
 *    - Use only for manual "Add Steps" feature
 *    - Example: User manually adds 500 steps → send { steps: 500, isAbsolute: false }
 */
export const stepSubmissionSchema = z.object({
  steps: z
    .number()
    .int('Steps must be an integer')
    .nonnegative('Steps must be non-negative')
    .max(500000, 'Steps cannot exceed 500,000'),
  
  // When true, 'steps' represents total cumulative steps from health app
  // Backend will calculate the delta and add only new steps
  isAbsolute: z
    .boolean()
    .optional()
    .default(true), // Default to absolute for safety (prevents duplication)
  
  source: z
    .enum(['apple_health', 'health_connect', 'manual'])
    .optional()
    .default('manual'),
  
  // Timestamp of the last sync from the device (for conflict resolution)
  lastDeviceSyncAt: z
    .string()
    .datetime()
    .optional(),
  
  deviceInfo: z
    .record(z.string(), z.unknown())
    .optional()
});

/**
 * Query parameters for listing challenges
 */
export const challengeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  machineId: z.string().uuid().optional()
});

/**
 * Query parameters for pagination
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

// Exported types
export type StepChallengeCreateInput = z.infer<typeof stepChallengeCreateSchema>;
export type StepChallengeUpdateInput = z.infer<typeof stepChallengeUpdateSchema>;
export type StepSubmissionInput = z.infer<typeof stepSubmissionSchema>;
