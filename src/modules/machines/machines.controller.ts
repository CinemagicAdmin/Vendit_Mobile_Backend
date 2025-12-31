import { dispatchDispenseCommand, getMachineDetail, syncMachines } from './machines.service.js';
import { ok } from '../../utils/response.js';
import { redis } from '../../libs/redis.js';
import { listMachines } from './machines.repository.js';
import { dispenseCommandSchema } from './machines.validators.js';
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
// return res.json(ok(machines, 'Machines listing'));
// export const handleListMachines = async (req: Request, res: Response) => {
//   const lat = Number(req.query.lat);
//   const lng = Number(req.query.lng);
//   if (Number.isNaN(lat) || Number.isNaN(lng)) {
//     return res.status(400).json({ status: 400, message: 'lat and lng are required numeric query params' });
//   }
//   const machines = await getMachinesNear(lat, lng);
//   return res.json(ok(machines, 'Machines near you'));
// };
export const handleMachineDetail = async (req, res) => {
  const { machineId } = req.params;
  const detail = await getMachineDetail(machineId);
  return res.json(ok(detail, 'Machine detail'));
};
export const handleTriggerDispense = async (req, res) => {
  const payload = dispenseCommandSchema.parse(req.body);
  const response = await dispatchDispenseCommand(payload.machineId, payload.slotNumber);
  return res.json(response);
};
