import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth.middleware.js";
import {
  addAddress,
  approveManager,
  changeRole,
  deleteAddress,
  getProfile,
  getUserStats,
  listAddresses,
  listAllUsers,
  updateProfile,
} from "./users.controller.js";

export const usersRoutes = Router();
usersRoutes.use(authenticate);
usersRoutes.get("/me", getProfile);
usersRoutes.get("/profile", getProfile);
usersRoutes.patch("/me", updateProfile);
usersRoutes.get("/me/addresses", listAddresses);
usersRoutes.post("/me/addresses", addAddress);
usersRoutes.delete("/me/addresses/:id", deleteAddress);

// Admin user management routes
usersRoutes.get("/all", requireRoles(UserRole.ADMIN), listAllUsers);
usersRoutes.get("/stats", requireRoles(UserRole.ADMIN), getUserStats);
usersRoutes.post("/change-role", requireRoles(UserRole.ADMIN), changeRole);
usersRoutes.post("/approve-manager", requireRoles(UserRole.ADMIN), approveManager);