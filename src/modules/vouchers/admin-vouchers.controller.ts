import type { Request, Response, NextFunction } from 'express';
import { ok } from '../../utils/response.js';
import { auditLog } from '../../utils/audit.js';
import {
  voucherCreateSchema,
  voucherUpdateSchema,
  voucherListQuerySchema,
  voucherRedemptionQuerySchema
} from './vouchers.validators.js';
import {
  createVoucherWithQR,
  updateVoucherData,
  deleteVoucherWithQR,
  toggleVoucher,
  getVoucherDetails,
  listVouchersWithFilters,
  getRedemptionHistory,
  downloadVoucherQR
} from './vouchers.service.js';

/**
 * POST /admin/vouchers - Create new voucher with QR code
 */
export const createVoucherApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const validated = voucherCreateSchema.parse(req.body);
    
    const voucher = await createVoucherWithQR(adminId, validated);

    // Audit log
    await auditLog({
      action: 'voucher.create',
      adminId,
      resourceType: 'voucher',
      resourceId: voucher.id,
      details: {
        code: voucher.code,
        amount: voucher.amount,
        maxTotalUses: voucher.max_total_uses
      }
    }, req);

    res.status(201).json(ok(voucher, 'Voucher created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/vouchers - List all vouchers with filters
 */
export const listVouchersApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = voucherListQuerySchema.parse(req.query);
    
    const result = await listVouchersWithFilters(
      { search: query.search, status: query.status },
      { page: query.page, limit: query.limit }
    );

    res.json(ok(result, 'Vouchers retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/vouchers/:id - Get voucher details with stats
 */
export const getVoucherDetailsApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const result = await getVoucherDetails(id);

    res.json(ok(result, 'Voucher details retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /admin/vouchers/:id - Update voucher
 */
export const updateVoucherApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    const { id } = req.params;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const validated = voucherUpdateSchema.parse(req.body);
    
    const voucher = await updateVoucherData(id, validated);

    // Audit log
    await auditLog({
      action: 'voucher.update',
      adminId,
      resourceType: 'voucher',
      resourceId: voucher.id,
      details: {
        updates: validated
      }
    }, req);

    res.json(ok(voucher, 'Voucher updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /admin/vouchers/:id - Delete voucher
 */
export const deleteVoucherApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    const { id } = req.params;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    await deleteVoucherWithQR(id);

    // Audit log
    await auditLog({
      action: 'voucher.delete',
      adminId,
      resourceType: 'voucher',
      resourceId: id,
      details: {}
    }, req);

    res.json(ok(null, 'Voucher deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/vouchers/:id/toggle - Toggle voucher active status
 */
export const toggleVoucherApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const adminId = admin?.adminId || admin?.id;
    const { id } = req.params;
    
    if (!adminId) {
      res.status(401).json({ status: 401, message: 'Unauthorized' });
      return;
    }

    const voucher = await toggleVoucher(id);

    // Audit log
    await auditLog({
      action: 'voucher.toggle',
      adminId,
      resourceType: 'voucher',
      resourceId: voucher.id,
      details: {
        isActive: voucher.is_active
      }
    }, req);

    res.json(ok(voucher, `Voucher ${voucher.is_active ? 'activated' : 'deactivated'} successfully`));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/vouchers/:id/redemptions - Get voucher redemption history
 */
export const getVoucherRedemptionsApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const query = voucherRedemptionQuerySchema.parse(req.query);
    
    const result = await getRedemptionHistory(id, {
      page: query.page,
      limit: query.limit
    });

    res.json(ok(result, 'Redemption history retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/vouchers/:id/qr - Download QR code
 */
export const downloadVoucherQRApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const qrBuffer = await downloadVoucherQR(id);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="voucher-${id}.png"`);
    res.send(Buffer.from(await qrBuffer.arrayBuffer()));
  } catch (error) {
    next(error);
  }
};
