import express from "express";
import {
    createProduct, getAllProducts, getProductById,
    updateProduct, deleteProduct, getMyProducts
} from "../controllers/product_controller.js";
import { isAuthenticated, isApprovedShopkeeper, isOwner } from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Manager (approved) or Owner ─────────────────────────
router.get("/mine/list", isAuthenticated, isApprovedShopkeeper, getMyProducts);
router.post("/create", isAuthenticated, isApprovedShopkeeper, createProduct);
router.put("/update/:id", isAuthenticated, isApprovedShopkeeper, updateProduct);
router.delete("/delete/:id", isAuthenticated, isApprovedShopkeeper, deleteProduct);

// ─── Public ───────────────────────────────────────────────
router.get("/all", getAllProducts);
router.get("/:id", getProductById);

export default router;