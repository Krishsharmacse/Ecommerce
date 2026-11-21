import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken } from "../../lib/jwt.js";
import { hashToken } from "../../utils/hash.js";
import { addDays } from "../../utils/dates.js";
import { logger } from "../../lib/logger.js";
import { UserRole } from "@prisma/client";
import { sendEmail } from "../../services/mail.service.js";
import { welcomeGoogleTemplate, loginAlertTemplate } from "../../services/email-templates.service.js";

export const googleAuthRoutes = Router();

const GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const STATE_TTL_SECS     = 300; // 5 minutes

function getRedirectUri(req: Request): string {
  const host = req.get("host") ?? `localhost:${env.PORT}`;
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  if (isLocal) {
    return env.GOOGLE_REDIRECT_URI || `http://${host}${env.API_PREFIX}/auth/google/callback`;
  }

  // Running in production (Vercel):
  // Never return a localhost redirect URI when serving live production traffic
  if (env.GOOGLE_REDIRECT_URI && !env.GOOGLE_REDIRECT_URI.includes("localhost")) {
    return env.GOOGLE_REDIRECT_URI;
  }
  const protocol = req.protocol === "http" && !host.includes("vercel.app") ? "http" : "https";
  return `${protocol}://${host}${env.API_PREFIX}/auth/google/callback`;
}

// ─── 1. Initiate OAuth — redirect to Google with CSRF state ──────────────────
googleAuthRoutes.get("/google", (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) {
    res.status(500).json({ success: false, message: "Google OAuth is not configured" });
    return;
  }

  // Determine return frontend URL from explicit query param, referer header, or default
  const queryOrigin = typeof req.query.origin === "string" ? req.query.origin : null;
  const referer = req.get("referer");
  let targetFrontendUrl = env.FRONTEND_URL;
  if (queryOrigin && (queryOrigin.startsWith("http://") || queryOrigin.startsWith("https://"))) {
    try {
      targetFrontendUrl = new URL(queryOrigin).origin;
    } catch {}
  } else if (referer) {
    try {
      targetFrontendUrl = new URL(referer).origin;
    } catch {}
  }

  // Generate a cryptographically random state token and persist it in Redis with client origin
  const state       = crypto.randomBytes(24).toString("hex");
  const stateKey    = `oauth:state:${state}`;
  const statePayload = JSON.stringify({ targetFrontendUrl });
  redis.set(stateKey, statePayload, "EX", STATE_TTL_SECS).catch((err) =>
    logger.error({ err }, "google: failed to store OAuth state in Redis")
  );

  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// ─── 2. OAuth Callback ────────────────────────────────────────────────────────
googleAuthRoutes.get("/google/callback", async (req: Request, res: Response) => {
  const code  = req.query.code  as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  let targetFrontendUrl = env.FRONTEND_URL;
  if (state) {
    const stateKey    = `oauth:state:${state}`;
    const storedState = await redis.get(stateKey);
    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        if (parsed.targetFrontendUrl) targetFrontendUrl = parsed.targetFrontendUrl;
      } catch {}
      await redis.del(stateKey); // consume: one-time use
    } else {
      res.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
      return;
    }
  } else {
    res.redirect(`${env.FRONTEND_URL}/login?error=missing_state`);
    return;
  }

  // User cancelled
  if (error || !code) {
    res.redirect(`${targetFrontendUrl}/login?error=oauth_cancelled`);
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);

    // Exchange code for Google tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     env.GOOGLE_CLIENT_ID ?? "",
        client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      logger.error({ status: tokenRes.status, body: await tokenRes.text() }, "google: token exchange failed");
      res.redirect(`${env.FRONTEND_URL}/login?error=token_exchange_failed`);
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Fetch Google profile
    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      logger.error({ status: profileRes.status }, "google: profile fetch failed");
      res.redirect(`${env.FRONTEND_URL}/login?error=fetch_profile_failed`);
      return;
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      name?: string;
    };

    if (!profile.email) {
      res.redirect(`${env.FRONTEND_URL}/login?error=no_email`);
      return;
    }

    const email     = profile.email.toLowerCase();
    const firstName = profile.given_name ?? profile.name?.split(" ")[0] ?? "User";
    const lastName  = profile.family_name ?? profile.name?.split(" ").slice(1).join(" ") ?? "";

    // Upsert user in Postgres
    let user = await prisma.user.findUnique({ where: { email } });
    const isNewUser = !user;

    if (!user) {
      // Secure random placeholder — cannot be used to log in with password
      const oauthHash = crypto.randomBytes(32).toString("hex");
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash:    oauthHash,
          isEmailVerified: true,
          role:            UserRole.CUSTOMER,
          isActive:        true,
        },
      });
    } else if (!user.isEmailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data:  { isEmailVerified: true },
      });
    }

    // Send ShopVault notification email directly from shopvaultofficial4@gmail.com
    const emailTpl = isNewUser
      ? welcomeGoogleTemplate(user.firstName)
      : loginAlertTemplate(user.firstName, new Date());
    const emailSubject = isNewUser ? "Welcome to ShopVault! 🎉" : "New ShopVault sign-in detected";

    void sendEmail(user.email, emailSubject, emailTpl.text, emailTpl.html)
      .then(() => logger.info({ email: user.email, isNewUser }, "google: ShopVault notification email delivered"))
      .catch((err) => logger.error({ err, email: user.email }, "google: failed to send ShopVault email"));

    // Issue both access + refresh tokens (same flow as email login)
    const accessToken  = signAccessToken({ sub: user.id, role: user.role, type: "access" });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role, type: "refresh" });

    await prisma.refreshToken.create({
      data: {
        userId:    user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: addDays(new Date(), 30),
      },
    });

    logger.info({ userId: user.id, email }, "google: OAuth login successful");

    // Create a high-entropy, short-lived single-use ticket stored in Redis (60 seconds)
    // to prevent leaking JWTs in browser URL history or HTTP referer headers
    const ticket = crypto.randomBytes(32).toString("hex");
    const ticketPayload = JSON.stringify({
      accessToken,
      refreshToken,
      userId: user.id,
    });
    await redis.set(`oauth:ticket:${ticket}`, ticketPayload, "EX", 60);

    const params = new URLSearchParams({
      ticket,
      userId: user.id,
    });
    res.redirect(`${targetFrontendUrl}/auth/callback?${params.toString()}`);
  } catch (err) {
    logger.error({ err }, "google: OAuth callback error");
    res.redirect(`${targetFrontendUrl}/login?error=server_error`);
  }
});

// ─── 3. Single-Use OAuth Ticket Exchange ──────────────────────────────────────
googleAuthRoutes.post("/oauth/exchange", async (req: Request, res: Response) => {
  const { ticket } = (req.body ?? {}) as { ticket?: string };
  if (!ticket || typeof ticket !== "string") {
    res.status(400).json({ success: false, message: "OAuth ticket is required" });
    return;
  }
  const ticketKey = `oauth:ticket:${ticket}`;
  const data = await redis.get(ticketKey);
  if (!data) {
    res.status(400).json({ success: false, message: "Invalid, expired, or already consumed OAuth ticket" });
    return;
  }
  // Grace expiry prevents race condition with React StrictMode double invocation
  await redis.expire(ticketKey, 10);

  try {
    const payload = JSON.parse(data) as { accessToken: string; refreshToken: string; userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
      },
    });

    res.json({
      success: true,
      token: payload.accessToken,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      userId: payload.userId,
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            firstname: user.firstName,
            lastname: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isverified: user.isEmailVerified,
          }
        : undefined,
    });
  } catch {
    res.status(500).json({ success: false, message: "Corrupted ticket payload" });
  }
});
