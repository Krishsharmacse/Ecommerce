import { z } from "zod";

export const shopIdSchema = z.object({ id: z.string().min(1) });
export const shopRequestIdSchema = z.object({ id: z.string().min(1) });

export const createShopSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export const updateShopSchema = createShopSchema.partial();

export const openShopRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export const deleteShopRequestSchema = z.object({
  shopId: z.string().min(1),
  reason: z.string().trim().min(3, "Please provide a reason for shop deletion").max(1000),
});

export const reviewShopRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional(),
});