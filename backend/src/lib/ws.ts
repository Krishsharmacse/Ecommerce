import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { IncomingMessage } from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// ─── Connection store ─────────────────────────────────────────────────────────
const clients = new Map<string, Set<WebSocket>>();

// ─── Publisher (called from workers / services) ───────────────────────────────
export function wsPublish(userId: string, event: string, data: unknown): void {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const payload = JSON.stringify({ event, data, ts: Date.now() });
  for (const ws of userClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload, (err) => {
        if (err) logger.warn({ err, userId, event }, "ws: send failed");
      });
    }
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
export function createWsServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // Extract JWT from Authorization header, Sec-WebSocket-Protocol, or ?token= query param
    const url   = req.url ?? "";
    const queryToken = new URLSearchParams(url.split("?")[1] ?? "").get("token");
    const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const subprotocol = typeof req.headers["sec-websocket-protocol"] === "string"
      ? req.headers["sec-websocket-protocol"].split(",")[0]?.trim()
      : undefined;

    if (queryToken) {
      logger.warn("ws: authentication via query parameter exposes tokens in access logs. Prefer Sec-WebSocket-Protocol or Authorization header.");
    }

    const token = authHeader || subprotocol || queryToken;

    let userId: string;
    try {
      if (!token) throw new Error("No token");
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub?: string };
      if (!payload.sub) throw new Error("No sub");
      userId = payload.sub;
    } catch {
      ws.close(4001, "Unauthorized");
      return;
    }

    // Register client
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId)!.add(ws);
    logger.debug({ userId }, "ws: client connected");

    // Keepalive
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { event?: string };
        if (msg.event === "ping") {
          ws.send(JSON.stringify({ event: "pong", ts: Date.now() }));
        }
      } catch { /* ignore malformed frames */ }
    });

    // Cleanup on disconnect
    ws.on("close", (code, reason) => {
      clients.get(userId)?.delete(ws);
      if (clients.get(userId)?.size === 0) clients.delete(userId);
      logger.debug({ userId, code, reason: reason.toString() }, "ws: client disconnected");
    });

    ws.on("error", (err) => {
      logger.warn({ err, userId }, "ws: client error");
    });

    // Send a welcome ack so the client knows it's live
    ws.send(JSON.stringify({ event: "connected", data: { userId }, ts: Date.now() }));
  });

  wss.on("error", (err) => {
    logger.error({ err }, "ws: server error");
  });

  logger.info("WebSocket server attached at /ws");
  return wss;
}
