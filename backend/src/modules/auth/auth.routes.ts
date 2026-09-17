import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  verifyEmail,
  verifyOtp,
} from "./auth.controller.js";
import { googleAuthRoutes } from "./google.routes.js";
import { authRateLimiter, otpRateLimiter } from "../../middleware/rateLimiter.js";

export const authRoutes = Router();

// Google OAuth (has its own state-based CSRF protection)
authRoutes.use(googleAuthRoutes);

// Strict rate-limited auth endpoints
authRoutes.post("/register",         authRateLimiter, register);
authRoutes.post("/login",            authRateLimiter, login);
authRoutes.post("/refresh",          authRateLimiter, refresh);
authRoutes.post("/logout",           authRateLimiter, logout);
authRoutes.post("/forgot-password",  authRateLimiter, forgotPassword);
authRoutes.post("/reset-password",   otpRateLimiter,  resetPassword);
authRoutes.post("/verify-email",     otpRateLimiter,  verifyEmail);
authRoutes.post("/verify-otp",       otpRateLimiter,  verifyOtp);