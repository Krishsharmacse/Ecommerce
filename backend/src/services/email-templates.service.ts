/**
 * ShopVault Email Templates
 * All transactional email HTML templates
 */

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #0a0a0a;
  color: #f4f4f5;
  margin: 0; padding: 0;
`;

const wrapperStyle = `
  max-width: 560px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const cardStyle = `
  background: #141414;
  border: 1px solid #27272a;
  border-radius: 12px;
  overflow: hidden;
`;

const headerStyle = `
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  padding: 28px 32px;
  text-align: center;
`;

const bodyStyle = `
  padding: 32px;
`;

const codeBoxStyle = `
  background: #0a0a0a;
  border: 1px solid #3b82f6;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  margin: 24px 0;
  letter-spacing: 0.25em;
  font-size: 36px;
  font-weight: 800;
  color: #60a5fa;
  font-family: 'Courier New', monospace;
`;

const footerStyle = `
  text-align: center;
  padding: 20px 32px 28px;
  border-top: 1px solid #27272a;
  color: #71717a;
  font-size: 12px;
  line-height: 1.6;
`;

const btnStyle = `
  display: inline-block;
  background: #2563eb;
  color: #ffffff;
  text-decoration: none;
  padding: 13px 28px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 15px;
  margin-top: 8px;
`;

function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="${baseStyle}">
  <div style="${wrapperStyle}">
    <div style="${cardStyle}">
      <div style="${headerStyle}">
        <div style="font-size:28px;font-weight:900;letter-spacing:-0.04em;color:#ffffff;">
          <span style="color:#93c5fd;">Shop</span>Vault
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">
          Secure Multi-Vendor Marketplace
        </div>
      </div>
      <div style="${bodyStyle}">
        ${content}
      </div>
      <div style="${footerStyle}">
        <p>ShopVault &nbsp;|&nbsp; Secure Marketplace&nbsp;&nbsp;·&nbsp;&nbsp;This is an automated message, do not reply.</p>
        <p style="margin-top:6px;">If you did not request this email, you can safely ignore it.</p>
      </div>
    </div>
    <p style="text-align:center;margin-top:20px;font-size:11px;color:#52525b;">
      © ${new Date().getFullYear()} ShopVault. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

// ─── Registration / Email Verification ────────────────────────────────────────
export function emailVerificationTemplate(firstName: string, code: string): { text: string; html: string } {
  const text = `Hi ${firstName},

Welcome to ShopVault! Your email verification code is:

${code}

This code expires in 15 minutes. If you did not create an account, please ignore this email.

— The ShopVault Team`;

  const html = layout("Verify Your Email — ShopVault", `
    <h1 style="font-size:22px;font-weight:700;color:#f4f4f5;margin:0 0 8px;">Welcome to ShopVault! 👋</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 4px;">
      Hi <strong style="color:#f4f4f5;">${firstName}</strong>, thanks for joining us.
      Enter this verification code to activate your account:
    </p>
    <div style="${codeBoxStyle}">${code}</div>
    <p style="color:#71717a;font-size:13px;text-align:center;margin:0;">
      ⏱ This code expires in <strong style="color:#a1a1aa;">15 minutes</strong>.
    </p>
  `);

  return { text, html };
}

// ─── OTP / Resend Verification ─────────────────────────────────────────────
export function resendVerificationTemplate(firstName: string, code: string): { text: string; html: string } {
  return emailVerificationTemplate(firstName, code);
}

// ─── Password Reset ──────────────────────────────────────────────────────────
export function passwordResetTemplate(firstName: string, code: string): { text: string; html: string } {
  const text = `Hi ${firstName},

We received a request to reset your ShopVault password. Your reset code is:

${code}

This code expires in 15 minutes. If you did not request a password reset, please ignore this email and your password will remain unchanged.

— The ShopVault Team`;

  const html = layout("Reset Your Password — ShopVault", `
    <h1 style="font-size:22px;font-weight:700;color:#f4f4f5;margin:0 0 8px;">Password Reset Request</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 4px;">
      Hi <strong style="color:#f4f4f5;">${firstName}</strong>, we received a request to reset your password.
      Use the code below:
    </p>
    <div style="${codeBoxStyle}">${code}</div>
    <p style="color:#71717a;font-size:13px;text-align:center;margin:0 0 16px;">
      ⏱ This code expires in <strong style="color:#a1a1aa;">15 minutes</strong>.
    </p>
    <p style="color:#71717a;font-size:13px;line-height:1.6;border-top:1px solid #27272a;padding-top:16px;margin:0;">
      🔒 If you did not request this reset, your account is safe — simply ignore this email.
      Your password will not change unless you complete this process.
    </p>
  `);

  return { text, html };
}

// ─── Login Alert ─────────────────────────────────────────────────────────────
export function loginAlertTemplate(firstName: string, timestamp: Date): { text: string; html: string } {
  const timeStr = timestamp.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = `Hi ${firstName},

Your ShopVault account was just used to sign in at ${timeStr} IST.

If this was you, no action is needed.
If this was NOT you, please reset your password immediately at https://shopvault.com/forgot-password

— The ShopVault Security Team`;

  const html = layout("New Sign-In Detected — ShopVault", `
    <h1 style="font-size:22px;font-weight:700;color:#f4f4f5;margin:0 0 8px;">New Sign-In Detected</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong style="color:#f4f4f5;">${firstName}</strong>, your ShopVault account was signed into.
    </p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Sign-In Details</div>
      <div style="color:#f4f4f5;font-size:14px;">🕐 Time: <strong>${timeStr} IST</strong></div>
    </div>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px;">
      If this was you, no action is needed. If this was NOT you, please secure your account immediately:
    </p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password" style="${btnStyle}">
        Secure My Account
      </a>
    </div>
  `);

  return { text, html };
}

// ─── Order Confirmation ───────────────────────────────────────────────────────
export function orderConfirmationTemplate(firstName: string, orderId: string, total: number): { text: string; html: string } {
  const text = `Hi ${firstName},

Your ShopVault order #${orderId.slice(0, 8).toUpperCase()} has been confirmed!

Order Total: ₹${total.toFixed(2)}

You can track your order in your account dashboard.

— The ShopVault Team`;

  const html = layout("Order Confirmed — ShopVault", `
    <h1 style="font-size:22px;font-weight:700;color:#f4f4f5;margin:0 0 8px;">Order Confirmed! 🎉</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong style="color:#f4f4f5;">${firstName}</strong>, your order has been placed successfully.
    </p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Order Summary</div>
      <div style="color:#f4f4f5;font-size:14px;margin-bottom:6px;">🔖 Order ID: <strong style="font-family:monospace;">#${orderId.slice(0, 8).toUpperCase()}</strong></div>
      <div style="color:#f4f4f5;font-size:14px;">💰 Total: <strong style="color:#60a5fa;">₹${total.toFixed(2)}</strong></div>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/customer" style="${btnStyle}">
        Track My Order
      </a>
    </div>
  `);

  return { text, html };
}

// ─── Welcome Email for Google OAuth / First Time Sign-in ─────────────────────
export function welcomeGoogleTemplate(firstName: string): { text: string; html: string } {
  const text = `Hi ${firstName},

Welcome to ShopVault! Your account has been created successfully via Google Sign-In.

You can now explore thousands of curated products, set up your shop, and track orders in real-time.

— The ShopVault Team`;

  const html = layout("Welcome to ShopVault! 🎉", `
    <h1 style="font-size:22px;font-weight:700;color:#f4f4f5;margin:0 0 8px;">Welcome to ShopVault! 🎉</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong style="color:#f4f4f5;">${firstName}</strong>, your account is now ready.
    </p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="color:#f4f4f5;font-size:14px;line-height:1.8;">
        ✦ <strong>Browse & Purchase:</strong> Discover verified tech, lifestyle, and fashion drops.<br />
        ✦ <strong>Escrow Protection:</strong> 100% payment safety on every transaction.<br />
        ✦ <strong>Open a Store:</strong> Apply for vendor status to open your storefront anytime.
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/shop" style="${btnStyle}">
        Explore Marketplace
      </a>
    </div>
  `);

  return { text, html };
}

// ─── Password Changed Confirmation ──────────────────────────────────────────
export function passwordChangedTemplate(firstName: string): { text: string; html: string } {
  const text = `Hi ${firstName},

Your ShopVault account password was successfully updated.

If you performed this change, you can safely disregard this email.
If you did NOT make this change, please contact us or reset your password immediately at ${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password.

— The ShopVault Security Team`;

  const html = layout("Password Changed Successfully — ShopVault", `
    <h1 style="font-size:22px;font-weight:700;color:#f4f4f5;margin:0 0 8px;">Password Updated</h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi <strong style="color:#f4f4f5;">${firstName}</strong>, your ShopVault account password has just been changed successfully.
    </p>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="color:#34d399;font-size:14px;font-weight:600;">✓ Security Notice</div>
      <div style="color:#a1a1aa;font-size:13px;margin-top:6px;line-height:1.6;">
        All existing sessions have been terminated for security. You can now log in with your new password.
      </div>
    </div>
    <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0 0 20px;">
      If you did not make this change, your account may be compromised. Please secure it immediately.
    </p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="${btnStyle}">
        Sign In to ShopVault
      </a>
    </div>
  `);

  return { text, html };
}
