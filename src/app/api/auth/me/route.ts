import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";
import { findUserById } from "@/lib/resume-store";

export async function GET(request: NextRequest) {
  const id = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!id) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    const user = await findUserById(id);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load account.", error);
    return NextResponse.json({ error: "Unable to load account." }, { status: 500 });
  }
}
