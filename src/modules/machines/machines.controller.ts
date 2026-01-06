import {
  dispatchDispenseCommand,
  dispatchBatchDispenseCommand,
  getMachineDetail,
  syncMachines
} from './machines.service.js';
import { ok } from '../../utils/response.js';
import { redis } from '../../libs/redis.js';
import { listMachines, getMachineById } from './machines.repository.js';
import { dispenseCommandSchema } from './machines.validators.js';
import { getPaymentById } from '../payments/payments.repository.js';
import { getDispenseLogsByPayment } from './dispense-logs.repository.js';
import { DISPENSABLE_PAYMENT_STATUSES } from '../../constants/payment-statuses.js';

export const handleSyncMachines = async (_req, res) => {
  const response = await syncMachines();
  await redis.del(`machines:list:*`);
  return res.json(response);
};

export const handleListMachines = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100); // Default 20, max 100
  const offset = Number(req.query.offset) || 0;

  const allMachines = await listMachines();
  const machines = allMachines.slice(offset, offset + limit);
  const enriched = machines.map((machine) => ({ ...machine, distance: null }));

  return res.json(
    ok(
      {
        data: enriched,
        meta: {
          total: allMachines.length,
          limit,
          offset,
          hasMore: offset + limit < allMachines.length
        }
      },
      'Machines listing'
    )
  );
};

export const handleMachineDetail = async (req, res) => {
  const { machineId } = req.params;
  const detail = await getMachineDetail(machineId);
  return res.json(ok(detail, 'Machine detail'));
};

export const handleTriggerDispense = async (req, res) => {
  const payload = dispenseCommandSchema.parse(req.body);
  const userId = req.user.id;

  // 1. CRITICAL: Verify payment exists and user owns it
  const payment = await getPaymentById(payload.paymentId);
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  if (payment.user_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You do not own this payment'
    });
  }

  // 2. CRITICAL: Verify payment status allows dispensing
  if (!DISPENSABLE_PAYMENT_STATUSES.includes(payment.status)) {
    return res.status(400).json({
      success: false,
      message: `Payment status is '${payment.status}'. Only completed payments (PAID, CAPTURED, or DEBIT) can be dispensed.`,
      currentStatus: payment.status,
      allowedStatuses: DISPENSABLE_PAYMENT_STATUSES
    });
  }

  // 3. CRITICAL: Idempotency - prevent double dispensing
  const existingLogs = await getDispenseLogsByPayment(payload.paymentId);
  const confirmedDispenses = existingLogs.filter((log) => log.status === 'confirmed' || log.status === 'sent');

  if (confirmedDispenses.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Products have already been dispensed for this payment',
      dispensedAt: confirmedDispenses[0].created_at
    });
  }

  // 4. NON-BLOCKING: Machine validation (warn but don't block)
  // This allows dispense to work even if machine IDs don't match exactly
  // The payment already validated the machine during checkout
  const paymentMachineId = payment.machine_u_id;
  if (paymentMachineId && paymentMachineId !== payload.machineId) {
    // Try flexible matching
    const machine = await getMachineById(payload.machineId);
    const matchesPayment = machine && (
      machine.id === paymentMachineId || 
      machine.u_id === paymentMachineId
    );
    
    if (!matchesPayment) {
      // Log warning but allow dispense - payment was already validated at checkout
      console.warn(`Machine ID mismatch - payment: ${paymentMachineId}, request: ${payload.machineId}`);
    }
  }

  // 5. Dispatch the dispense command
  if (payload.slotNumber) {
    const response = await dispatchDispenseCommand(
      payload.machineId,
      payload.slotNumber,
      payload.paymentId
    );
    return res.json(response);
  } else if (payload.slots && payload.slots.length > 0) {
    const response = await dispatchBatchDispenseCommand(
      payload.machineId,
      payload.slots,
      payload.paymentId
    );
    return res.json(response);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Either slotNumber or slots array is required'
    });
  }
};
