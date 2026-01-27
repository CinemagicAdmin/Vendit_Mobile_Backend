import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { supabase } from '../../libs/supabase.js';
import { apiError, ok } from '../../utils/response.js';
import { getMachineById } from './machines.repository.js';
import { updateMachineQrCode, logWebhookEvent } from './machines.repository.js';
import {
  getPaymentByChargeId,
  getPaymentById,
  updatePaymentStatus
} from '../payments/payments.repository.js';
import { updateDispensedProducts } from '../payments/payments.service.js';
import { saveKnetToken } from '../payments/knet-tokens.repository.js';
import { logger } from '../../config/logger.js';
const QR_BUCKET = 'machines';
const getQrUrl = (path) => {
  const base = process.env.CDN_BASE_URL ?? '';
  return `${base}/machines/${path}`;
};
export const generateMachineQr = async (machineUId) => {
  const machine = await getMachineById(machineUId);
  if (!machine) throw new apiError(404, 'Machine not found');
  const qrPayload = `${process.env.APP_BASE_URL ?? 'https://vendit.example.com'}/machines/${machineUId}`;
  const buffer = await QRCode.toBuffer(qrPayload, { type: 'png', margin: 1, scale: 6 });
  const fileName = `qr-${machineUId}-${nanoid(6)}.png`;
  const upload = await supabase.storage.from(QR_BUCKET).upload(fileName, buffer, {
    upsert: true,
    contentType: 'image/png'
  });
  if (upload.error) {
    throw new apiError(500, 'Failed to upload QR code', upload.error.message);
  }
  await updateMachineQrCode(machineUId, fileName);
  return ok({ qrUrl: getQrUrl(fileName) }, 'QR code generated');
};
const normaliseBody = (body) => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (body && typeof body === 'object') return body;
  return null;
};
const coerceStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};
const deriveStatusFromTapEvent = (payload) => {
  const status = payload.status ?? payload.data?.object?.status;
  if (typeof status === 'string') {
    return status.toUpperCase();
  }
  const type = payload.type;
  if (typeof type === 'string') {
    if (type.includes('refunded')) return 'REFUNDED';
    if (type.includes('captured')) return 'CAPTURED';
    if (type.includes('authorized')) return 'AUTHORIZED';
    if (type.includes('failed')) return 'FAILED';
  }
  return undefined;
};
export const handleSilkronWebhook = async (headers, body) => {
  await logWebhookEvent({ source: 'silkron', headers, body });
  const payload = normaliseBody(body);
  if (!payload) {
    return ok(null, 'Silkron webhook stored');
  }
  const paymentId = payload.payment_id ?? payload.paymentId;
  const vendorParts =
    coerceStringArray(payload.vendor_part_numbers) || coerceStringArray(payload.vendorPartNumbers);
  if (!paymentId || vendorParts.length === 0) {
    return ok(null, 'Silkron webhook stored');
  }
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return ok(null, 'Silkron event ignored (unknown payment)');
  }
  const machineId = payload.machine_id ?? payload.machineId ?? payment.machine_u_id ?? '';
  await updateDispensedProducts(payment.user_id, {
    paymentId: payment.id,
    machineId,
    vendorPartNumbers: vendorParts
  });
  return ok(null, 'Silkron webhook processed');
};
export const handleTapWebhook = async (headers, body) => {
  await logWebhookEvent({ source: 'tap', headers, body });
  const payload = normaliseBody(body);
  if (!payload) {
    return ok(null, 'Tap webhook stored');
  }
  const chargeId = payload.id ?? payload.data?.object?.id;
  if (!chargeId) {
    return ok(null, 'Tap webhook stored');
  }
  const payment = await getPaymentByChargeId(chargeId);
  if (!payment) {
    return ok(null, 'Tap event ignored (unknown charge)');
  }
  const status = deriveStatusFromTapEvent(payload);
  if (!status || status === payment.status) {
    return ok(null, 'Tap webhook stored');
  }
  await updatePaymentStatus(payment.id, status);
  
  // Extract and save KNET token if this was a successful KNET payment with save_card
  // Token is returned in the charge response when save_card: true
  if (status === 'CAPTURED' || status === 'AUTHORIZED') {
    try {
      const chargeData = payload.data?.object ?? payload;
      const saveCard = chargeData.save_card ?? false;
      const source = chargeData.source;
      const customer = chargeData.customer;
      
      // Check if this was a KNET payment with save_card enabled
      // and if a token was returned (source.id starts with 'tok_')
      if (saveCard && source?.id && source.id.startsWith('tok_') && customer?.id) {
        logger.info({
          userId: payment.user_id,
          chargeId,
          tokenId: source.id,
          customerId: customer.id
        }, 'Extracting KNET token from webhook');
        
        await saveKnetToken({
          userId: payment.user_id,
          tapCustomerId: customer.id,
          tokenId: source.id,
          lastFour: source.last_four ?? source.object?.last_four,
          brand: source.brand ?? source.object?.brand
        });
        
        logger.info({ userId: payment.user_id, tokenId: source.id }, 'KNET token saved from webhook');
      }
    } catch (error) {
      // Log error but don't fail the webhook
      logger.error({ error, chargeId, userId: payment.user_id }, 'Failed to save KNET token from webhook');
    }
  }
  
  return ok(null, 'Tap webhook processed');
};
