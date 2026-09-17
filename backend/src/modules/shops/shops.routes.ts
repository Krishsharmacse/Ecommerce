import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth.middleware.js";
import {
  cancelShopRequest,
  createShop,
  deleteShop,
  getMyShop,
  getPlatformSalesAdmin,
  getShop,
  listAllAdminShops,
  listShopRequestsAdmin,
  listShops,
  requestDeleteShop,
  requestOpenShop,
  reviewShopRequestAdmin,
  updateShop,
  updateShopStatusAdmin,
} from "./shops.controller.js";

export const shopsRoutes = Router();

// Public routes
shopsRoutes.get("/", listShops);
shopsRoutes.get("/all", listShops);

// Admin endpoints (MUST be defined before parameterized /:id routes)
shopsRoutes.get("/admin/all", authenticate, requireRoles(UserRole.ADMIN), listAllAdminShops);
shopsRoutes.get("/admin/sales", authenticate, requireRoles(UserRole.ADMIN), getPlatformSalesAdmin);
shopsRoutes.get("/admin/platform-sales", authenticate, requireRoles(UserRole.ADMIN), getPlatformSalesAdmin);
shopsRoutes.get("/admin/requests", authenticate, requireRoles(UserRole.ADMIN), listShopRequestsAdmin);
shopsRoutes.post("/admin/requests/:id/review", authenticate, requireRoles(UserRole.ADMIN), reviewShopRequestAdmin);
shopsRoutes.patch("/admin/requests/:id/review", authenticate, requireRoles(UserRole.ADMIN), reviewShopRequestAdmin);
shopsRoutes.patch("/admin/:id/status", authenticate, requireRoles(UserRole.ADMIN), updateShopStatusAdmin);
shopsRoutes.put("/admin/:id/status", authenticate, requireRoles(UserRole.ADMIN), updateShopStatusAdmin);

// Vendor workspace & request endpoints
shopsRoutes.get("/my/shop", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), getMyShop);
shopsRoutes.post("/request-open", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), requestOpenShop);
shopsRoutes.post("/requests/open", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), requestOpenShop);
shopsRoutes.post("/request-delete", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), requestDeleteShop);
shopsRoutes.post("/requests/delete", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), requestDeleteShop);
shopsRoutes.post("/requests/:id/cancel", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), cancelShopRequest);

// Legacy shop creation (VENDOR/ADMIN)
shopsRoutes.post("/", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), createShop);
shopsRoutes.post("/create", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), createShop);

// Parameterized routes
shopsRoutes.get("/:id", getShop);
shopsRoutes.patch("/:id", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), updateShop);
shopsRoutes.put("/:id", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), updateShop);

// Only ADMIN can perform a direct hard delete. Vendors must submit a deletion request via /request-delete.
shopsRoutes.delete("/:id", authenticate, requireRoles(UserRole.ADMIN), deleteShop);