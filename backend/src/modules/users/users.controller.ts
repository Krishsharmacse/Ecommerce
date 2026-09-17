import type { NextFunction, Request, Response } from "express";
import { addressIdSchema, addressSchema, profileSchema } from "./users.schema.js";
import { UsersService } from "./users.service.js";

const usersService = new UsersService();
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await usersService.getProfile(req.user!.id);
    res.json({
      success: true,
      user: {
        ...profile,
        firstname: profile.firstName,
        lastname: profile.lastName,
        isverified: profile.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, user: await usersService.updateProfile(req.user!.id, profileSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function listAddresses(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, addresses: await usersService.listAddresses(req.user!.id) }); } catch (error) { next(error); } }
export async function addAddress(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.status(201).json({ success: true, address: await usersService.addAddress(req.user!.id, addressSchema.parse(req.body)) }); } catch (error) { next(error); } }
export async function deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = addressIdSchema.parse(req.params); await usersService.deleteAddress(req.user!.id, id); res.status(204).send(); } catch (error) { next(error); } }

export async function listAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleFilter = typeof req.query.role === "string" ? req.query.role : undefined;
    const users = await usersService.listAllUsers(roleFilter);
    res.json({ success: true, users });
  } catch (error) { next(error); }
}

export async function getUserStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await usersService.getUserStats();
    res.json({ success: true, stats });
  } catch (error) { next(error); }
}

export async function changeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = req.body ?? {};
    if (!userId || !role) { res.status(400).json({ success: false, message: "userId and role are required" }); return; }
    const updated = await usersService.changeRole(userId, role);
    res.json({ success: true, user: updated });
  } catch (error) { next(error); }
}

export async function approveManager(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, action } = req.body ?? {};
    if (!userId || !["approve", "reject"].includes(action)) {
      res.status(400).json({ success: false, message: "Valid userId and action ('approve' | 'reject') are required" });
      return;
    }
    const updated = await usersService.approveManager(userId, action);
    res.json({ success: true, user: updated });
  } catch (error) { next(error); }
}