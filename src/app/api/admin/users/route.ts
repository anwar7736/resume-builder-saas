import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { createUser, deleteUser, findUserById, getUsers, updateUser, type AccountPlan } from "@/lib/resume-store";
import { hashPassword, normalizeEmail } from "@/lib/user-auth";

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value);
}

function isAccountPlan(value: unknown): value is AccountPlan {
  return value === "Free" || value === "Premium" || value === "Platinum";
}

function validNameAndEmail(name: string, email: string) {
  return name.length >= 2 && name.length <= 100 && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the user's name, email, and password." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null ||
      !("name" in payload) || !("email" in payload) || !("password" in payload) ||
      typeof payload.name !== "string" || typeof payload.email !== "string" ||
      typeof payload.password !== "string") {
    return NextResponse.json({ error: "Enter the user's name, email, and password." }, { status: 400 });
  }
  const name = payload.name.trim();
  const email = normalizeEmail(payload.email);
  const plan = "plan" in payload ? payload.plan : "Free";
  if (!validNameAndEmail(name, email) || payload.password.length < 8 || payload.password.length > 128 ||
      !isAccountPlan(plan)) {
    return NextResponse.json({ error: "Enter a valid name, email, password, and plan." }, { status: 400 });
  }
  try {
    const credentials = await hashPassword(payload.password);
    const user = await createUser({ name, email, plan, ...credentials });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Unable to create user account from the admin panel.", error);
    return NextResponse.json({ error: "Unable to create this account." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid account update." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null ||
      !("id" in payload) || typeof payload.id !== "string") {
    return NextResponse.json({ error: "Choose a valid account." }, { status: 400 });
  }
  try {
    const existing = await findUserById(payload.id);
    if (!existing) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const name = "name" in payload && typeof payload.name === "string" ? payload.name.trim() : existing.name;
    const email = "email" in payload && typeof payload.email === "string"
      ? normalizeEmail(payload.email)
      : existing.email;
    const plan = "plan" in payload ? payload.plan : existing.plan;
    if (!isAccountPlan(plan) || !validNameAndEmail(name, email)) {
      return NextResponse.json({ error: "Enter a valid name, email, and plan." }, { status: 400 });
    }
    const updated = await updateUser(payload.id, { name, email, plan });
    return updated
      ? NextResponse.json({ success: true, user: { ...existing, name, email, plan } })
      : NextResponse.json({ error: "Account not found." }, { status: 404 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Unable to update user account.", error);
    return NextResponse.json({ error: "Unable to update this account." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A user ID is required." }, { status: 400 });
  try {
    const deleted = await deleteUser(id);
    return deleted
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "Account not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to delete user account.", error);
    return NextResponse.json({ error: "Unable to delete this account." }, { status: 500 });
  }
}
