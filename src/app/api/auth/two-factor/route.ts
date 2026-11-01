import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";
import {
  consumeTwoFactorAttempt,
  consumeUserTwoFactorCounter,
  disableUserTwoFactor,
  enableUserTwoFactor,
  findUserCredentialsById,
  getUserTwoFactorState,
  setUserTwoFactorPendingSecret,
} from "@/lib/resume-store";
import { verifyPassword } from "@/lib/user-auth";
import { createOtpAuthUri, generateTotpSecret, verifyTotpCode } from "@/lib/two-factor.server";

async function readPayload(request: NextRequest) {
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 2000) throw new Error("Request is too large.");
  return JSON.parse(body) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function verifyUserPassword(userId: string, password: unknown) {
  if (typeof password !== "string" || password.length > 128) return null;
  const user = await findUserCredentialsById(userId);
  if (!user || !await verifyPassword(password, user.passwordSalt, user.passwordHash)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to manage two-factor authentication." }, { status: 401 });
  try {
    const state = await getUserTwoFactorState(userId);
    return state
      ? NextResponse.json({ enabled: state.enabled }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "Account not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to read user two-factor settings.", error);
    return NextResponse.json({ error: "Unable to load two-factor settings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to manage two-factor authentication." }, { status: 401 });
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
    const state = await getUserTwoFactorState(userId);
    if (!state) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (payload.action === "setup") {
      const user = await verifyUserPassword(userId, payload.password);
      if (!user) return NextResponse.json({ error: "Enter your current password to continue." }, { status: 403 });
      if (state.enabled) return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
      const secret = generateTotpSecret();
      const otpAuthUrl = createOtpAuthUri(user.email, secret, "ResumeCraft AI");
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
      });
      await setUserTwoFactorPendingSecret(userId, secret);
      return NextResponse.json({ secret, otpAuthUrl, qrCodeDataUrl }, { headers: { "Cache-Control": "no-store" } });
    }

    if (payload.action === "enable") {
      if (state.enabled) return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
      if (typeof payload.code !== "string" || !state.pendingSecret) {
        return NextResponse.json({ error: "Start setup again and enter the authenticator code." }, { status: 400 });
      }
      if (!await consumeTwoFactorAttempt(`user:${userId}:setup`)) {
        return NextResponse.json({ error: "Too many authenticator attempts. Try again in 15 minutes." }, { status: 429 });
      }
      const counter = verifyTotpCode(state.pendingSecret, payload.code);
      if (counter === null) return NextResponse.json({ error: "Enter the current 6-digit authenticator code." }, { status: 400 });
      if (!await enableUserTwoFactor(userId, state.pendingSecret, counter)) {
        return NextResponse.json({ error: "Unable to enable two-factor authentication." }, { status: 500 });
      }
      return NextResponse.json({ success: true, enabled: true });
    }

    if (payload.action === "disable") {
      const user = await verifyUserPassword(userId, payload.password);
      if (!user) return NextResponse.json({ error: "Enter your current password to continue." }, { status: 403 });
      if (!state.enabled || !state.secret || typeof payload.code !== "string") {
        return NextResponse.json({ error: "Two-factor authentication is not enabled or the code is missing." }, { status: 400 });
      }
      if (!await consumeTwoFactorAttempt(`user:${userId}`)) {
        return NextResponse.json({ error: "Too many authenticator attempts. Try again in 15 minutes." }, { status: 429 });
      }
      const counter = verifyTotpCode(state.secret, payload.code);
      if (counter === null || (state.lastCounter !== undefined && counter <= state.lastCounter) ||
          !await consumeUserTwoFactorCounter(userId, counter)) {
        return NextResponse.json({ error: "Enter a valid, unused authenticator code." }, { status: 400 });
      }
      await disableUserTwoFactor(userId);
      return NextResponse.json({ success: true, enabled: false });
    }
    return NextResponse.json({ error: "Choose a valid two-factor action." }, { status: 400 });
  } catch (error) {
    console.error("Unable to update user two-factor settings.", error);
    return NextResponse.json({ error: "Unable to update two-factor settings." }, { status: 500 });
  }
}
