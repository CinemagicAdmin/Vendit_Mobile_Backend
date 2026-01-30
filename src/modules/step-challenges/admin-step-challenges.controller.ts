import type { Request, Response, NextFunction } from 'express';
import { auditLog } from '../../utils/audit.js';
import {
  stepChallengeCreateSchema,
  stepChallengeUpdateSchema,
  challengeListQuerySchema,
  paginationQuerySchema
} from './step-challenges.validators.js';
import {
  createStepChallenge,
  getStepChallengeDetails,
  updateStepChallenge,
  deleteStepChallenge,
  toggleStepChallenge,
  listStepChallenges,
  getLeaderboard,
  getParticipants,
  finalizeStepChallenge
} from './step-challenges.service.js';

/**
 * POST /admin/step-challenges - Create new step challenge
 */
export const createChallengeApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const validated = stepChallengeCreateSchema.parse(req.body);
    const result = await createStepChallenge(adminId, validated);

    // Audit log
    await auditLog({
      action: 'step_challenge.create',
      adminId,
      resourceType: 'step_challenge',
      resourceId: result.data?.id,
      details: {
        name: validated.name,
        startDate: validated.startDate,
        endDate: validated.endDate
      }
    }, req);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/step-challenges - List all challenges
 */
export const listChallengesApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = challengeListQuerySchema.parse(req.query);
    
    const result = await listStepChallenges(
      { search: query.search, status: query.status, machineId: query.machineId },
      { page: query.page, limit: query.limit }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/step-challenges/:id - Get challenge details with stats
 */
export const getChallengeDetailsApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await getStepChallengeDetails(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /admin/step-challenges/:id - Update challenge
 */
export const updateChallengeApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const validated = stepChallengeUpdateSchema.parse(req.body);
    const result = await updateStepChallenge(id, validated);

    // Audit log
    await auditLog({
      action: 'step_challenge.update',
      adminId,
      resourceType: 'step_challenge',
      resourceId: id,
      details: validated
    }, req);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /admin/step-challenges/:id - Delete challenge
 */
export const deleteChallengeApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const result = await deleteStepChallenge(id);

    // Audit log
    await auditLog({
      action: 'step_challenge.delete',
      adminId,
      resourceType: 'step_challenge',
      resourceId: id,
      details: {}
    }, req);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/step-challenges/:id/toggle - Toggle challenge status
 */
export const toggleChallengeApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const result = await toggleStepChallenge(id);

    // Audit log
    await auditLog({
      action: 'step_challenge.toggle',
      adminId,
      resourceType: 'step_challenge',
      resourceId: id,
      details: { isActive: result.data?.is_active }
    }, req);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/step-challenges/:id/leaderboard - Get full leaderboard
 */
export const getLeaderboardApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await getLeaderboard(id, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/step-challenges/:id/participants - Get participants list
 */
export const getParticipantsApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const query = paginationQuerySchema.parse(req.query);
    const result = await getParticipants(id, { page: query.page, limit: query.limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/step-challenges/:id/finalize - Finalize challenge and award ranking badges
 */
export const finalizeChallengeApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const result = await finalizeStepChallenge(id);

    // Audit log
    await auditLog({
      action: 'step_challenge.update', // Re-using update or could add .finalize
      adminId,
      resourceType: 'step_challenge',
      resourceId: id,
      details: { action: 'finalize', badgesAwarded: result.data?.awardedBadges?.length || 0 }
    }, req);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

