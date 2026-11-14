import { randomBytes } from "node:crypto";

export function newId() {
  return randomBytes(12).toString("hex");
}

export function isDocumentId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function safeFilename(filename: string, fallback = "file") {
  const basename = filename.split(/[\\/]/).pop() ?? fallback;
  return basename.replace(/[^\w.-]/g, "_").slice(-150) || fallback;
}

export function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
