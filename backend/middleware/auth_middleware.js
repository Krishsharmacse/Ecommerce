import jwt from "jsonwebtoken";
import { User } from "../models/user_model.js";

export const isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !
            authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        const user = await User.findById(decoded.id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        req.user = user; 
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
};