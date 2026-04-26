import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { User } from "../models/user_model.js";
import jwt from "jsonwebtoken";

const signToken = (id, expiresIn = "10d") =>
    jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn });

// ════════════════════════════════════════════════════════════
// GOOGLE OAUTH CALLBACK — called by passport strategy route
// ════════════════════════════════════════════════════════════
export const googleCallback = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
        }

        const token = signToken(user._id);

        // If 2FA is enabled, redirect to 2FA verification instead
        if (user.twoFactorEnabled) {
            const tempToken = signToken(user._id, "10m"); // short-lived token for 2FA step
            return res.redirect(
                `${process.env.FRONTEND_URL}/verify-2fa?tempToken=${tempToken}&source=google`
            );
        }

        // Redirect to frontend with token in query (frontend picks it up and stores in localStorage)
        return res.redirect(
            `${process.env.FRONTEND_URL}/auth/callback?token=${token}&userId=${user._id}`
        );
    } catch (error) {
        console.error("Google callback error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};

// ════════════════════════════════════════════════════════════
// 2FA: SETUP — generate secret & QR code
// ════════════════════════════════════════════════════════════
export const setup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: "2FA is already enabled." });
        }

        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `ShopVault (${user.email})`,
            length: 32,
        });

        // Save temp secret (not yet enabled — needs verification first)
        user.twoFactorTempSecret = secret.base32;
        await user.save();

        // Generate QR code PNG as data URL
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        return res.status(200).json({
            success: true,
            message: "Scan the QR code with your authenticator app, then verify to enable 2FA.",
            qrCode: qrCodeUrl,
            secret: secret.base32, // show as backup key
            otpauthUrl: secret.otpauth_url,
        });
    } catch (error) {
        console.error("setup2FA error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// 2FA: VERIFY & ENABLE — user submits TOTP code from app
// ════════════════════════════════════════════════════════════
export const verify2FASetup = async (req, res) => {
    try {
        const { token: totpToken } = req.body;
        if (!totpToken) return res.status(400).json({ success: false, message: "TOTP code is required." });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (!user.twoFactorTempSecret) {
            return res.status(400).json({ success: false, message: "No pending 2FA setup. Call /setup first." });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorTempSecret,
            encoding: "base32",
            token: totpToken,
            window: 2,
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: "Invalid code. Please try again." });
        }

        // Activate 2FA
        user.twoFactorSecret = user.twoFactorTempSecret;
        user.twoFactorTempSecret = null;
        user.twoFactorEnabled = true;

        // Generate backup codes
        const backupCodes = Array.from({ length: 8 }, () =>
            Math.random().toString(36).slice(2, 10).toUpperCase()
        );
        user.twoFactorBackupCodes = backupCodes;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "✅ 2FA successfully enabled! Save your backup codes.",
            backupCodes,
        });
    } catch (error) {
        console.error("verify2FASetup error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// 2FA: VALIDATE — called during login when 2FA is active
// ════════════════════════════════════════════════════════════
export const validate2FA = async (req, res) => {
    try {
        const { tempToken, totpToken } = req.body;
        if (!tempToken || !totpToken) {
            return res.status(400).json({ success: false, message: "tempToken and totpToken are required." });
        }

        // Decode the short-lived temp JWT
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.SECRET_KEY);
        } catch {
            return res.status(401).json({ success: false, message: "Invalid or expired session. Please login again." });
        }

        const user = await User.findById(decoded.id)
            .select("-password -otp -resetToken -otpExpiry -resetTokenExpiry");

        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(400).json({ success: false, message: "2FA is not enabled for this account." });
        }

        // Check backup code first
        const normalizedInput = totpToken.trim().toUpperCase();
        if (user.twoFactorBackupCodes?.includes(normalizedInput)) {
            // Consume backup code
            user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(c => c !== normalizedInput);
            await user.save();

            const accessToken = signToken(user._id, "10d");
            return res.status(200).json({
                success: true,
                message: `Welcome back, ${user.firstname}! (Backup code used — ${user.twoFactorBackupCodes.length} remaining)`,
                user: safeUser(user),
                token: accessToken,
                accessToken,
            });
        }

        // Verify TOTP
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: totpToken,
            window: 2,
        });

        if (!verified) {
            return res.status(401).json({ success: false, message: "Invalid 2FA code. Please try again." });
        }

        const accessToken = signToken(user._id, "10d");
        const refreshToken = signToken(user._id, "30d");

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.firstname}! 👋`,
            user: safeUser(user),
            token: accessToken,
            accessToken,
            refreshToken,
        });
    } catch (error) {
        console.error("validate2FA error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// 2FA: DISABLE
// ════════════════════════════════════════════════════════════
export const disable2FA = async (req, res) => {
    try {
        const { totpToken } = req.body;
        if (!totpToken) return res.status(400).json({ success: false, message: "TOTP code required to disable 2FA." });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: "2FA is not currently enabled." });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: totpToken,
            window: 2,
        });

        if (!verified) {
            return res.status(401).json({ success: false, message: "Invalid code. 2FA not disabled." });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.twoFactorTempSecret = null;
        user.twoFactorBackupCodes = [];
        await user.save();

        return res.status(200).json({ success: true, message: "2FA has been disabled." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// 2FA: STATUS — get current 2FA status for profile page
// ════════════════════════════════════════════════════════════
export const get2FAStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("twoFactorEnabled twoFactorBackupCodes");
        return res.status(200).json({
            success: true,
            twoFactorEnabled: user.twoFactorEnabled,
            backupCodesRemaining: user.twoFactorBackupCodes?.length || 0,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Safe user response ───────────────────────────────────
const safeUser = (user) => ({
    id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    isverified: user.isverified,
    shopId: user.shopId,
    isManagerApproved: user.isManagerApproved,
    isShopkeeperApproved: user.isShopkeeperApproved,
    twoFactorEnabled: user.twoFactorEnabled,
    profilePIC: user.profilePIC,
    googleId: !!user.googleId,  // boolean only — never expose the ID
});