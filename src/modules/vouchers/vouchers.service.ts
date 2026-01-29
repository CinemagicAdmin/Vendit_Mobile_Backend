import QRCode from 'qrcode';
import { apiError, ok } from '../../utils/response.js';
import { supabase } from '../../libs/supabase.js';
import {
  createVoucher,
  getVoucherById,
  getVoucherByCode,
  listVouchers,
  updateVoucher,
  deleteVoucher,
  toggleVoucherStatus,
  updateVoucherQRUrl,
  incrementVoucherUsage,
  createRedemption,
  getUserRedemptionCount,
  getVoucherRedemptions,
  getVoucherStats,
  getUserRedemptionHistory
} from './vouchers.repository.js';
import type { VoucherCreateInput } from './vouchers.validators.js';
import {
  incrementWallet,
  recordWalletTransaction
} from '../payments/payments.repository.js';
import { sendNotification } from '../notifications/notifications.service.js';

const STORAGE_BUCKET = 'voucher-qr';

/**
 * Generate QR code and upload to Supabase Storage
 */
export const generateVoucherQR = async (voucherId: string, code: string, amount: number) => {
  try {
    // Generate QR code as PNG buffer
    const qrPayload = JSON.stringify({
      type: 'voucher',
      code,
      voucherId,
      amount
    });

    const buffer = await QRCode.toBuffer(qrPayload, {
      type: 'png',
      margin: 1,
      scale: 8,
      width: 400,
      errorCorrectionLevel: 'H'
    });

    // Upload to Supabase Storage
    const fileName = `${voucherId}.png`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('QR generation error:', error);
    throw new apiError(500, 'Failed to generate QR code');
  }
};

/**
 * Validate voucher for redemption
 */
export const validateVoucher = async (code: string, userId: string): Promise<{ valid: boolean; error?: string; voucher?: any }> => {
  // 1. Check voucher exists
  const voucher = await getVoucherByCode(code);
  if (!voucher) {
    return { valid: false, error: 'Voucher not found' };
  }

  // 2. Check if active
  if (!voucher.is_active) {
    return { valid: false, error: 'Voucher is inactive' };
  }

  // 3. Check date validity
  const now = new Date();
  const validFrom = new Date(voucher.valid_from);
  const validUntil = new Date(voucher.valid_until);

  if (now < validFrom) {
    return { valid: false, error: 'Voucher is not yet valid' };
  }

  if (now > validUntil) {
    return { valid: false, error: 'Voucher has expired' };
  }

  // 4. Check global usage limit
  if (voucher.max_total_uses && voucher.current_total_uses >= voucher.max_total_uses) {
    return { valid: false, error: 'Voucher usage limit reached' };
  }

  // 5. Check user-specific usage limit
  const userUsageCount = await getUserRedemptionCount(voucher.id, userId);
  if (userUsageCount >= voucher.max_uses_per_user) {
    return { valid: false, error: 'You have already used this voucher the maximum number of times' };
  }

  return {
    valid: true,
    voucher
  };
};

/**
 * Redeem voucher and credit wallet
 */
export const redeemVoucher = async (code: string, userId: string) => {
  // Validate voucher
  const validation = await validateVoucher(code, userId);
  
  if (!validation.valid) {
    throw new apiError(400, validation.error);
  }

  const voucher = validation.voucher;

  // Start transaction-like operations
  try {
    // 1. Atomically increment voucher usage (prevents race conditions)
    const incremented = await incrementVoucherUsage(voucher.id, voucher.max_total_uses);
    
    if (!incremented) {
      throw new apiError(400, 'Voucher usage limit reached');
    }

    // 2. Credit user's wallet
    const wallet = await incrementWallet(userId, voucher.amount);

    // 3. Record wallet transaction
    await recordWalletTransaction({
      userId,
      paymentId: null,
      type: 'credit',
      amount: voucher.amount,
      metadata: {
        source: 'voucher',
        voucherCode: voucher.code,
        voucherId: voucher.id
      }
    });

    // 4. Create redemption record
    await createRedemption({
      voucherId: voucher.id,
      userId,
      walletTransactionId: null, // Transaction ID not available
      amountCredited: voucher.amount
    });

    // 5. Send notification
    await sendNotification({
      receiverId: userId,
      title: 'Voucher Redeemed!',
      body: `You received KWD ${voucher.amount.toFixed(3)} wallet credit from voucher ${voucher.code}`,
      type: 'VoucherRedeemed',
      data: {
        voucherCode: voucher.code,
        amount: voucher.amount,
        walletBalance: wallet?.balance ?? 0
      }
    });

    return ok(
      {
        amountCredited: voucher.amount,
        newWalletBalance: wallet?.balance ?? 0,
        voucher: {
          code: voucher.code,
          description: voucher.description
        }
      },
      'Voucher redeemed successfully'
    );
  } catch (error) {
    // Re-throw api errors
    if (error.status) throw error;
    
    // Wrap other errors
    console.error('Voucher redemption error:', error);
    throw new apiError(500, 'Failed to redeem voucher');
  }
};

/**
 * Create voucher with QR code generation
 */
export const createVoucherWithQR = async (
  adminId: string,
  data: VoucherCreateInput
) => {
  // Create voucher first
  const voucher = await createVoucher({
    code: data.code,
    description: data.description,
    amount: data.amount,
    maxUsesPerUser: data.maxUsesPerUser,
    maxTotalUses: data.maxTotalUses,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    isActive: data.isActive,
    createdByAdminId: adminId
  });

  // Generate and upload QR code
  try {
    const qrUrl = await generateVoucherQR(voucher.id, voucher.code, voucher.amount);
    
    // Update voucher with QR URL
    const updatedVoucher = await updateVoucherQRUrl(voucher.id, qrUrl);
    
    return updatedVoucher;
  } catch (error) {
    // QR generation failed, but voucher created
    console.error('QR generation failed for voucher:', voucher.id, error);
    return voucher; // Return voucher without QR
  }
};

/**
 * Update voucher and regenerate QR if code or amount changed
 */
export const updateVoucherData = async (id: string, data: Record<string, unknown>) => {
  const oldVoucher = await getVoucherById(id);
  
  // Update voucher
  const updatedVoucher = await updateVoucher(id, data);

  // Regenerate QR if code or amount changed (since QR payload includes both)
  const codeChanged = data.code && data.code !== oldVoucher.code;
  const amountChanged = data.amount !== undefined && data.amount !== oldVoucher.amount;
  
  if (codeChanged || amountChanged) {
    try {
      const qrUrl = await generateVoucherQR(updatedVoucher.id, updatedVoucher.code, updatedVoucher.amount);
      return await updateVoucherQRUrl(updatedVoucher.id, qrUrl);
    } catch (error) {
      console.error('QR regeneration failed:', error);
      return updatedVoucher;
    }
  }

  return updatedVoucher;
};

/**
 * Get voucher details with stats
 */
export const getVoucherDetails = async (id: string) => {
  const voucher = await getVoucherById(id);
  const stats = await getVoucherStats(id);

  return {
    voucher,
    stats
  };
};

/**
 * List vouchers with filters
 */
export const listVouchersWithFilters = async (
  filters: { search?: string; status?: string },
  pagination: { page?: number; limit?: number }
) => {
  return await listVouchers(filters, pagination);
};

/**
 * Delete voucher and QR file
 */
export const deleteVoucherWithQR = async (id: string): Promise<void> => {
  const voucher = await getVoucherById(id);
  
  // Delete from database
  await deleteVoucher(id);

  // Delete QR file from storage
  if (voucher.qr_code_url) {
    try {
      const fileName = `${id}.png`;
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([fileName]);
    } catch (error) {
      console.error('Failed to delete QR file:', error);
      // Continue anyway, database record is already deleted
    }
  }
};

/**
 * Toggle voucher status
 */
export const toggleVoucher = async (id: string) => {
  return await toggleVoucherStatus(id);
};

/**
 * Get voucher redemptions with pagination
 */
export const getRedemptionHistory = async (voucherId: string, pagination: { page?: number; limit?: number }) => {
  return await getVoucherRedemptions(voucherId, pagination);
};

/**
 * Get user's redemption history
 */
export const getUserHistory = async (userId: string, pagination: { page?: number; limit?: number }) => {
  return await getUserRedemptionHistory(userId, pagination);
};

/**
 * Download QR code (returns buffer)
 */
export const downloadVoucherQR = async (id: string): Promise<Blob> => {
  const voucher = await getVoucherById(id);
  
  if (!voucher.qr_code_url) {
    // Generate QR if it doesn't exist
    const qrUrl = await generateVoucherQR(voucher.id, voucher.code, voucher.amount);
    await updateVoucherQRUrl(voucher.id, qrUrl);
  }

  // Download from storage
  const fileName = `${id}.png`;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(fileName);

  if (error) {
    throw new apiError(404, 'QR code not found');
  }

  return data;
};
