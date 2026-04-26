import express from "express";
import {
    login, register, reVerify, verify, verifyOTP,
    makeAdmin, initializeAdmin, forgotPassword,
    resetPassword, testEmail, getProfile,
    getAllUsers, approveManager, changeUserRole, getPlatformStats
} from "../controllers/user_controller.js";
import { isAuthenticated, isOwner } from "../middleware/auth_middleware.js";
import { authLimiter, otpLimiter } from "../middleware/rate_limit.js";

const router = express.Router();

// ─── Public ───────────────────────────────────────────────
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/verify", verify);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/reverify", otpLimiter, reVerify);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/test-email", testEmail);                          // dev only

// ─── Authenticated ────────────────────────────────────────
router.get("/profile", isAuthenticated, getProfile);

// ─── Owner Only ───────────────────────────────────────────
router.get("/all", isAuthenticated, isOwner, getAllUsers);
router.get("/stats", isAuthenticated, isOwner, getPlatformStats);
router.post("/approve-manager", isAuthenticated, isOwner, approveManager);
router.post("/change-role", isAuthenticated, isOwner, changeUserRole);
router.post("/initialize-admin", initializeAdmin);              // promote user → owner (needs adminSecret)
router.post("/make-admin", isAuthenticated, isOwner, makeAdmin); // legacy

export default router;