import jwt from "jsonwebtoken";
import { User } from "../models/user_model.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH: Verify JWT and attach user to request
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Authentication required. Please login." });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ success: false, message: "Session expired. Please login again." });
            }
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        const user = await User.findById(decoded.id)
            .select("-password -otp -resetToken -otpExpiry -resetTokenExpiry")
            .populate("shopId", "name status isActive category logo");

        if (!user) return res.status(401).json({ success: false, message: "Account not found." });

        // Account lockout check
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(403).json({
                success: false,
                message: `Account temporarily locked. Try again after ${new Date(user.lockUntil).toLocaleTimeString()}`
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed." });
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROLE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const isOwnerRole = (r) => r === "owner" || r === "admin";
const isManagerRole = (r) => r === "manager" || isOwnerRole(r);
const isShopkeeperRole = (r) => r === "shopkeeper" || isManagerRole(r);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROLE: Owner (super admin)
//   Powers: everything
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const isOwner = (req, res, next) => {
    if (isOwnerRole(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: "Access denied. Owner privileges required." });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROLE: Manager or Owner
//   Powers: manage their vendors, approve shopkeepers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const isManager = (req, res, next) => {
    if (isManagerRole(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: "Access denied. Manager privileges required." });
};

// Approved manager (owner approved them) or Owner
export const isApprovedManager = (req, res, next) => {
    const { role, isManagerApproved } = req.user || {};
    if (isOwnerRole(role)) return next();
    if (role === "manager" && isManagerApproved) return next();
    return res.status(403).json({
        success: false,
        message: role === "manager"
            ? "Your manager account is pending approval by the owner."
            : "Access denied. Approved manager or owner required."
    });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROLE: Shopkeeper  ← NEW
//   Powers (own shop only):
//     • Add / edit / delete their products
//     • View their shop revenue & orders
//     • Toggle shop live / offline (isActive)
//   Granted by: manager OR owner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const isShopkeeper = (req, res, next) => {
    if (isShopkeeperRole(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: "Access denied. Shopkeeper privileges required." });
};

// Approved shopkeeper OR manager OR owner
export const isApprovedShopkeeper = (req, res, next) => {
    const { role, isShopkeeperApproved } = req.user || {};
    if (isManagerRole(role)) return next();          // managers/owners bypass approval
    if (role === "shopkeeper" && isShopkeeperApproved) return next();
    return res.status(403).json({
        success: false,
        message: role === "shopkeeper"
            ? "Your shopkeeper account is pending approval by the manager."
            : "Access denied. Approved shopkeeper, manager, or owner required."
    });
};

// Owner or approved Manager
export const isOwnerOrApprovedManager = (req, res, next) => {
    const { role, isManagerApproved } = req.user || {};
    if (isOwnerRole(role)) return next();
    if (role === "manager" && isManagerApproved) return next();
    return res.status(403).json({ success: false, message: "Access denied. Owner or approved manager required." });
};

// Shopkeeper who belongs to a specific shop (or manager/owner)
export const isShopkeeperOfShop = (req, res, next) => {
    const { role, shopId, isShopkeeperApproved } = req.user || {};

    // Owner/manager always pass
    if (isManagerRole(role)) return next();

    // Shopkeeper must be approved AND must belong to the requested shop
    const requestedShopId = req.params.shopId || req.body.shopId;
    if (
        role === "shopkeeper" &&
        isShopkeeperApproved &&
        shopId &&
        requestedShopId &&
        shopId.toString() === requestedShopId.toString()
    ) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Access denied. You don't belong to this shop."
    });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOP OWNERSHIP: Manager owns this shop OR Owner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const isShopOwner = (req, res, next) => {
    const { role, shopId } = req.user || {};
    if (isOwnerRole(role)) return next();

    const requestedShopId = req.params.shopId || req.body.shopId;
    if (shopId && requestedShopId && shopId.toString() === requestedShopId.toString()) {
        return next();
    }

    return res.status(403).json({ success: false, message: "Access denied. You don't own this shop." });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGACY: isAdmin → isOwner (backward compat)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const isAdmin = isOwner;