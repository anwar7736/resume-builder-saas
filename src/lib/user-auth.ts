import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";
import { findUserById, type UserAccount } from "@/lib/resume-store";

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, { N: 16384, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(password, salt);
  return { passwordSalt: salt, passwordHash: hash.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const calculated = await deriveKey(password, salt);
  const stored = Buffer.from(hash, "hex");
  return stored.length === calculated.length && timingSafeEqual(stored, calculated);
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  await connection();
  const cookieStore = await cookies();
  const userId = getUserIdFromSession(cookieStore.get(userCookieName)?.value);
  return userId ? findUserById(userId) : null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
