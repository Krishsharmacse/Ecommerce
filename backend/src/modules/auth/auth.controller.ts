import type { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { forgotPasswordSchema, loginSchema, otpSchema, refreshSchema, registerSchema, resetPasswordSchema } from "./auth.schema.js";

const authService = new AuthService();

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.status(201).json({ success: true, ...(await authService.register(registerSchema.parse(req.body))) }); } catch (error) { next(error); } }
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, ...(await authService.login(loginSchema.parse(req.body))) }); } catch (error) { next(error); } }
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { refreshToken } = refreshSchema.parse(req.body); res.json({ success: true, tokens: await authService.refresh(refreshToken) }); } catch (error) { next(error); } }
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { refreshToken } = refreshSchema.parse(req.body); await authService.logout(refreshToken); res.status(204).send(); } catch (error) { next(error); } }
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { email } = forgotPasswordSchema.parse(req.body); await authService.requestPasswordReset(email); res.json({ success: true, message: "If the account exists, reset instructions were sent" }); } catch (error) { next(error); } }
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = resetPasswordSchema.parse(req.body); await authService.resetPassword(data.otpId, data.code, data.password); res.json({ success: true }); } catch (error) { next(error); } }
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = otpSchema.parse(req.body); await authService.verifyEmail(data.otpId, data.code); res.json({ success: true }); } catch (error) { next(error); } }
export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = otpSchema.parse(req.body); await authService.verifyOtp(data.otpId, data.code); res.json({ success: true }); } catch (error) { next(error); } }