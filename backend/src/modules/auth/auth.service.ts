import { UserRole, OtpPurpose } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { ConflictError, UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { comparePassword, hashPassword, hashToken } from "../../utils/hash.js";
import { addDays } from "../../utils/dates.js";
import { OtpService } from "../../services/otp.service.js";
import { enqueueEmail } from "../../queues/index.js";
import type { AuthResponse, LoginInput, RegisterInput, TokenPair } from "./auth.types.js";

const otpService = new OtpService();

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("An account with this email already exists");
    const user = await prisma.user.create({ data: { ...input, passwordHash: await hashPassword(input.password), role: UserRole.CUSTOMER } });
    const verification = await otpService.issue(user.email, OtpPurpose.EMAIL_VERIFICATION, user.id);
    await enqueueEmail({ to: user.email, subject: "Verify your email", text: `Your verification code is ${verification.code}` }, `verify:${user.id}:${verification.otpId}`);
    return { user: this.publicUser(user), tokens: await this.issueTokens(user.id, user.role) };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive || !(await comparePassword(input.password, user.passwordHash))) throw new UnauthorizedError("Invalid email or password");
    return { user: this.publicUser(user), tokens: await this.issueTokens(user.id, user.role) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload;
    try { payload = verifyRefreshToken(refreshToken); } catch { throw new UnauthorizedError("Invalid refresh token"); }
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.id !== payload.sub) throw new UnauthorizedError("Refresh token expired or revoked");
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user.id, stored.user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const otp = await otpService.issue(email, OtpPurpose.PASSWORD_RESET, user.id);
    await enqueueEmail({ to: email, subject: "Reset your password", text: `Your password reset code is ${otp.code}` }, `reset:${user.id}:${otp.otpId}`);
  }

  async resetPassword(otpId: string, code: string, password: string): Promise<void> {
    const otp = await prisma.otp.findUnique({ where: { id: otpId } });
    if (!otp?.userId || otp.purpose !== OtpPurpose.PASSWORD_RESET) throw new ValidationError("Password reset code is invalid");
    await otpService.verify(otpId, code);
    await prisma.$transaction([
      prisma.user.update({ where: { id: otp.userId }, data: { passwordHash: await hashPassword(password) } }),
      prisma.refreshToken.updateMany({ where: { userId: otp.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
  }

  async verifyEmail(otpId: string, code: string): Promise<void> {
    const otp = await prisma.otp.findUnique({ where: { id: otpId } });
    if (!otp?.userId || otp.purpose !== OtpPurpose.EMAIL_VERIFICATION) throw new ValidationError("Verification code is invalid");
    await otpService.verify(otpId, code);
    await prisma.user.update({ where: { id: otp.userId }, data: { isEmailVerified: true } });
  }

  async verifyOtp(otpId: string, code: string): Promise<void> {
    await otpService.verify(otpId, code);
  }

  private async issueTokens(userId: string, role: UserRole): Promise<TokenPair> {
    const payload = { sub: userId, role };
    const accessToken = signAccessToken({ ...payload, type: "access" });
    const refreshToken = signRefreshToken({ ...payload, type: "refresh" });
    await prisma.refreshToken.create({ data: { userId, tokenHash: hashToken(refreshToken), expiresAt: addDays(new Date(), 30) } });
    return { accessToken, refreshToken };
  }

  private publicUser(user: { id: string; email: string; firstName: string; lastName: string; role: UserRole }) {
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
  }
}