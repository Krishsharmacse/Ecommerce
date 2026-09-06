import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";

export type AuthUser = { id: string; role: UserRole };

declare global {
  namespace Express {
    interface Request { user?: AuthUser; }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError();
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string" || !isRole(payload.role)) {
      throw new UnauthorizedError("Invalid authentication token");
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError("Invalid authentication token"));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

function isRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}