import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  addGeneratedResume,
  deleteGeneratedResume,
  getGeneratedResumeById,
  getGeneratedResumes,
  getResumeRequestById,
  getWebhookConfiguration,
} from "@/lib/resume-store";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";

const maximumFileSize = 10 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function safeFilename(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? "resume";
  return basename.replace(/[^\w.-]/g, "_").slice(-150) || "resume";
}

function matchesWebhookSecret(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to view your resumes." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  try {
    if (!id) {
      return NextResponse.json({ resumes: await getGeneratedResumes(userId) }, { headers: { "Cache-Control": "no-store" } });
    }
    const resume = await getGeneratedResumeById(id, userId);
    if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    const fileName = safeFilename(resume.fileName);
    const contentType = Object.values(allowedTypes).includes(resume.contentType)
      ? resume.contentType
      : "application/octet-stream";
    const disposition = contentType === "application/pdf" ? "inline" : "attachment";
    return new Response(new Uint8Array(Buffer.from(resume.fileData, "base64")), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Content-Length": String(Buffer.byteLength(resume.fileData, "base64")),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to load generated resumes.", error);
    return NextResponse.json({ error: "Unable to load this resume." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let secret: string;
  try {
    ({ secret } = await getWebhookConfiguration());
  } catch (error) {
    console.error("Unable to read the n8n callback secret.", error);
    return NextResponse.json({ error: "Unable to verify the upload source." }, { status: 500 });
  }
  const providedSecret = request.headers.get("X-Webhook-Secret") ?? "";
  if (!secret || !providedSecret || !matchesWebhookSecret(providedSecret, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return NextResponse.json({ error: "Upload the generated resume using multipart form data." }, { status: 400 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maximumFileSize + 256 * 1024) {
    return NextResponse.json({ error: "The generated resume must be 10 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload valid resume information." }, { status: 400 });
  }
  const requestId = formData.get("requestId");
  const file = formData.get("resume");
  if (typeof requestId !== "string" || !requestId || !(file instanceof File) || !file.size ||
      file.size > maximumFileSize) {
    return NextResponse.json({ error: "A request ID and a non-empty resume file up to 10 MB are required." }, { status: 400 });
  }
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const contentType = allowedTypes[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Upload a PDF, DOC, or DOCX resume." }, { status: 400 });
  }

  try {
    const resumeRequest = await getResumeRequestById(requestId);
    if (!resumeRequest) return NextResponse.json({ error: "Resume request not found." }, { status: 404 });
    const savedResume = await addGeneratedResume({
      userId: resumeRequest.userId,
      requestId,
      fileName: safeFilename(file.name),
      contentType,
      fileData: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
    return NextResponse.json({ success: true, resume: savedResume }, { status: 201 });
  } catch (error) {
    console.error("Unable to save a generated resume from n8n.", error);
    return NextResponse.json({ error: "Unable to save the generated resume." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to delete your resume." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A resume ID is required." }, { status: 400 });
  try {
    const deleted = await deleteGeneratedResume(id, userId);
    return deleted
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "Resume not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to delete a generated resume.", error);
    return NextResponse.json({ error: "Unable to delete this resume." }, { status: 500 });
  }
}
