/**
 * Step Challenges Module Constants
 * All magic numbers and configuration values
 */

// ============ Leaderboard ============
export const LEADERBOARD_DEFAULT_LIMIT = 10;
export const LEADERBOARD_MAX_LIMIT = 100;
export const LEADERBOARD_TOP_THREE = 3;

// ============ Pagination ============
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// ============ Step Submission ============
export const MAX_STEPS_PER_SUBMISSION = 500000;
export const RANK_CALCULATION_LIMIT = 100; // Max entries to fetch for rank calculation

// ============ File Upload ============
export const MAX_BADGE_ICON_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
] as const;

// ============ Rate Limiting ============
export const STEP_SUBMIT_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 submissions per minute per user
};

// ============ Badges ============
export const DEFAULT_BADGE_ICON = '🏅';
export const RANKING_BADGE_ICONS = ['🥇', '🥈', '🥉'] as const;
export const RANKING_BADGE_NAMES = ['1st Place', '2nd Place', '3rd Place'] as const;

// ============ Validation ============
export const CHALLENGE_NAME_MIN_LENGTH = 3;
export const CHALLENGE_NAME_MAX_LENGTH = 100;
export const CHALLENGE_DESCRIPTION_MAX_LENGTH = 1000;
export const BADGE_NAME_MAX_LENGTH = 50;
export const BADGE_ICON_MAX_LENGTH = 512;
export const LOCATION_NAME_MAX_LENGTH = 200;
