import { Router } from "express";
import { forgotPassword, login, logout, refresh, register, resetPassword, verifyEmail, verifyOtp } from "./auth.controller.js";

export const authRoutes = Router();
authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/refresh", refresh);
authRoutes.post("/logout", logout);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.post("/verify-email", verifyEmail);
authRoutes.post("/verify-otp", verifyOtp);