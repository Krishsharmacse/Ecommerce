import { User } from "../models/user_model.js";
import { Shop } from "../models/shop_model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { verifyEmail } from "../EMAILVERIFY/verifmail.js";
import { Session } from "../models/sessionModel.js";

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const signToken = (id, expiresIn = "10d") =>
    jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn });

// ────────────────────────────────────────────────────────────
// Helper: safe user response (strip sensitive fields)
// ────────────────────────────────────────────────────────────
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
    hasPassword: !!user.password && !user.password.startsWith('google_oauth_'),
    linkedGoogle: !!user.googleId,
});

// ════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════
export const register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, role } = req.body;

        if (!firstname || !lastname || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email address." });
        }

        // Strong password policy
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter." });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ success: false, message: "Password must contain at least one number." });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "An account with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Determine role — only allow user or manager self-registration
        const allowedSelfRole = ["user", "manager"].includes(role) ? role : "user";

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = new User({
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: allowedSelfRole,
            otp,
            otpExpiry,
            // Managers start unapproved, owners must approve
            isManagerApproved: allowedSelfRole === "manager" ? false : undefined,
            managerRequestedAt: allowedSelfRole === "manager" ? new Date() : undefined,
        });

        await newUser.save();
        const token = signToken(newUser._id);

        verifyEmail(otp, newUser.email).catch(err =>
            console.error("Email OTP send error:", err.message)
        );

        return res.status(201).json({
            success: true,
            message: `Account created! Check your email for the 6-digit verification OTP.`,
            user: safeUser(newUser),
            token,
        });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
    }
};

// ════════════════════════════════════════════════════════════
// VERIFY OTP
// ════════════════════════════════════════════════════════════
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required." });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.isverified) {
            return res.status(400).json({ success: false, message: "Email already verified." });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: "Incorrect OTP." });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        user.isverified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "✅ Email verified successfully!",
            user: safeUser(user),
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// VERIFY (token-based, legacy)
// ════════════════════════════════════════════════════════════
export const verify = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(400).json({ success: false, message: "Authorization token missing." });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(400).json({ success: false, message: "User not found." });

        user.token = null;
        user.isverified = true;
        await user.save();

        return res.status(200).json({ success: true, message: "Email verified successfully.", user: safeUser(user) });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// RESEND OTP
// ════════════════════════════════════════════════════════════
export const reVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });

        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (user.isverified) return res.status(400).json({ success: false, message: "Email already verified." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        verifyEmail(otp, user.email).catch(err => console.error("Resend OTP error:", err.message));

        return res.status(200).json({ success: true, message: "New OTP sent to your email." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// LOGIN (with lockout)
// ════════════════════════════════════════════════════════════
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // Check account lock
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(403).json({
                success: false,
                message: `Account locked due to multiple failed attempts. Try again in ${minutesLeft} minute(s).`
            });
        }

        // OAuth-only accounts have no usable password
        if (!user.password || user.password.startsWith('google_oauth_')) {
            return res.status(400).json({
                success: false,
                message: "This account uses Google Sign-In. Please login with Google.",
                useGoogle: true,
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;

            if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
                user.loginAttempts = 0;
                await user.save();
                return res.status(403).json({
                    success: false,
                    message: `Account locked for 30 minutes due to ${MAX_LOGIN_ATTEMPTS} failed attempts.`
                });
            }

            await user.save();
            return res.status(401).json({
                success: false,
                message: `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - user.loginAttempts} attempt(s) remaining.`
            });
        }

        // Reset failed attempts
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.isLoggedin = true;
        user.lastLoginAt = new Date();
        user.lastLoginIP = req.ip || req.connection?.remoteAddress;
        await user.save();

        // Session management
        const existingSession = await Session.findOne({ userId: user._id });
        if (existingSession) await Session.deleteOne({ userId: user._id });
        await Session.create({ userId: user._id });

        // ── 2FA Check ───────────────────────────────────────────
        if (user.twoFactorEnabled) {
            // Issue a short-lived temp token — frontend uses this to call /auth/2fa/validate
            const tempToken = signToken(user._id, "10m");
            return res.status(200).json({
                success: true,
                requires2FA: true,
                message: "2FA required. Please enter your authenticator code.",
                tempToken,
                email: user.email,
            });
        }

        const accessToken = signToken(user._id, "10d");
        const refreshToken = signToken(user._id, "30d");

        const responseMessage = !user.isverified
            ? "Login successful. Please verify your email to unlock full access."
            : `Welcome back, ${user.firstname}! 👋`;

        return res.status(200).json({
            success: true,
            message: responseMessage,
            user: safeUser(user),
            token: accessToken,
            accessToken,
            refreshToken,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// GET MY PROFILE
// ════════════════════════════════════════════════════════════
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password -otp -resetToken -otpExpiry -resetTokenExpiry -loginAttempts -lockUntil")
            .populate("shopId", "name status logo category");

        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Get all users (with filtering)
// ════════════════════════════════════════════════════════════
export const getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 20, search } = req.query;

        const filter = {};
        if (role) filter.role = role;
        if (search) {
            filter.$or = [
                { firstname: { $regex: search, $options: "i" } },
                { lastname: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password -otp -resetToken -otpExpiry -resetTokenExpiry")
                .populate("shopId", "name status")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            users,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Approve / reject manager
// ════════════════════════════════════════════════════════════
export const approveManager = async (req, res) => {
    try {
        const { userId, action, note } = req.body; // action: "approve" | "reject"

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (user.role !== "manager") return res.status(400).json({ success: false, message: "User is not a manager." });

        if (action === "approve") {
            user.isManagerApproved = true;
            user.managerApprovedAt = new Date();
            user.managerApprovedBy = req.user._id;
        } else {
            user.isManagerApproved = false;
            user.role = "user"; // Downgrade
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: action === "approve"
                ? `${user.firstname}'s manager account has been approved.`
                : `${user.firstname}'s manager request has been rejected.`,
            user: safeUser(user),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Change any user's role
// ════════════════════════════════════════════════════════════
export const changeUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        const validRoles = ["user", "shopkeeper", "manager", "owner"];

        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role. Must be user, manager, or owner." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        // Prevent demoting yourself
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot change your own role." });
        }

        const previousRole = user.role;
        user.role = role;

        if (role === "manager") {
            user.isManagerApproved = true;
            user.managerApprovedAt = new Date();
            user.managerApprovedBy = req.user._id;
            user.managerRequestedAt = user.managerRequestedAt || new Date();
        }
        if (role === "shopkeeper") {
            user.isShopkeeperApproved = false; // needs manager approval
        }

        await user.save();

        console.log(`✅ Owner ${req.user.email} changed ${user.email} role: ${previousRole} → ${role}`);

        return res.status(200).json({
            success: true,
            message: `${user.firstname}'s role changed from ${previousRole} to ${role}.`,
            user: safeUser(user),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Initialize first owner (one-time setup)
// ════════════════════════════════════════════════════════════
export const initializeFirstAdmin = async (req, res) => {
    try {
        const { email, adminSecret } = req.body;

        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ success: false, message: "Invalid admin secret key." });
        }

        const existingOwner = await User.findOne({ role: "owner" });
        if (existingOwner) {
            return res.status(400).json({ success: false, message: "An owner already exists." });
        }

        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        user.role = "owner";
        user.isManagerApproved = true; // owners are pre-approved
        await user.save();

        console.log(`✅ First owner initialized: ${email}`);

        return res.status(200).json({
            success: true,
            message: `${email} is now the owner/super-admin!`,
            user: safeUser(user),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// LEGACY: makeAdmin → maps to changeUserRole for backward compat
// ════════════════════════════════════════════════════════════
export const makeAdmin = async (req, res) => {
    req.body.role = "owner";
    req.body.userId = (await User.findOne({ email: req.body.email }))?._id;
    return changeUserRole(req, res);
};

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal whether email exists (security best practice)
            return res.status(200).json({ success: true, message: "If that email exists, a reset link has been sent." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetToken = resetTokenHash;
        user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        try {
            await sendPasswordResetEmail(user.email, resetLink, user.firstname);
        } catch (emailError) {
            console.error("Password reset email failed:", emailError.message);
            return res.status(500).json({ success: false, message: "Failed to send reset email. Please try again." });
        }

        return res.status(200).json({ success: true, message: "Password reset link sent to your email. Valid for 15 minutes." });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// RESET PASSWORD
// ════════════════════════════════════════════════════════════
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter." });
        }
        if (!/[0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain at least one number." });
        }

        const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetToken: resetTokenHash,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        user.resetToken = null;
        user.resetTokenExpiry = null;
        user.loginAttempts = 0; // Reset lockout on password change
        user.lockUntil = null;
        await user.save();

        return res.status(200).json({ success: true, message: "Password reset successfully! You can now login." });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// OWNER: Get platform analytics
// ════════════════════════════════════════════════════════════
export const getPlatformStats = async (req, res) => {
    try {
        const [totalUsers, totalManagers, totalOwners, pendingManagers] = await Promise.all([
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "manager" }),
            User.countDocuments({ role: "owner" }),
            User.countDocuments({ role: "manager", isManagerApproved: false }),
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                users: { total: totalUsers, managers: totalManagers, owners: totalOwners, pendingManagers }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// TEST EMAIL (dev only)
// ════════════════════════════════════════════════════════════
export const testEmail = async (req, res) => {
    if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ success: false, message: "Not available in production." });
    }
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        });
        await transporter.verify();
        const result = await transporter.sendMail({
            from: `"ShopVault" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: "Test Email - ShopVault",
            html: "<h2>Test ✅</h2><p>Email is working!</p>"
        });
        return res.status(200).json({ success: true, message: "Test email sent!", id: result.messageId });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ────────────────────────────────────────────────────────────
// Helper: send password reset email (no verify() to avoid hangs)
// ────────────────────────────────────────────────────────────
const sendPasswordResetEmail = async (email, resetLink, firstName) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
    });

    // NOTE: transporter.verify() removed — it can hang on slow networks
    await transporter.sendMail({
        from: `"ShopVault" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset — ShopVault",
        html: `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0a0a12; color: #f0f0ff; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #6c63ff, #a29bff); padding: 32px; text-align: center;">
                    <h1 style="margin:0; font-size: 24px; font-weight: 800;">⚡ ShopVault</h1>
                </div>
                <div style="padding: 32px;">
                    <h2 style="margin: 0 0 16px; color: #f0f0ff;">Password Reset Request</h2>
                    <p style="color: #9898b8; margin-bottom: 24px;">Hello <strong style="color:#f0f0ff">${firstName}</strong>, click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetLink}" style="background: linear-gradient(135deg, #6c63ff, #a29bff); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block;">
                            🔐 Reset Password
                        </a>
                    </div>
                    <p style="color: #5a5a7a; font-size: 13px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
                    <p style="color: #5a5a7a; font-size: 11px; margin-top: 8px; word-break: break-all;">Link: ${resetLink}</p>
                </div>
            </div>
        `
    });
};

// ════════════════════════════════════════════════════════════
// INITIALIZE ADMIN — promote any registered user to owner
//   Body: { email, adminSecret }
//   adminSecret must match ADMIN_SECRET_KEY in .env
// ════════════════════════════════════════════════════════════
export const initializeAdmin = async (req, res) => {
    try {
        const { email, adminSecret } = req.body;

        if (!email || !adminSecret) {
            return res.status(400).json({ success: false, message: "email and adminSecret are required." });
        }

        // Verify secret
        if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ success: false, message: "Invalid admin secret." });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found: ${email}. Please register first, then call this endpoint.`
            });
        }

        user.role = "owner";
        user.isverified = true; // also verify the account
        await user.save();

        return res.status(200).json({
            success: true,
            message: `✅ ${user.firstname} (${user.email}) has been promoted to Owner!`,
            user: {
                id: user._id,
                name: `${user.firstname} ${user.lastname}`,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
