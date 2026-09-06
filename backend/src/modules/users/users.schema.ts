import { z } from "zod";

export const profileSchema = z.object({ firstName: z.string().trim().min(1).max(80).optional(), lastName: z.string().trim().min(1).max(80).optional(), phone: z.string().trim().min(7).max(20).nullable().optional() });
export const addressSchema = z.object({ label: z.string().trim().min(1).max(40), fullName: z.string().trim().min(1).max(120), phone: z.string().trim().min(7).max(20), line1: z.string().trim().min(1).max(200), line2: z.string().trim().max(200).optional(), city: z.string().trim().min(1).max(80), state: z.string().trim().min(1).max(80), postalCode: z.string().trim().min(3).max(12), country: z.string().length(2).default("IN"), isDefault: z.boolean().default(false) });
export const addressIdSchema = z.object({ id: z.string().cuid() });