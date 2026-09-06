import { z } from "zod";

export const paymentIdSchema = z.object({ paymentId: z.string().cuid() });
export const refundSchema = z.object({ amountPaise: z.number().int().positive(), reason: z.string().trim().max(500).optional() });