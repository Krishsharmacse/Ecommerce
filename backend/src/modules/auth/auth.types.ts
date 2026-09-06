import type { UserRole } from "@prisma/client";

export type RegisterInput = { email: string; password: string; firstName: string; lastName: string; phone?: string };
export type LoginInput = { email: string; password: string };
export type TokenPair = { accessToken: string; refreshToken: string };
export type AuthResponse = { user: { id: string; email: string; firstName: string; lastName: string; role: UserRole }; tokens: TokenPair };