import { NextRequest, NextResponse } from "next/server";
import {
  consumePasswordResetOtp,
  consumePasswordResetRateLimit,
  findUserByEmail,
  updateUserPassword,
} from "@/lib/resume-store";
import { hashPassword, normalizeEmail } from "@/lib/user-auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 3000) {
      return NextResponse.json({ error: "The request is too large." }, { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Enter the code and a new password.", field: "otp" }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.email !== "string" ||
      typeof payload.otp !== "string" || typeof payload.password !== "string") {
    return NextResponse.json({ error: "Enter the code and a new password.", field: "otp" }, { status: 400 });
  }

  const email = normalizeEmail(payload.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(payload.otp)) {
    return NextResponse.json({ error: "Enter the 6-digit code from your email.", field: "otp" }, { status: 400 });
  }
  if (payload.password.length < 8 || payload.password.length > 128) {
    return NextResponse.json(
      { error: "Password must be between 8 and 128 characters.", field: "password" },
      { status: 400 },
    );
  }

  const ipAddress = request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  try {
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumePasswordResetRateLimit(`confirm-ip:${ipAddress}`, 10),
      consumePasswordResetRateLimit(`confirm-email:${email}`, 10),
    ]);
    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in 15 minutes.", field: "otp" },
        { status: 429 },
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !await consumePasswordResetOtp(user._id.toHexString(), payload.otp)) {
      return NextResponse.json(
        { error: "The code is incorrect or expired. Request a new code and try again.", field: "otp" },
        { status: 400 },
      );
    }
    const credentials = await hashPassword(payload.password);
    if (!await updateUserPassword(user._id.toHexString(), credentials.passwordHash, credentials.passwordSalt)) {
      return NextResponse.json({ error: "Account not found.", field: "email" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to reset account password.", error);
    return NextResponse.json({ error: "Unable to reset your password right now." }, { status: 500 });
  }
}
