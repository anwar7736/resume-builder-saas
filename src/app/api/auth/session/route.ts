import { NextRequest, NextResponse } from "next/server";
import { createUserSession, userCookieName } from "@/lib/admin-session";
import { findUserByEmail } from "@/lib/resume-store";
import { normalizeEmail, verifyPassword } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || !("email" in payload) ||
      !("password" in payload) || typeof payload.email !== "string" || typeof payload.password !== "string") {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (payload.email.length > 254 || payload.password.length > 128) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }
  try {
    const user = await findUserByEmail(normalizeEmail(payload.email));
    if (!user || !await verifyPassword(payload.password, user.passwordSalt, user.passwordHash)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(userCookieName, createUserSession(user._id.toHexString()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Unable to sign in.", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(userCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
