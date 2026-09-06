import type { NextFunction, Request, Response } from "express";
import { addressIdSchema, addressSchema, profileSchema } from "./users.schema.js";
import { UsersService } from "./users.service.js";

const usersService = new UsersService();
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, user: await usersService.getProfile(req.user!.id) }); } catch (error) { next(error); } }
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, user: await usersService.updateProfile(req.user!.id, profileSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function listAddresses(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, addresses: await usersService.listAddresses(req.user!.id) }); } catch (error) { next(error); } }
export async function addAddress(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.status(201).json({ success: true, address: await usersService.addAddress(req.user!.id, addressSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = addressIdSchema.parse(req.params); await usersService.deleteAddress(req.user!.id, id); res.status(204).send(); } catch (error) { next(error); } }