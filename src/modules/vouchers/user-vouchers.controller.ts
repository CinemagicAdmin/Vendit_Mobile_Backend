import type { Request, Response, NextFunction } from 'express';
import { ok } from '../../utils/response.js';
import { voucherRedeemSchema, voucherRedemptionQuerySchema } from './vouchers.validators.js';
import { redeemVoucher, getUserHistory } from './vouchers.service.js';

/**
 * POST /api/vouchers/redeem - Redeem voucher code
 * Also available as: POST /users/voucher/redeem (legacy)
 */
export const redeemVoucherApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const validated = voucherRedeemSchema.parse(req.body);
    
    const result = await redeemVoucher(validated.code, userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vouchers/history - Get user's redemption history
 * Also available as: GET /users/voucher/history (legacy)
 */
export const getUserRedemptionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const query = voucherRedemptionQuerySchema.parse(req.query);
    
    const result = await getUserHistory(userId, {
      page: query.page,
      limit: query.limit
    });

    res.json(ok(result, 'Redemption history retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
