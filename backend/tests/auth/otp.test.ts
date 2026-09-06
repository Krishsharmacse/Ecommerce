import { describe, expect, it } from "vitest";
import { generateOtp } from "../../src/utils/generateOtp.js";

describe("OTP generation", () => {
  it("generates a six digit code", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });
});