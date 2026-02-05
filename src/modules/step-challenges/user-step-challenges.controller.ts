import type { Request, Response, NextFunction } from 'express';
import {
  stepSubmissionSchema,
  uuidParamSchema
} from './step-challenges.validators.js';
import {
  getActiveChallengesForUser,
  registerForChallenge,
  submitUserSteps,
  getUserChallengeProgress,
  getUserBadgesList,
  getLeaderboard
} from './step-challenges.service.js';

/**
 * GET /step-challenges/active - Get active challenges
 */
export const getActiveChallengesApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const result = await getActiveChallengesForUser(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /step-challenges/:id/register - Register for challenge
 */
export const registerForChallengeApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const challengeId = uuidParamSchema.parse(req.params.id);
    const result = await registerForChallenge(challengeId, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /step-challenges/:id/submit - Submit step count
 */
export const submitStepsApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const challengeId = uuidParamSchema.parse(req.params.id);
    const validated = stepSubmissionSchema.parse(req.body);
    const result = await submitUserSteps(challengeId, userId, validated);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /step-challenges/:id/progress - Get user's progress
 */
export const getProgressApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const challengeId = uuidParamSchema.parse(req.params.id);
    const result = await getUserChallengeProgress(challengeId, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /step-challenges/:id/leaderboard - Get challenge leaderboard
 */
export const getLeaderboardApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = uuidParamSchema.parse(req.params.id);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const result = await getLeaderboard(id, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /step-challenges/my-badges - Get user's badges
 */
export const getMyBadgesApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const result = await getUserBadgesList(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
