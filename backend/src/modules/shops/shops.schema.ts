import { z } from "zod";

export const shopIdSchema = z.object({ id: z.string().cuid() });
export const createShopSchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(2000).optional(), logoUrl: z.string().url().optional() });
export const updateShopSchema = createShopSchema.partial();