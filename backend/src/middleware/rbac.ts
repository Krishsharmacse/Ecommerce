import { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../lib/errors.js";
import { requireRoles } from "./auth.middleware.js";

// ─── Permission Matrix ────────────────────────────────────────────────────────
// Maps permission names to the roles that hold them.
// Assumption based on schema:  ADMIN = owner,  VENDOR = manager/shopkeeper
export const permissions = {
  "shop:create":    [UserRole.VENDOR, UserRole.ADMIN],
  "shop:write":     [UserRole.VENDOR, UserRole.ADMIN],  // owner + admin (ownership verified in service)
  "shop:delete":    [UserRole.VENDOR, UserRole.ADMIN],
  "product:create": [UserRole.VENDOR, UserRole.ADMIN],
  "product:write":  [UserRole.VENDOR, UserRole.ADMIN],
  "product:delete": [UserRole.VENDOR, UserRole.ADMIN],
  "order:manage":   [UserRole.ADMIN, UserRole.VENDOR],
  "user:manage":    [UserRole.ADMIN],
  "refund:request": [UserRole.CUSTOMER, UserRole.ADMIN],
  "refund:manage":  [UserRole.ADMIN],
} as const satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof permissions;

/**
 * Middleware shorthand that checks role against the permission matrix.
 * Fine-grained ownership (e.g., "only your own shop") must still be
 * enforced inside the service layer.
 */
export function can(permission: Permission) {
  const roles = permissions[permission];
  return requireRoles(...roles);
}

/**
 * Resource-level ownership guard — call from a controller after fetching
 * the resource to ensure the acting user owns it (unless ADMIN).
 */
export function assertOwner(
  actorId: string,
  actorRole: UserRole,
  ownerId: string
): void {
  if (actorRole === UserRole.ADMIN) return;
  if (actorId !== ownerId) throw new ForbiddenError("You do not own this resource");
}
