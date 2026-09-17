import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    firstname: z.string().trim().min(1).max(80).optional(),
    lastname: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
  })
  .transform((data) => ({
    email: data.email,
    password: data.password,
    firstName: data.firstName || data.firstname || "User",
    lastName: data.lastName || data.lastname || "",
    phone: data.phone,
  }));

export const loginSchema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(1).max(128) });
export const refreshSchema = z.object({ refreshToken: z.string().min(20) });
export const otpSchema = z.object({ otpId: z.string().cuid(), code: z.string().regex(/^\d{6}$/) });
export const forgotPasswordSchema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) });
export const resetPasswordSchema = otpSchema.extend({ password: z.string().min(8).max(128) });