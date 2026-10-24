import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { deleteContactMessage, getContactMessages } from "@/lib/resume-store";

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request.cookies.get(adminCookieName)?.value)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ messages: await getContactMessages() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load contact messages.", error);
    return NextResponse.json({ error: "Unable to load contact messages." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isValidAdminSession(request.cookies.get(adminCookieName)?.value)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A message ID is required." }, { status: 400 });
  try {
    const deleted = await deleteContactMessage(id);
    return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Message not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to delete contact message.", error);
    return NextResponse.json({ error: "Unable to delete contact message." }, { status: 500 });
  }
}
