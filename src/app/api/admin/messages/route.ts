import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { deleteContactMessage, getContactMessages, updateContactMessage } from "@/lib/resume-store";

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ messages: await getContactMessages() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load contact messages.", error);
    return NextResponse.json({ error: "Unable to load contact messages." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid message update." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null ||
      !("id" in payload) || !("name" in payload) || !("email" in payload) ||
      !("subject" in payload) || !("message" in payload) ||
      typeof payload.id !== "string" || typeof payload.name !== "string" ||
      typeof payload.email !== "string" || typeof payload.subject !== "string" ||
      typeof payload.message !== "string") {
    return NextResponse.json({ error: "Complete every contact message field." }, { status: 400 });
  }
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const subject = payload.subject.replace(/[\r\n]+/g, " ").trim();
  const message = payload.message.trim();
  if (name.length < 2 || name.length > 100 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      subject.length < 2 || subject.length > 150 || message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: "Check the name, email, subject, and message lengths." }, { status: 400 });
  }
  try {
    const updated = await updateContactMessage(payload.id, { name, email, subject, message });
    return updated
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "Message not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to update contact message.", error);
    return NextResponse.json({ error: "Unable to update contact message." }, { status: 500 });
  }
}
