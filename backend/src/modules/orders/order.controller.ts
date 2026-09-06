import type { NextFunction, Request, Response } from "express";
import { createOrderSchema, productIdSchema } from "../../utils/validators.js";
import { OrderService } from "./order.service.js";

const orderService = new OrderService();

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createOrderSchema.parse(req.body);
    const order = await orderService.create(req.user!.id, data.shippingAddress, data.paymentMethod, data.idempotencyKey);
    res.status(201).json({ success: true, order });
  } catch (error) { next(error); }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = productIdSchema.parse(req.params);
    res.json({ success: true, order: await orderService.getById(req.user!.id, id) });
  } catch (error) { next(error); }
}