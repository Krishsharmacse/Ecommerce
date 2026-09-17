import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Attaches a unique X-Request-Id to every request and response.
 * Honours an existing header if the client sent one (useful for tracing).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers["x-request-id"];
  const id = typeof existing === "string" ? existing : crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
