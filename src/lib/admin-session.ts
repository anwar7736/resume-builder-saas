import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "resumecraft_admin";
export const userCookieName = "resumecraft_user";
export const adminSessionDuration = 8 * 60 * 60;

function sessionSecret() {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) return process.env.AUTH_SECRET;
  if (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32) return process.env.ADMIN_SESSION_SECRET;
  return null;
}

export function adminIsConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && sessionSecret() && process.env.MONGODB_URI);
}

export function verifyAdminCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL;
  if (!configuredEmail || email.trim().toLowerCase() !== configuredEmail.trim().toLowerCase()) return false;
  return verifyAdminPassword(password);
}

export function verifyAdminPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;
  const suppliedHash = createHmac("sha256", "resume-admin-password").update(password).digest();
  const configuredHash = createHmac("sha256", "resume-admin-password").update(configuredPassword).digest();
  return timingSafeEqual(suppliedHash, configuredHash);
}

export function createAdminSession() {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + adminSessionDuration * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function createUserSession(userId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function getUserIdFromSession(token: string | undefined) {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const suppliedSignature = Buffer.from(signature, "base64url");
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data !== "object" || data === null || !("userId" in data) ||
        typeof data.userId !== "string" || !("expiresAt" in data) ||
        typeof data.expiresAt !== "number" || data.expiresAt <= Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export function isValidAdminSession(token: string | undefined) {
  const secret = sessionSecret();
  if (!secret || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
    return false;
  }
  try {
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data === "object" && data !== null && "expiresAt" in data &&
      typeof data.expiresAt === "number" && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}
