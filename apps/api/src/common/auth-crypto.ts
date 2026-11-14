import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, { N: 16_384, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = (await deriveKey(password, passwordSalt)).toString("hex");
  return { passwordSalt, passwordHash };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const calculated = await deriveKey(password, salt);
  const stored = Buffer.from(hash, "hex");
  return stored.length === calculated.length && timingSafeEqual(stored, calculated);
}

export function verifyConfiguredAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  const supplied = createHmac("sha256", "resume-admin-password").update(password).digest();
  const expected = createHmac("sha256", "resume-admin-password").update(configured).digest();
  return timingSafeEqual(supplied, expected);
}

function sessionSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET or ADMIN_SESSION_SECRET must contain at least 32 characters.");
  return secret;
}

function createSignedToken(payload: Record<string, string | number>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readSignedToken(token: string | undefined) {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object" || !("expiresAt" in payload) ||
        typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createUserSession(userId: string) {
  return createSignedToken({ userId, expiresAt: Date.now() + 30 * 24 * 60 * 60_000 });
}

export function getUserIdFromSession(token: string | undefined) {
  const payload = readSignedToken(token);
  return payload && "userId" in payload && typeof payload.userId === "string" ? payload.userId : null;
}

export function createAdminSession() {
  return createSignedToken({ expiresAt: Date.now() + 8 * 60 * 60_000 });
}

export function isValidAdminSession(token: string | undefined) {
  return readSignedToken(token) !== null;
}

export function verifyAdminCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL;
  return Boolean(configuredEmail &&
    email.trim().toLowerCase() === configuredEmail.trim().toLowerCase() &&
    verifyConfiguredAdminPassword(password));
}

export function sessionDurationSeconds() {
  return 8 * 60 * 60;
}

function encryptionKey() {
  return createHash("sha256").update(sessionSecret()).digest();
}

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpPeriodSeconds = 30;

function encodeBase32(value: Buffer) {
  let bits = 0;
  let buffer = 0;
  let encoded = "";
  for (const byte of value) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += base32Alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) encoded += base32Alphabet[(buffer << (5 - bits)) & 31];
  return encoded;
}

function decodeBase32(value: string) {
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/g, "")) {
    const digit = base32Alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid authenticator secret.");
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function createOtpAuthUri(accountName: string, secret: string, issuer: string) {
  const parameters = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: String(totpPeriodSeconds),
  });
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${accountName}`)}?${parameters.toString()}`;
}

function generateTotp(secret: string, counter: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(now / 1000 / totpPeriodSeconds);
  for (const candidate of [counter - 1, counter, counter + 1]) {
    if (candidate < 0) continue;
    const expected = Buffer.from(generateTotp(secret, candidate));
    const supplied = Buffer.from(code);
    if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) return candidate;
  }
  return null;
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [version, encodedIv, encodedTag, encodedData] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedData) {
    throw new Error("The stored encrypted secret has an unsupported format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedData, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
