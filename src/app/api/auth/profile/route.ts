import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";
import { findUserCredentialsById, updateUserProfile } from "@/lib/resume-store";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/user-auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validNameAndEmail(name: string, email: string) {
  return name.length >= 2 && name.length <= 100 && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  let payload: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 4000) {
      return NextResponse.json({ error: "Profile update is too large." }, { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Submit valid profile details." }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.name !== "string" ||
      typeof payload.email !== "string" || typeof payload.currentPassword !== "string" ||
      payload.currentPassword.length === 0 || payload.currentPassword.length > 128 ||
      (payload.newPassword !== undefined && typeof payload.newPassword !== "string") ||
      (payload.confirmPassword !== undefined && typeof payload.confirmPassword !== "string")) {
    return NextResponse.json({ error: "Enter your name, email, and current password." }, { status: 400 });
  }

  const newPassword = payload.newPassword ?? "";
  const confirmPassword = payload.confirmPassword ?? "";
  if (newPassword.length > 0 && (newPassword.length < 8 || newPassword.length > 128)) {
    return NextResponse.json({
      error: "New password must be between 8 and 128 characters.",
      code: "invalid_new_password",
    }, { status: 400 });
  }
  if ((newPassword.length > 0 || confirmPassword.length > 0) && newPassword !== confirmPassword) {
    return NextResponse.json({
      error: "New password and confirmation do not match.",
      code: "password_mismatch",
    }, { status: 400 });
  }

  const name = payload.name.trim();
  const email = normalizeEmail(payload.email);
  if (!validNameAndEmail(name, email)) {
    return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
  }

  try {
    const user = await findUserCredentialsById(userId);
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (!await verifyPassword(payload.currentPassword, user.passwordSalt, user.passwordHash)) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 });
    }

    const credentials = newPassword ? await hashPassword(newPassword) : {};
    const updated = await updateUserProfile(userId, { name, email, ...credentials });
    return updated
      ? NextResponse.json({ success: true, profile: { name, email } })
      : NextResponse.json({ error: "Account not found." }, { status: 404 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Unable to update user profile.", error);
    return NextResponse.json({ error: "Unable to update your profile." }, { status: 500 });
  }
}
