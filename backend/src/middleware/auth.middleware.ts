import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export type AuthUser = { id: string; role: UserRole };

declare global {
  namespace Express {
    interface Request { user?: AuthUser; }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError();
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as any;
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      throw new UnauthorizedError("Invalid authentication token");
    }

    // Always fetch fresh user role and status from database to reflect role changes immediately
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true, deletedAt: true },
    });

    if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
      throw new UnauthorizedError("Account is inactive or deleted");
    }

    req.user = { id: dbUser.id, role: dbUser.role };
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