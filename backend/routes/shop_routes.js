import express from "express";
import {
    createShop, getAllShops, getShopById, getMyShop,
    updateMyShop, getMyShopSales, getAllShopsAdmin,
    updateShopStatus, getPlatformSales,
    // Shopkeeper
    getMyAssignedShop, toggleShopLive, getMyAssignedShopSales,
    createShopRequest,
    assignShopkeeper, getMyShopkeepers,
} from "../controllers/shop_controller.js";
import {
    isAuthenticated, isManager, isOwner,
    isApprovedManager, isApprovedShopkeeper,
    isOwnerOrApprovedManager, isShopkeeper,
} from "../middleware/auth_middleware.js";

const router = express.Router();

// ─── Public ───────────────────────────────────────────────
router.get("/all", getAllShops);

// ─── Shopkeeper (& above): own shop access ────────────────
router.get("/sk/shop", isAuthenticated, isApprovedShopkeeper, getMyAssignedShop);
router.get("/sk/sales", isAuthenticated, isApprovedShopkeeper, getMyAssignedShopSales);
router.patch("/sk/toggle-live", isAuthenticated, isApprovedShopkeeper, toggleShopLive);
router.post("/sk/request", isAuthenticated, isShopkeeper, createShopRequest);

// ─── Manager (approved): own shop management ─────────────
router.post("/create", isAuthenticated, isManager, createShop);
router.get("/my/shop", isAuthenticated, isApprovedManager, getMyShop);
router.put("/my/shop", isAuthenticated, isApprovedManager, updateMyShop);
router.get("/my/sales", isAuthenticated, isApprovedManager, getMyShopSales);
router.get("/my/shopkeepers", isAuthenticated, isApprovedManager, getMyShopkeepers);
router.post("/my/shopkeepers", isAuthenticated, isApprovedManager, assignShopkeeper);

// ─── Owner Only ───────────────────────────────────────────
router.get("/admin/all", isAuthenticated, isOwner, getAllShopsAdmin);
router.get("/admin/platform-sales", isAuthenticated, isOwner, getPlatformSales);
router.put("/admin/:shopId/status", isAuthenticated, isOwnerOrApprovedManager, updateShopStatus);

// ─── Public: by ID — MUST be last to avoid swallowing other GET routes ───
router.get("/:shopId", getShopById);

export default router;
