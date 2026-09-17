import type { NextFunction, Request, Response } from "express";
import {
  createShopSchema,
  deleteShopRequestSchema,
  openShopRequestSchema,
  reviewShopRequestSchema,
  shopIdSchema,
  shopRequestIdSchema,
  updateShopSchema,
} from "./shops.schema.js";
import { ShopsService } from "./shops.service.js";

const shopsService = new ShopsService();

export async function listShops(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, shops: await shopsService.list() });
  } catch (error) {
    next(error);
  }
}

export async function getShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = shopIdSchema.parse(req.params);
    res.json({ success: true, shop: await shopsService.getById(id) });
  } catch (error) {
    next(error);
  }
}

export async function createShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({
      success: true,
      shop: await shopsService.create(req.user!.id, createShopSchema.parse(req.body)),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = shopIdSchema.parse(req.params);
    res.json({
      success: true,
      shop: await shopsService.update(req.user!.id, req.user!.role, id, updateShopSchema.parse(req.body)),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = shopIdSchema.parse(req.params);
    await shopsService.remove(req.user!.id, req.user!.role, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/* ─────────────────────────────────────────────────────────────
   Vendor Shop Requests
   ───────────────────────────────────────────────────────────── */
export async function requestOpenShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = openShopRequestSchema.parse(req.body);
    const result = await shopsService.requestOpenShop(req.user!.id, parsed);
    res.status(201).json({
      success: true,
      message: "Shop opening request submitted successfully. Awaiting administrator review.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestDeleteShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = deleteShopRequestSchema.parse(req.body);
    const result = await shopsService.requestDeleteShop(req.user!.id, req.user!.role, parsed);
    res.status(201).json({
      success: true,
      message: "Shop deletion request submitted successfully. Awaiting administrator review.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelShopRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = shopRequestIdSchema.parse(req.params);
    const request = await shopsService.cancelShopRequest(req.user!.id, id);
    res.json({ success: true, message: "Request cancelled successfully", request });
  } catch (error) {
    next(error);
  }
}

export async function getMyShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await shopsService.getMyShop(req.user!.id);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

/* ─────────────────────────────────────────────────────────────
   Admin Management & Reviews
   ───────────────────────────────────────────────────────────── */
export async function listShopRequestsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const requests = await shopsService.listShopRequestsAdmin(type, status);
    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
}

export async function reviewShopRequestAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = shopRequestIdSchema.parse(req.params);
    const body = reviewShopRequestSchema.parse(req.body);
    const note = body.adminNotes || body.note;
    const request = await shopsService.reviewShopRequestAdmin(req.user!.id, id, body.action, note);
    res.json({
      success: true,
      message: `Shop request has been ${body.action === "approve" ? "approved" : "rejected"}`,
      request,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAllAdminShops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const shops = await shopsService.listAllAdmin(status);
    res.json({ success: true, shops });
  } catch (error) {
    next(error);
  }
}

export async function updateShopStatusAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = shopIdSchema.parse(req.params);
    const { status } = req.body ?? {};
    if (!status) {
      res.status(400).json({ success: false, message: "status is required" });
      return;
    }
    const shop = await shopsService.updateStatus(id, status);
    res.json({ success: true, shop });
  } catch (error) {
    next(error);
  }
}

export async function getPlatformSalesAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analytics = await shopsService.getPlatformSales();
    res.json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
}