import { Router } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth.middleware.js";
import { uploadImage } from "./uploads.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
export const uploadsRoutes = Router();
uploadsRoutes.post("/images", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), upload.single("image"), uploadImage);