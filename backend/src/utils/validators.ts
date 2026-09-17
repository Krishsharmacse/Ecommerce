import { z } from "zod";

export const productIdSchema = z.object({ id: z.string().cuid() });

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  pricePaise: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  categoryId: z.string().cuid(),
  imageUrl: z.string().url().optional(),
  shopId: z.string().cuid()
});

export const updateProductSchema = createProductSchema.partial().omit({ shopId: true });

export const productQuerySchema = z.object({
  shopId: z.string().cuid().optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(3).max(12),
  country: z.string().trim().length(2).default("IN"),
});

export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["RAZORPAY", "COD"]).default("RAZORPAY"),
  idempotencyKey: z.string().min(8).max(100).optional()
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});