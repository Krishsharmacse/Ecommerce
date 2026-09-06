import crypto from "node:crypto";

export function generateOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}