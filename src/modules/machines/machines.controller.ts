import {
  dispatchDispenseCommand,
  dispatchBatchDispenseCommand,
  getMachineDetail,
  syncMachines
} from './machines.service.js';
import { ok } from '../../utils/response.js';
import { redis } from '../../libs/redis.js';
import { listMachines, getMachineById, getMachineSlots } from './machines.repository.js';
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

  // 1. Verify payment exists and user owns it
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

  // 2. Verify payment status allows dispensing (includes wallet payments)
  if (!DISPENSABLE_PAYMENT_STATUSES.includes(payment.status)) {
    return res.status(400).json({
      success: false,
      message: `Payment status is '${payment.status}'. Only completed payments (PAID, CAPTURED, or DEBIT) can be dispensed.`,
      currentStatus: payment.status,
      allowedStatuses: DISPENSABLE_PAYMENT_STATUSES
    });
  }

  // 3. Verify payment is for this machine
  if (payment.machine_u_id !== payload.machineId) {
    return res.status(400).json({
      success: false,
      message: 'Payment is for a different machine',
      paymentMachine: payment.machine_u_id,
      requestedMachine: payload.machineId
    });
  }

  // 4. Check if already dispensed (idempotency)
  const existingLogs = await getDispenseLogsByPayment(payload.paymentId);
  const confirmedDispenses = existingLogs.filter((log) => log.status === 'confirmed');

  if (confirmedDispenses.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Products have already been dispensed for this payment',
      dispensedAt: confirmedDispenses[0].created_at
    });
  }

  // 5. Verify machine exists and is operational
  const machine = await getMachineById(payload.machineId);
  if (!machine) {
    return res.status(404).json({
      success: false,
      message: 'Machine not found'
    });
  }

  if (machine.machine_operation_state !== 'ONLINE') {
    return res.status(503).json({
      success: false,
      message: 'This machine is currently offline or in maintenance. Please try another machine.',
      machineStatus: machine.machine_operation_state
    });
  }

  // 6. Validate slots exist (for batch mode)
  if (payload.slots && payload.slots.length > 0) {
    const machineSlots = await getMachineSlots(payload.machineId);
    const validSlotNumbers = new Set(machineSlots.map((s) => s.slot_number));

    const invalidSlots = payload.slots.filter((s) => !validSlotNumbers.has(s.slotNumber));

    if (invalidSlots.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more slot numbers are invalid for this machine',
        invalidSlots: invalidSlots.map((s) => s.slotNumber)
      });
    }
  }

  // 7. Dispatch with payment ID for logging
  if (payload.slotNumber) {
    // Single slot format
    const response = await dispatchDispenseCommand(
      payload.machineId,
      payload.slotNumber,
      payload.paymentId
    );
    return res.json(response);
  } else if (payload.slots && payload.slots.length > 0) {
    // Batch format
    const response = await dispatchBatchDispenseCommand(
      payload.machineId,
      payload.slots,
      payload.paymentId
    );
    return res.json(response);
  } else {
    // Should never reach here due to Zod validation
    return res.status(400).json({
      success: false,
      message: 'Either slotNumber or slots array is required'
    });
  }
};
