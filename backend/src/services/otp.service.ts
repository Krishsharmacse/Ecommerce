import { OtpPurpose } from "@prisma/client";
import { cache } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "../lib/constants.js";
import { ConflictError, ValidationError } from "../lib/errors.js";
import { addMinutes } from "../utils/dates.js";
import { generateOtp } from "../utils/generateOtp.js";
import { hashToken } from "../utils/hash.js";

export class OtpService {
  async issue(email: string, purpose: OtpPurpose, userId?: string): Promise<{ otpId: string; code: string }> {
    const cooldownKey = `otp:cooldown:${purpose}:${email.toLowerCase()}`;
    if (await cache.get(cooldownKey)) throw new ConflictError("Please wait before requesting another OTP");
    const code = generateOtp();
    const otp = await prisma.otp.create({ data: { email: email.toLowerCase(), userId, purpose, codeHash: hashToken(code), expiresAt: addMinutes(new Date(), 10) } });
    await cache.set(cooldownKey, true, 60);
    return { otpId: otp.id, code };
  }

  async verify(otpId: string, code: string): Promise<void> {
    const otp = await prisma.otp.findUnique({ where: { id: otpId } });
    if (!otp || otp.consumedAt || otp.expiresAt < new Date()) throw new ValidationError("OTP is invalid or expired");
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new ValidationError("OTP attempt limit exceeded");
    if (hashToken(code) !== otp.codeHash) {
      await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new ValidationError("OTP is invalid");
    }
    await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await cache.delete(`otp:${otp.id}`);
    void OTP_TTL_SECONDS;
  }
}