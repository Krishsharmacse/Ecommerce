import type { NextFunction, Request, Response } from "express";
import { createShopSchema, shopIdSchema, updateShopSchema } from "./shops.schema.js";
import { ShopsService } from "./shops.service.js";

const shopsService = new ShopsService();
export async function listShops(_req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, shops: await shopsService.list() }); } catch (error) { next(error); } }
export async function getShop(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = shopIdSchema.parse(req.params); res.json({ success: true, shop: await shopsService.getById(id) }); } catch (error) { next(error); } }
export async function createShop(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.status(201).json({ success: true, shop: await shopsService.create(req.user!.id, createShopSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function updateShop(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = shopIdSchema.parse(req.params); res.json({ success: true, shop: await shopsService.update(req.user!.id, req.user!.role, id, updateShopSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function deleteShop(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = shopIdSchema.parse(req.params); await shopsService.remove(req.user!.id, req.user!.role, id); res.status(204).send(); } catch (error) { next(error); } }