import express from "express";
import { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct } from "../controllers/product_controller.js";
import { isAuthenticated, isAdmin } from "../middleware/auth_middleware.js";

const router = express.Router();

// Public Routes
router.get("/all", getAllProducts);
router.get("/:id", getProductById);

// Protected Routes (Logged in users - admin only for CRUD)
router.post("/create", isAuthenticated, isAdmin, createProduct);

// Admin Only Routes
router.put("/update/:id", isAuthenticated, isAdmin, updateProduct);
router.delete("/delete/:id", isAuthenticated, isAdmin, deleteProduct);

export default router;