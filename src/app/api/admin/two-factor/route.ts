import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieName,
  isValidAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-session";
import {
  consumeAdminTwoFactorCounter,
  consumeTwoFactorAttempt,
  disableAdminTwoFactor,
  enableAdminTwoFactor,
  getAdminTwoFactorState,
  setAdminTwoFactorPendingSecret,
} from "@/lib/resume-store";
import { createOtpAuthUri, generateTotpSecret, verifyTotpCode } from "@/lib/two-factor.server";

async function readPayload(request: NextRequest) {
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 2000) throw new Error("Request is too large.");
  return JSON.parse(body) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const state = await getAdminTwoFactorState();
    return NextResponse.json({ enabled: state.enabled }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to read admin two-factor settings.", error);
    return NextResponse.json({ error: "Unable to load two-factor settings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await readPayload(request);
  } catch {
    return NextResponse.json({ error: "Submit valid two-factor settings." }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Choose a valid two-factor action." }, { status: 400 });
  }

  try {
    const state = await getAdminTwoFactorState();
    if (payload.action === "setup") {
      if (typeof payload.password !== "string" || payload.password.length > 128 ||
          !verifyAdminPassword(payload.password)) {
        return NextResponse.json({ error: "Enter the current admin password to continue." }, { status: 403 });
      }
      if (state.enabled) return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
      const email = process.env.ADMIN_EMAIL?.trim();
      if (!email) return NextResponse.json({ error: "Admin email is not configured." }, { status: 503 });
      const secret = generateTotpSecret();
      const otpAuthUrl = createOtpAuthUri(email, secret, "ResumeCraft AI Admin");
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
      });
      await setAdminTwoFactorPendingSecret(secret);
      return NextResponse.json({ secret, otpAuthUrl, qrCodeDataUrl }, { headers: { "Cache-Control": "no-store" } });
    }

    if (payload.action === "enable") {
      if (state.enabled) return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
      if (typeof payload.code !== "string" || !state.pendingSecret) {
        return NextResponse.json({ error: "Start setup again and enter the authenticator code." }, { status: 400 });
      }
      if (!await consumeTwoFactorAttempt("admin:setup")) {
        return NextResponse.json({ error: "Too many authenticator attempts. Try again in 15 minutes." }, { status: 429 });
      }
      const counter = verifyTotpCode(state.pendingSecret, payload.code);
      if (counter === null) return NextResponse.json({ error: "Enter the current 6-digit authenticator code." }, { status: 400 });
      await enableAdminTwoFactor(state.pendingSecret, counter);
      return NextResponse.json({ success: true, enabled: true });
    }

    if (payload.action === "disable") {
      if (typeof payload.password !== "string" || payload.password.length > 128 ||
          !verifyAdminPassword(payload.password)) {
        return NextResponse.json({ error: "Enter the current admin password to continue." }, { status: 403 });
      }
      if (!state.enabled || !state.secret || typeof payload.code !== "string") {
        return NextResponse.json({ error: "Two-factor authentication is not enabled or the code is missing." }, { status: 400 });
      }
      if (!await consumeTwoFactorAttempt("admin")) {
        return NextResponse.json({ error: "Too many authenticator attempts. Try again in 15 minutes." }, { status: 429 });
      }
      const counter = verifyTotpCode(state.secret, payload.code);
      if (counter === null || (state.lastCounter !== undefined && counter <= state.lastCounter) ||
          !await consumeAdminTwoFactorCounter(counter)) {
        return NextResponse.json({ error: "Enter a valid, unused authenticator code." }, { status: 400 });
      }
      await disableAdminTwoFactor();
      return NextResponse.json({ success: true, enabled: false });
    }
    return NextResponse.json({ error: "Choose a valid two-factor action." }, { status: 400 });
  } catch (error) {
    console.error("Unable to update admin two-factor settings.", error);
    return NextResponse.json({ error: "Unable to update two-factor settings." }, { status: 500 });
  }
}
