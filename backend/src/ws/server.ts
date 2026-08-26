import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient } from "../cache/redis.js";
import { logger } from "../logger.js";
import { env } from "../config.js";
import { stackHealth, devScanGet } from "../lib/devstack.js";
import type { WSServerEvent } from "../lib/types.js";

let io: SocketIOServer | null = null;

export function getIo(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not yet initialised");
  return io;
}

export async function setupWebSocket(http: HttpServer): Promise<SocketIOServer> {
  const health = await stackHealth();

  io = new SocketIOServer(http, {
    cors: { origin: env.FRONTEND_ORIGIN, credentials: false },
    path: "/v1/stream",
    transports: ["websocket", "polling"],
  });

  // Redis adapter for horizontal scale; in-memory adapter in dev degraded mode
  if (health.redis) {
    io.adapter(createAdapter(pubClient, subClient));
  } else {
    logger.warn("Socket.IO running with in-memory adapter (dev degraded mode)");
  }

  io.on("connection", async (socket) => {
    const scanId = (socket.handshake.query.scanId as string | undefined) ?? "";
    if (!/^scn_[0-9A-Z]{26}$/.test(scanId)) {
      socket.emit("scan_failed", { reason: "invalid_scan_id", retryable: false });
      socket.disconnect(true);
      return;
    }
    logger.debug({ scanId, sid: socket.id }, "WS client connected");
    await socket.join(`scan:${scanId}`);

    // Replay any events that may have been emitted before the client connected
    if (!health.redis) {
      const rec = devScanGet(scanId);
      for (const { type, data } of rec?.events ?? []) socket.emit(type, data);
      return;
    }
    try {
      const replay = await pubClient.lrange(`ws:scan:${scanId}`, 0, -1);
      for (const raw of replay) {
        try {
          const { type, data } = JSON.parse(raw) as WSServerEvent & { ts?: number };
          socket.emit(type, data);
        } catch {
          /* ignore malformed entries */
        }
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, scanId }, "Replay failed");
    }
  });

  // Bridge worker-published events on the `scan-events` channel to room emissions
  if (health.redis) {
    await subClient.subscribe("scan-events");
    subClient.on("message", (channel, raw) => {
      if (channel !== "scan-events" || !io) return;
      try {
        const { scanId, event } = JSON.parse(raw) as { scanId: string; event: WSServerEvent };
        io.to(`scan:${scanId}`).emit(event.type, event.data);
      } catch {
        /* ignore */
      }
    });
  }

  logger.info("Socket.IO server ready at /v1/stream");
  return io;
}
