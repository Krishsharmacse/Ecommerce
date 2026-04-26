import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import session from "express-session";
import connectDB from "./database/db.js";
import userroute from "./routes/userroutes.js";
import authroute from "./routes/auth_routes.js";
import productroute from "./routes/product_routes.js";
import shoproute from "./routes/shop_routes.js";
import uploadroute from "./routes/upload_routes.js";
import { globalLimiter } from "./middleware/rate_limit.js";
import passport from "./middleware/passport.js";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8000;

// ─── Security Headers (helmet) ────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,  // Disable for API
}));

// ─── CORS ─────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Strip trailing slash if present for strict comparison
    const formattedOrigin = origin ? origin.replace(/\/$/, '') : null;

    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== "production") {
      // Allow requests with no origin (like mobile apps, curl, or server-side requests)
      if (!formattedOrigin) {
        callback(null, true);
      } else if (formattedOrigin.includes("localhost") || formattedOrigin.includes("127.0.0.1")) {
        callback(null, true);
      } else if (allowedOrigins.includes(formattedOrigin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS warning - Unrecognized origin in development: ${formattedOrigin}`);
        callback(null, true); // Allow in development
      }
    } else {
      // Production: strict CORS check
      if (!formattedOrigin || allowedOrigins.includes(formattedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS: Origin not allowed"));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Rate Limiting ────────────────────────────────────────
app.use(globalLimiter);

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ─── Session (needed by Passport internally) ─────────────
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.SECRET_KEY || "shopvault_session",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, maxAge: 10 * 60 * 1000 },
}));

// ─── Passport ──────────────────────────────────────
app.use(passport.initialize());

// ─── Trust Proxy (for rate-limiting by IP behind proxy) ──
app.set("trust proxy", 1);

// ─── Health Check ─────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ─── Routes ───────────────────────────────────────────────
app.use("/api/v1/user", userroute);
app.use("/api/v1/auth", authroute);      // OAuth + 2FA
app.use("/api/v1/product", productroute);
app.use("/api/v1/shop", shoproute);
app.use("/api/v1/upload", uploadroute);

// ─── Static Files (uploaded images) ──────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Internal server error."
      : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 ShopVault Backend running at http://localhost:${PORT}`);
    console.log(`🛡️  Helmet security headers: ENABLED`);
    console.log(`⚡ Rate limiting: ENABLED`);
    console.log(`🎯 RBAC Roles: user | shopkeeper | manager | owner`);
  });
};

startServer();
