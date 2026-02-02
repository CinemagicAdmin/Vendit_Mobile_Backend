import { Router } from 'express';
import { cookieAuth } from '../middleware/cookie-auth.middleware.js';
import { adminLimiter } from '../middleware/rate-limiters.js';
import {
  createChallengeApi,
  listChallengesApi,
  getChallengeDetailsApi,
  updateChallengeApi,
  deleteChallengeApi,
  toggleChallengeApi,
  getLeaderboardApi,
  getParticipantsApi,
  badgeIconUploadMiddleware,
  uploadBadgeIconApi,
  finalizeChallengeApi
} from '../modules/step-challenges/admin-step-challenges.controller.js';

const router = Router();

// All routes require admin authentication
router.use(cookieAuth);
router.use(adminLimiter);

// Create step challenge
router.post('/step-challenges', createChallengeApi);

// Upload badge icon
router.post('/step-challenges/upload-badge-icon', badgeIconUploadMiddleware, uploadBadgeIconApi);

// List all challenges
router.get('/step-challenges', listChallengesApi);

// Get challenge details with stats
router.get('/step-challenges/:id', getChallengeDetailsApi);

// Update challenge
router.put('/step-challenges/:id', updateChallengeApi);

// Delete challenge
router.delete('/step-challenges/:id', deleteChallengeApi);

// Toggle challenge active status
router.patch('/step-challenges/:id/toggle', toggleChallengeApi);

// Get challenge leaderboard
router.get('/step-challenges/:id/leaderboard', getLeaderboardApi);

// Get challenge participants
router.get('/step-challenges/:id/participants', getParticipantsApi);

// Finalize challenge
router.patch('/step-challenges/:id/finalize', finalizeChallengeApi);

export default router;
