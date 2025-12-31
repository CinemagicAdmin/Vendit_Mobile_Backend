import axios from 'axios';
import { getConfig } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { cacheWrap, CacheKeys, CacheTTL } from '../../libs/cache.js';
import {
  getMachineById,
  getMachineSlots,
  listMachines,
  upsertMachines,
  upsertSlots
} from './machines.repository.js';
import { upsertRemoteProducts } from '../products/products.repository.js';
import { apiError, ok } from '../../utils/response.js';
const { remoteMachineBaseUrl, remoteMachineApiKey, remoteMachinePageSize, dispenseSocketUrl } =
  getConfig();
const client = axios.create({
  baseURL: remoteMachineBaseUrl,
  headers: { apikey: remoteMachineApiKey },
  timeout: 60000 // Increased from 30s to 60s for slow remote APIs
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRY = 5; // Increased from 3 to 5 retries
const BACKOFF_BASE = 2000; // Exponential backoff starting at 2 seconds
const fetchAll = async (path) => {
  let page = 0;
  const items = [];
  const startTime = Date.now();

  logger.info({ path }, 'Starting fetch');

  while (true) {
    const params = {
      select: '*',
      limit: remoteMachinePageSize,
      offset: page * remoteMachinePageSize
    };
    let data = [];

    for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
      try {
        const response = await client.get(path, { params });
        data = response.data;
        break; // Success!
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRY;
        const backoffMs = BACKOFF_BASE * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s, 32s

        logger.warn(
          {
            path,
            page,
            attempt,
            maxRetries: MAX_RETRY,
            backoffMs,
            error: error.message
          },
          'Remote machine fetch failed, retrying'
        );

        if (isLastAttempt) {
          logger.error(
            { path, page, totalItemsFetched: items.length },
            'Max retries exceeded, giving up on this page'
          );
          throw error;
        }

        await delay(backoffMs);
      }
    }

    if (!data.length) break;
    items.push(...data);

    // Progress logging every 10 pages
    if (page > 0 && page % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(
        {
          path,
          page,
          itemsSoFar: items.length,
          elapsedSeconds: elapsed
        },
        'Fetch progress'
      );
    }

    if (data.length < remoteMachinePageSize) break;
    page += 1;

    // Rate limiting: small delay every 5 pages to avoid overwhelming the API
    if (page % 5 === 0) {
      await delay(500);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(
    {
      path,
      totalPages: page + 1,
      totalItems: items.length,
      totalSeconds: totalTime
    },
    'Fetch completed'
  );

  return items;
};
export const syncMachines = async () => {
  logger.info('Machine sync started');

  // Fetch sequentially to avoid overwhelming the remote API
  // This prevents concurrent load on pages 27, 30, 37, etc.
  const machines = await fetchAll('/vending_machines');
  logger.info({ count: machines.length }, 'Machines fetched');

  // Small delay between fetches to give API breathing room
  await delay(1000);

  const slots = await fetchAll('/slots');
  logger.info({ count: slots.length }, 'Slots fetched');

  await delay(1000);

  const products = await fetchAll('/products');
  logger.info({ count: products.length }, 'Products fetched');

  // Use allSettled to prevent one failure from crashing entire sync
  // This allows machines and slots to be saved even if product sync fails
  const results = await Promise.allSettled([
    upsertMachines(machines),
    upsertRemoteProducts(products),
    upsertSlots(slots)
  ]);

  // Log individual failures for debugging
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const names = ['machines', 'products', 'slots'];
      logger.error(
        {
          name: names[i],
          error: result.reason?.message || result.reason
        },
        'Upsert failed'
      );
    }
  });

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failCount = results.filter((r) => r.status === 'rejected').length;

  logger.info(
    {
      machines: machines.length,
      slots: slots.length,
      products: products.length,
      upserted: successCount,
      failed: failCount
    },
    'Machine sync completed'
  );

  return ok(
    {
      machines: machines.length,
      slots: slots.length,
      products: products.length,
      succeeded: successCount,
      failed: failCount
    },
    failCount > 0 ? 'Machine sync partially completed' : 'Machine data synced'
  );
};
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
export const getMachinesNear = async (lat, lng) => {
  const radius = 50; // km

  // Use cache library for consistency
  const machines = await cacheWrap(
    CacheKeys.machines.nearby(lat, lng, radius),
    async () => {
      const allMachines = await listMachines();
      return allMachines
        .map((machine) => {
          if (!machine.location_latitude || !machine.location_longitude) return null;
          const distance = haversineDistance(
            lat,
            lng,
            Number(machine.location_latitude),
            Number(machine.location_longitude)
          );
          return { ...machine, distance };
        })
        .filter(Boolean)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    },
    { ttl: CacheTTL.SHORT } // 5 minutes - location queries change frequently for different coords
  );

  logger.debug({ lat, lng, count: machines.length }, 'Machines near location retrieved');
  return machines;
};
export const getMachineDetail = async (machineUId) => {
  const machine = await getMachineById(machineUId);
  if (!machine) throw new apiError(404, 'Machine not found');
  const slots = await getMachineSlots(machineUId);
  return { machine, slots };
};

// Import ws for Node.js environments without native WebSocket
import WebSocketNode from 'ws';

const getWebSocketConstructor = (): typeof WebSocket => {
  // Use native WebSocket if available (Node 21+, browsers)
  if (typeof globalThis.WebSocket !== 'undefined') {
    return globalThis.WebSocket;
  }
  // Fall back to 'ws' package for older Node.js / Cloud Run
  if (WebSocketNode) {
    return WebSocketNode as unknown as typeof WebSocket;
  }
  throw new apiError(500, 'WebSocket client is unavailable in this runtime');
};

// Constants for dispense socket
const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds to connect
const SEND_TIMEOUT_MS = 5000; // 5 seconds after sending to consider success

/**
 * Dispatch dispense command - fire-and-forget pattern
 * Returns success once command is sent (server doesn't send acknowledgements)
 */
export const dispatchDispenseCommand = async (machineId: string, slotNumber: string) => {
  if (!dispenseSocketUrl) {
    throw new apiError(500, 'Dispense socket URL is not configured');
  }
  if (!machineId || !slotNumber) {
    throw new apiError(400, 'machineId and slotNumber are required');
  }

  const payload = JSON.stringify({ type: 'dispense', machineId, slotNumber });

  logger.info(
    { socketUrl: dispenseSocketUrl, machineId, slotNumber },
    'Dispatching dispense command'
  );

  return new Promise((resolve, reject) => {
    const WS = getWebSocketConstructor();
    let settled = false;
    let commandSent = false;
    let socket: WebSocket;

    try {
      socket = new WS(dispenseSocketUrl);
    } catch (connError) {
      logger.error({ error: connError, machineId }, 'Failed to create WebSocket connection');
      reject(new apiError(502, 'Failed to connect to dispense server'));
      return;
    }

    const cleanup = (error: Error | null, success: boolean = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectionTimeoutId);
      clearTimeout(sendTimeoutId);

      try {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      } catch (closeError) {
        logger.warn({ closeError }, 'Failed to close dispense socket cleanly');
      }

      if (error) {
        reject(error);
      } else {
        resolve(ok({ acknowledged: true, commandSent: success }, 'Dispense command sent'));
      }
    };

    // Timeout for connection
    const connectionTimeoutId = setTimeout(() => {
      if (!commandSent) {
        logger.error({ machineId, slotNumber }, 'Dispense socket connection timed out');
        cleanup(new apiError(504, 'Failed to connect to dispense server'));
      }
    }, CONNECTION_TIMEOUT_MS);

    // After sending, wait briefly then return success (fire-and-forget)
    let sendTimeoutId: ReturnType<typeof setTimeout>;

    const handleOpen = () => {
      logger.info({ machineId, slotNumber }, 'WebSocket connected, sending dispense command');
      try {
        socket.send(payload);
        commandSent = true;
        logger.info({ machineId, slotNumber }, 'Dispense command sent successfully');

        // Return success after short delay (fire-and-forget)
        sendTimeoutId = setTimeout(() => {
          logger.info({ machineId, slotNumber }, 'Dispense command completed (fire-and-forget)');
          cleanup(null, true);
        }, SEND_TIMEOUT_MS);
      } catch (error) {
        logger.error({ error, machineId, slotNumber }, 'Failed to send dispense payload');
        cleanup(new apiError(502, 'Failed to send dispense payload'));
      }
    };

    const handleMessage = (event: MessageEvent) => {
      // If server does respond, log it and complete immediately
      logger.info(
        { machineId, slotNumber, data: event?.data },
        'Dispense acknowledgement received'
      );
      cleanup(null, true);
    };

    const handleError = (event: Event) => {
      if (!commandSent) {
        // Only treat as error if we haven't sent the command yet
        const errorMsg = event instanceof Error ? event.message : 'Dispense socket error';
        logger.error({ event, machineId, slotNumber }, 'Dispense socket error');
        cleanup(new apiError(502, errorMsg));
      } else {
        // If command was sent, just log the error but consider it successful
        logger.warn({ machineId, slotNumber }, 'Socket error after command sent (ignoring)');
      }
    };

    const handleClose = (event: CloseEvent) => {
      if (!settled) {
        if (commandSent) {
          // Command was sent, consider it successful
          logger.info({ machineId, code: event.code }, 'Socket closed after sending command');
          cleanup(null, true);
        } else if (event.code !== 1000) {
          logger.warn(
            { machineId, code: event.code, reason: event.reason },
            'Socket closed unexpectedly before sending'
          );
          cleanup(new apiError(502, 'Connection closed before sending command'));
        }
      }
    };

    socket.onopen = handleOpen;
    socket.onmessage = handleMessage;
    socket.onerror = handleError;
    socket.onclose = handleClose;
  });
};
