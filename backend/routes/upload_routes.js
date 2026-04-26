import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadImage } from "../middleware/upload.js";
import { isAuthenticated, isApprovedShopkeeper } from "../middleware/auth_middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads", "products");
const router = express.Router();

// ════════════════════════════════════════════════════════════
// POST /api/v1/upload/image
//   • Accepts: multipart/form-data  { image: <file> }
//   • Auth:    approved shopkeeper, manager, or owner
//   • Returns: { success, url }  — url is relative e.g. /uploads/products/product-xxx.jpg
// ════════════════════════════════════════════════════════════
router.post("/image", isAuthenticated, isApprovedShopkeeper, (req, res) => {
    uploadImage(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided." });
        }

        // Build a public URL — served as static by server.js
        const url = `/uploads/products/${req.file.filename}`;
        return res.status(200).json({ success: true, url, filename: req.file.filename });
    });
});

// ════════════════════════════════════════════════════════════
// GET /api/v1/upload/images
//   • Auth:    approved shopkeeper, manager, or owner
//   • Returns: { success, images: [{ filename, url, size, createdAt }] }
// ════════════════════════════════════════════════════════════
router.get("/images", isAuthenticated, isApprovedShopkeeper, (req, res) => {
    try {
        if (!fs.existsSync(uploadDir)) {
            return res.status(200).json({ success: true, images: [] });
        }

        const files = fs.readdirSync(uploadDir)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
            .map(filename => {
                const filePath = path.join(uploadDir, filename);
                const stat = fs.statSync(filePath);
                return {
                    filename,
                    url: `/uploads/products/${filename}`,
                    size: stat.size,
                    createdAt: stat.birthtime,
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first

        return res.status(200).json({ success: true, images: files });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to list images." });
    }
});

// ════════════════════════════════════════════════════════════
// DELETE /api/v1/upload/image/:filename
//   • Auth:    approved shopkeeper, manager, or owner
//   • Returns: { success, message }
// ════════════════════════════════════════════════════════════
router.delete("/image/:filename", isAuthenticated, isApprovedShopkeeper, (req, res) => {
    try {
        const { filename } = req.params;

        // Security: prevent path traversal
        if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
            return res.status(400).json({ success: false, message: "Invalid filename." });
        }

        const filePath = path.join(uploadDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "File not found." });
        }

        fs.unlinkSync(filePath);
        return res.status(200).json({ success: true, message: "Image deleted successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to delete image." });
    }
});

export default router;
