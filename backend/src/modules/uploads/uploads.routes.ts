import { Router } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth.middleware.js";
import { uploadImage } from "./uploads.controller.js";

import { BadRequestError } from "../../lib/errors.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new BadRequestError("Only JPEG, PNG, WEBP, and GIF images are allowed. SVGs and executable scripts are blocked."));
    }
    cb(null, true);
  },
});

export const uploadsRoutes = Router();
uploadsRoutes.post("/images", authenticate, requireRoles(UserRole.VENDOR, UserRole.ADMIN), upload.single("image"), uploadImage);