import type { UserRole } from "@prisma/client";

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  type?: "access" | "refresh";
};

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};