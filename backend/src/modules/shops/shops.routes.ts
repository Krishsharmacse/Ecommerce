import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth.middleware.js";
import { createShop, deleteShop, getShop, listShops, updateShop } from "./shops.controller.js";

export const shopsRoutes = Router();
shopsRoutes.get("/", listShops);
shopsRoutes.get("/:id", getShop);
shopsRoutes.post("/", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), createShop);
shopsRoutes.patch("/:id", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), updateShop);
shopsRoutes.delete("/:id", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), deleteShop);