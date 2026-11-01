import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import {
  deleteResumeRequest,
  getResumeRequests,
  updateResumeRequest,
  updateResumeRequestStatus,
  type ResumeRequestStatus,
} from "@/lib/resume-store";

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value);
}

function isResumeRequestStatus(value: unknown): value is ResumeRequestStatus {
  return value === "new" || value === "in-progress" || value === "completed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResumeLanguage(value: string): value is "English" | "Bangla" {
  return value === "English" || value === "Bangla";
}

function isResumeTemplate(value: string): value is "Minimal" | "Modern" | "Professional" {
  return value === "Minimal" || value === "Modern" || value === "Professional";
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
  if (!isRecord(payload) || typeof payload.id !== "string") {
    return NextResponse.json({ error: "Choose a valid submission." }, { status: 400 });
  }
  try {
    if ("status" in payload) {
      if (!isResumeRequestStatus(payload.status)) {
        return NextResponse.json({ error: "Choose a valid submission status." }, { status: 400 });
      }
      const found = await updateResumeRequestStatus(payload.id, payload.status);
      return found ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }
    const fields = [
      "name", "email", "phone", "targetRole", "experience", "education", "skills", "summary", "links",
      "additionalInfo", "jobDescription", "resumeLanguage", "resumeTemplate",
    ] as const;
    if (fields.some((field) => !(field in payload) || typeof payload[field] !== "string")) {
      return NextResponse.json({ error: "Complete every resume request field." }, { status: 400 });
    }
    const values = {} as Record<(typeof fields)[number], string>;
    for (const field of fields) {
      const value = payload[field];
      if (typeof value !== "string") {
        return NextResponse.json({ error: "Complete every resume request field." }, { status: 400 });
      }
      values[field] = value;
    }
    const maximums: Record<(typeof fields)[number], number> = {
      name: 100,
      email: 254,
      phone: 40,
      targetRole: 120,
      experience: 8000,
      education: 3000,
      skills: 4000,
      summary: 3000,
      links: 1000,
      additionalInfo: 3000,
      jobDescription: 5000,
      resumeLanguage: 20,
      resumeTemplate: 20,
    };
    const language = values.resumeLanguage;
    const template = values.resumeTemplate;
    if (fields.some((field) => values[field].trim().length > maximums[field]) ||
        values.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ||
        !values.phone.trim() || !values.targetRole.trim() || !values.experience.trim() ||
        !isResumeLanguage(language) || !isResumeTemplate(template)) {
      return NextResponse.json({ error: "Check the request fields and try again." }, { status: 400 });
    }
    const found = await updateResumeRequest(payload.id, {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      targetRole: values.targetRole.trim(),
      experience: values.experience.trim(),
      education: values.education.trim(),
      skills: values.skills.trim(),
      summary: values.summary.trim(),
      links: values.links.trim(),
      additionalInfo: values.additionalInfo.trim(),
      jobDescription: values.jobDescription.trim(),
      resumeLanguage: language,
      resumeTemplate: template,
    });
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
