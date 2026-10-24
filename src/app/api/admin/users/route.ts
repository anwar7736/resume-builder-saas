import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { getUsers, updateUserPlan, type AccountPlan } from "@/lib/resume-store";

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value);
}

function isAccountPlan(value: unknown): value is AccountPlan {
  return value === "Free" || value === "Premium" || value === "Platinum";
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ users: await getUsers() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load user accounts.", error);
    return NextResponse.json({ error: "Unable to load user accounts." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid plan update." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || !("id" in payload) || !("plan" in payload) ||
      typeof payload.id !== "string" || !isAccountPlan(payload.plan)) {
    return NextResponse.json({ error: "Choose a valid account and plan." }, { status: 400 });
  }
  try {
    const updated = await updateUserPlan(payload.id, payload.plan);
    return updated ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Account not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to change user plan.", error);
    return NextResponse.json({ error: "Unable to change this user's plan." }, { status: 500 });
  }
}
