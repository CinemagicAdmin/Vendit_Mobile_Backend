import { Router } from 'express';
import {
  handleListMachines,
  handleMachineDetail,
  handleSyncMachines,
  handleTriggerDispense
} from '../modules/machines/machines.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { dispenseLimiter } from '../middleware/rate-limit.js';

const router = Router();
router.post('/sync', handleSyncMachines); // protect via gateway or admin auth in production
router.get('/', requireAuth, handleListMachines);
router.get('/:machineId', requireAuth, handleMachineDetail);
router.post('/dispense', requireAuth, dispenseLimiter, handleTriggerDispense); // Rate limited
export default router;
