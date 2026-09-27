import { UserRole, OtpPurpose } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { ConflictError, UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { comparePassword, hashPassword, hashToken } from "../../utils/hash.js";
import { addDays } from "../../utils/dates.js";
import { OtpService } from "../../services/otp.service.js";
import { enqueueEmail } from "../../modules/queues/index.js";
import {
  emailVerificationTemplate,
  loginAlertTemplate,
  passwordResetTemplate,
  passwordChangedTemplate,
  welcomeGoogleTemplate,
} from "../../services/email-templates.service.js";
import { sendEmail } from "../../services/mail.service.js";
import type { AuthResponse, LoginInput, RegisterInput, TokenPair } from "./auth.types.js";

const otpService = new OtpService();

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("An account with this email already exists");
    const user = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        role: UserRole.CUSTOMER,
      },
    });
    const verification = await otpService.issue(user.email, OtpPurpose.EMAIL_VERIFICATION, user.id);
    const verifyTpl = emailVerificationTemplate(user.firstName, verification.code);
    void sendEmail(user.email, "Verify your ShopVault email", verifyTpl.text, verifyTpl.html).catch(() => {});
    await enqueueEmail(
      { to: user.email, subject: "Verify your ShopVault email", text: verifyTpl.text, html: verifyTpl.html },
      `verify-${user.id}-${verification.otpId}`,
    ).catch(() => {});
    return {
      user: this.publicUser(user),
      tokens: await this.issueTokens(user.id, user.role),
      verification: { otpId: verification.otpId },
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive || !(await comparePassword(input.password, user.passwordHash))) throw new UnauthorizedError("Invalid email or password");
    const loginTpl = loginAlertTemplate(user.firstName, new Date());
    void sendEmail(user.email, "New ShopVault sign-in detected", loginTpl.text, loginTpl.html).catch(() => {});
    await enqueueEmail(
      { to: user.email, subject: "New ShopVault sign-in detected", text: loginTpl.text, html: loginTpl.html },
      `login-${user.id}-${Date.now()}`,
    ).catch(() => {});
    return { user: this.publicUser(user), tokens: await this.issueTokens(user.id, user.role) };
  }

  async resendVerification(email: string): Promise<{ otpId?: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isEmailVerified) return {};
    const verification = await otpService.issue(user.email, OtpPurpose.EMAIL_VERIFICATION, user.id);
    const resendTpl = emailVerificationTemplate(user.firstName, verification.code);
    void sendEmail(user.email, "Verify your ShopVault email", resendTpl.text, resendTpl.html).catch(() => {});
    await enqueueEmail(
      { to: user.email, subject: "Verify your ShopVault email", text: resendTpl.text, html: resendTpl.html },
      `verify-${user.id}-${verification.otpId}`,
    ).catch(() => {});
    return { otpId: verification.otpId };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload;
    try { payload = verifyRefreshToken(refreshToken); } catch { throw new UnauthorizedError("Invalid refresh token"); }
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date() || stored.user.id !== payload.sub) {
      throw new UnauthorizedError("Refresh token expired or invalid");
    }

    // Reuse detection: If a revoked token is presented, invalidate ALL user sessions
    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError("Refresh token reuse detected. All sessions have been terminated.");
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user.id, stored.user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedError("Refresh token does not match active session");
    }
    await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const otp = await otpService.issue(email, OtpPurpose.PASSWORD_RESET, user.id);
    const resetTpl = passwordResetTemplate(user.firstName, otp.code);
    void sendEmail(email, "Reset your ShopVault password", resetTpl.text, resetTpl.html).catch(() => {});
    await enqueueEmail(
      { to: email, subject: "Reset your ShopVault password", text: resetTpl.text, html: resetTpl.html },
      `reset-${user.id}-${otp.otpId}`,
    ).catch(() => {});
  }

  async resetPassword(otpId: string, code: string, password: string): Promise<void> {
    const otp = await prisma.otp.findUnique({ where: { id: otpId } });
    if (!otp?.userId || otp.purpose !== OtpPurpose.PASSWORD_RESET) throw new ValidationError("Password reset code is invalid");
    await otpService.verify(otpId, code);
    await prisma.$transaction([
      prisma.user.update({ where: { id: otp.userId }, data: { passwordHash: await hashPassword(password) } }),
      prisma.refreshToken.updateMany({ where: { userId: otp.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    const user = await prisma.user.findUnique({ where: { id: otp.userId } });
    if (user) {
      const changedTpl = passwordChangedTemplate(user.firstName);
      void sendEmail(user.email, "Your ShopVault password has been updated", changedTpl.text, changedTpl.html).catch(() => {});
    }
  }

  async verifyEmail(otpId: string, code: string): Promise<void> {
    const otp = await prisma.otp.findUnique({ where: { id: otpId } });
    if (!otp?.userId || otp.purpose !== OtpPurpose.EMAIL_VERIFICATION) throw new ValidationError("Verification code is invalid");
    await otpService.verify(otpId, code);
    const updatedUser = await prisma.user.update({ where: { id: otp.userId }, data: { isEmailVerified: true } });
    const welcomeTpl = welcomeGoogleTemplate(updatedUser.firstName);
    void sendEmail(updatedUser.email, "Welcome to ShopVault! 🎉", welcomeTpl.text, welcomeTpl.html).catch(() => {});
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

  private publicUser(user: { id: string; email: string; firstName: string; lastName: string; role: UserRole; isEmailVerified?: boolean }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      firstname: user.firstName,
      lastname: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified ?? false,
      isverified: user.isEmailVerified ?? false,
    };
  }
}
