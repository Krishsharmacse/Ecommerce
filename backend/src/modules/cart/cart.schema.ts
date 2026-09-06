import { z } from "zod";

export const cartItemSchema = z.object({ productId: z.string().cuid(), quantity: z.number().int().positive().max(100) });
export const cartItemIdSchema = z.object({ id: z.string().cuid() });