import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth.middleware.js";
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from "./product.controller.js";

export const productRoutes = Router();
productRoutes.get("/", listProducts);
productRoutes.get("/:id", getProduct);
productRoutes.post("/", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), createProduct);
productRoutes.patch("/:id", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), updateProduct);
productRoutes.delete("/:id", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), deleteProduct);