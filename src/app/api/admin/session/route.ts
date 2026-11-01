import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieName,
  adminIsConfigured,
  adminSessionDuration,
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-session";
import {
  consumeAdminTwoFactorCounter,
  consumeTwoFactorAttempt,
  getAdminTwoFactorState,
} from "@/lib/resume-store";
import { verifyTotpCode } from "@/lib/two-factor.server";

export async function POST(request: NextRequest) {
  if (!adminIsConfigured()) {
    return NextResponse.json({ error: "Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, MongoDB, and a session secret." }, { status: 503 });
  }
  let email: unknown;
  let password: unknown;
  let totpCode: unknown;
  try {
    const payload: unknown = await request.json();
    if (typeof payload === "object" && payload !== null) {
      email = "email" in payload ? payload.email : undefined;
      password = "password" in payload ? payload.password : undefined;
      totpCode = "totpCode" in payload ? payload.totpCode : undefined;
    }
  } catch {
    return NextResponse.json({ error: "Enter your admin email and password." }, { status: 400 });
  }
  if (typeof email !== "string" || typeof password !== "string" || !verifyAdminCredentials(email, password)) {
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  }
  if (totpCode !== undefined && (typeof totpCode !== "string" || totpCode.length > 6)) {
    return NextResponse.json({ error: "Enter a valid authenticator code." }, { status: 400 });
  }
  try {
    const twoFactor = await getAdminTwoFactorState();
    if (twoFactor.enabled) {
      if (!totpCode) return NextResponse.json({ requiresTwoFactor: true });
      if (!await consumeTwoFactorAttempt("admin")) {
        return NextResponse.json({ error: "Too many authenticator attempts. Try again in 15 minutes." }, { status: 429 });
      }
      const counter = twoFactor.secret ? verifyTotpCode(twoFactor.secret, totpCode) : null;
      if (counter === null || (twoFactor.lastCounter !== undefined && counter <= twoFactor.lastCounter) ||
          !await consumeAdminTwoFactorCounter(counter)) {
        return NextResponse.json({
          error: "Enter a valid, unused authenticator code.",
          code: "invalid_two_factor",
        }, { status: 401 });
      }
    }
  } catch (error) {
    console.error("Unable to verify admin two-factor authentication.", error);
    return NextResponse.json({ error: "Unable to verify the authenticator code." }, { status: 500 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: adminSessionDuration,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
