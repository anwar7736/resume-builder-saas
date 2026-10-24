import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieName,
  adminIsConfigured,
  adminSessionDuration,
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  if (!adminIsConfigured()) {
    return NextResponse.json({ error: "Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, MongoDB, and a session secret." }, { status: 503 });
  }
  let email: unknown;
  let password: unknown;
  try {
    const payload: unknown = await request.json();
    if (typeof payload === "object" && payload !== null) {
      email = "email" in payload ? payload.email : undefined;
      password = "password" in payload ? payload.password : undefined;
    }
  } catch {
    return NextResponse.json({ error: "Enter your admin email and password." }, { status: 400 });
  }
  if (typeof email !== "string" || typeof password !== "string" || !verifyAdminCredentials(email, password)) {
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
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
