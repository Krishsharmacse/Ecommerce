import type { NextFunction, Request, Response } from "express";
import { cartItemIdSchema, cartItemSchema } from "./cart.schema.js";
import { CartService } from "./cart.service.js";

const cartService = new CartService();
export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, cart: await cartService.get(req.user!.id) }); } catch (error) { next(error); } }
export async function addCartItem(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.status(201).json({ success: true, item: await cartService.addItem(req.user!.id, cartItemSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function updateCartItem(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = cartItemIdSchema.parse(req.params); const { quantity } = cartItemSchema.pick({ quantity: true }).parse(req.body); res.json({ success: true, item: await cartService.updateItem(req.user!.id, id, quantity) }); } catch (error) { next(error); } }
export async function removeCartItem(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = cartItemIdSchema.parse(req.params); await cartService.removeItem(req.user!.id, id); res.status(204).send(); } catch (error) { next(error); } }
export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> { try { await cartService.clear(req.user!.id); res.status(204).send(); } catch (error) { next(error); } }