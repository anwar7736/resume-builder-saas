import { NextRequest, NextResponse } from "next/server";
import { createUserSession, userCookieName } from "@/lib/admin-session";
import { createUser } from "@/lib/resume-store";
import { hashPassword, normalizeEmail } from "@/lib/user-auth";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || !("name" in payload) || !("email" in payload) ||
      !("password" in payload) || typeof payload.name !== "string" ||
      typeof payload.email !== "string" || typeof payload.password !== "string") {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }
  const name = payload.name.trim();
  const email = normalizeEmail(payload.email);
  const password = payload.password;
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Enter a valid name and email. Passwords must be 8 to 128 characters." }, { status: 400 });
  }
  try {
    const credentials = await hashPassword(password);
    const user = await createUser({ name, email, ...credentials });
    const response = NextResponse.json({ success: true });
    response.cookies.set(userCookieName, createUserSession(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Unable to create user account.", error);
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 });
  }
}
