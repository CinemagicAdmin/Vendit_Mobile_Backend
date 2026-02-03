import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { stepSubmissionLimiter } from '../middleware/rate-limiters.js';
import {
  getActiveChallengesApi,
  registerForChallengeApi,
  submitStepsApi,
  getProgressApi,
  getLeaderboardApi,
  getMyBadgesApi
} from '../modules/step-challenges/user-step-challenges.controller.js';

const router = Router();

// All routes require user authentication
router.use(requireAuth);

// Get active challenges
router.get('/active', getActiveChallengesApi);

// Get user's badges
router.get('/my-badges', getMyBadgesApi);

// Register for a challenge
router.post('/:id/register', registerForChallengeApi);

// Submit step count (with rate limiting)
router.post('/:id/submit', stepSubmissionLimiter, submitStepsApi);

// Get user's progress in challenge
router.get('/:id/progress', getProgressApi);

// Get challenge leaderboard
router.get('/:id/leaderboard', getLeaderboardApi);

export default router;
