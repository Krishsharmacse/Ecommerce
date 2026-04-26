import express from "express";
import passport from "../middleware/passport.js";
import {
    googleCallback,
    setup2FA, verify2FASetup, validate2FA,
    disable2FA, get2FAStatus,
} from "../controllers/auth_controller.js";
import { isAuthenticated } from "../middleware/auth_middleware.js";
import { authLimiter } from "../middleware/rate_limit.js";

const router = express.Router();

// ─── Google OAuth ─────────────────────────────────────────
// Step 1: redirect user to Google
router.get(
    "/google",
    authLimiter,
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Step 2: Google redirects back here
router.get(
    "/google/callback",
    authLimiter,
    passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
    googleCallback
);

// ─── 2FA ─────────────────────────────────────────────────
// Setup: generates QR code (authenticated user)
router.post("/2fa/setup", isAuthenticated, setup2FA);

// Confirm setup: verify TOTP, activate 2FA
router.post("/2fa/verify-setup", isAuthenticated, authLimiter, verify2FASetup);

// Login step: validate TOTP during sign-in (uses tempToken, NOT full auth)
router.post("/2fa/validate", authLimiter, validate2FA);

// Disable 2FA (requires current TOTP code)
router.delete("/2fa/disable", isAuthenticated, authLimiter, disable2FA);

// Get 2FA status for profile page
router.get("/2fa/status", isAuthenticated, get2FAStatus);

export default router;
