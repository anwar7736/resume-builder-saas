import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { deleteResumeRequest, getResumeRequests, updateResumeRequestStatus, type ResumeRequestStatus } from "@/lib/resume-store";

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value);
}

function isResumeRequestStatus(value: unknown): value is ResumeRequestStatus {
  return value === "new" || value === "in-progress" || value === "completed";
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ requests: await getResumeRequests() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to read resume requests.", error);
    return NextResponse.json({ error: "Unable to load submissions." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || !("id" in payload) || !("status" in payload) ||
      typeof payload.id !== "string" || !isResumeRequestStatus(payload.status)) {
    return NextResponse.json({ error: "Choose a valid submission and status." }, { status: 400 });
  }
  try {
    const found = await updateResumeRequestStatus(payload.id, payload.status);
    return found ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Submission not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to update a resume request.", error);
    return NextResponse.json({ error: "Unable to update this submission." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let id: string | null;
  try {
    id = new URL(request.url).searchParams.get("id");
  } catch {
    id = null;
  }
  if (!id) return NextResponse.json({ error: "A submission ID is required." }, { status: 400 });
  try {
    const found = await deleteResumeRequest(id);
    return found ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Submission not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to delete a resume request.", error);
    return NextResponse.json({ error: "Unable to delete this submission." }, { status: 500 });
  }
}
