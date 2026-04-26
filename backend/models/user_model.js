import mongoose from "mongoose";

const userschema = new mongoose.Schema({
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    profilePIC: { type: String, default: "" },
    profilePICpublicId: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: false },  // not required for OAuth-only accounts

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OAuth
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    googleId: { type: String, default: null, index: true, sparse: true },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4-Tier RBAC: user → shopkeeper → manager → owner
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    role: {
        type: String,
        // "admin" kept for backward compat — maps to "owner" in middleware
        enum: ["user", "shopkeeper", "manager", "owner", "admin"],
        default: "user"
    },

    // Manager/Vendor specific fields
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        default: null
    },
    isManagerApproved: { type: Boolean, default: false },
    managerRequestedAt: { type: Date, default: null },
    managerApprovedAt: { type: Date, default: null },
    managerApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Shopkeeper specific fields
    isShopkeeperApproved: { type: Boolean, default: false }, // Manager must approve shopkeepers
    shopkeeperApprovedAt: { type: Date, default: null },
    shopkeeperApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Auth
    token: { type: String, default: null },
    isverified: { type: Boolean, default: false },
    isLoggedin: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },

    // Security
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIP: { type: String, default: null },

    // Profile
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    zipcode: { type: String, trim: true },
    phoneno: { type: String, trim: true },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Two-Factor Authentication (TOTP)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null, select: false },       // active TOTP secret
    twoFactorTempSecret: { type: String, default: null, select: false },    // pending setup secret
    twoFactorBackupCodes: { type: [String], default: [], select: false },   // 8 one-time backup codes

}, { timestamps: true });

// Virtual: is account locked?
userschema.virtual("isLocked").get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Index for faster queries
userschema.index({ role: 1 });
userschema.index({ shopId: 1 });

export const User = mongoose.model("User", userschema);