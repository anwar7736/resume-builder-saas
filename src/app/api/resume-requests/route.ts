import { NextRequest, NextResponse } from "next/server";
import {
  addResumeRequest,
  deleteResumeRequest,
  findUserById,
  getResumeRequestById,
  getWebhookConfiguration,
} from "@/lib/resume-store";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";
import { extractProfileSummaryText } from "@/lib/profile-summary";

const limits = {
  fullName: 100,
  email: 254,
  phone: 40,
  targetJobTitle: 120,
  workExperienceEducation: 8000,
  skillsProjects: 4000,
  jobDescription: 5000,
  professionalSummary: 3000,
} as const;

const maximumImageSize = 5 * 1024 * 1024;
const maximumSummaryFileSize = 10 * 1024 * 1024;
const maximumRequestSize = 16 * 1024 * 1024;

function acceptedSummaryFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const acceptedTypes: Record<string, string[]> = {
    ".pdf": ["application/pdf", "application/octet-stream", ""],
    ".doc": ["application/msword", "application/octet-stream", ""],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", ""],
    ".txt": ["text/plain", "application/octet-stream", ""],
  };
  return acceptedTypes[extension]?.includes(file.type) ?? false;
}

async function acceptedProfilePhoto(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if ((extension === ".jpg" || extension === ".jpeg") && file.type === "image/jpeg") {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (extension === ".png" && file.type === "image/png") {
    return header.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte);
  }
  if (extension === ".webp" && file.type === "image/webp") {
    return header.length >= 12 &&
      String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  }
  return false;
}

function safeFilename(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? "attachment";
  return basename.replace(/[^\w.-]/g, "_").slice(-150) || "attachment";
}

function isLanguage(value: string): value is "English" | "Bangla" {
  return value === "English" || value === "Bangla";
}

function isTemplate(value: string): value is "Minimal" | "Modern" | "Professional" {
  return value === "Minimal" || value === "Modern" || value === "Professional";
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to view your resume request." }, { status: 401 });
  const requestId = request.nextUrl.searchParams.get("id");
  if (!requestId) return NextResponse.json({ error: "A request ID is required." }, { status: 400 });
  try {
    const resumeRequest = await getResumeRequestById(requestId, userId);
    return resumeRequest
      ? NextResponse.json({ request: resumeRequest }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "Resume request not found." }, { status: 404 });
  } catch (error) {
    console.error("Unable to load a resume request.", error);
    return NextResponse.json({ error: "Unable to load this resume request." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Sign in to build your resume.", code: "authentication_required" }, { status: 401 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return NextResponse.json({ error: "Please submit the form using the supported format." }, { status: 400 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maximumRequestSize) {
    return NextResponse.json({ error: "The uploaded files are too large." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Please submit valid form information." }, { status: 400 });
  }

  const values = {} as Record<keyof typeof limits, string>;
  for (const [field, maximum] of Object.entries(limits) as [keyof typeof limits, number][]) {
    const value = formData.get(field);
    if (typeof value !== "string" || value.trim().length > maximum) {
      return NextResponse.json({ error: `Please check the ${field} field and try again.` }, { status: 400 });
    }
    values[field] = value.trim();
  }
  const language = formData.get("resumeLanguage");
  const template = formData.get("resumeTemplate");
  if (!values.fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || !values.phone ||
      !values.targetJobTitle || !values.workExperienceEducation || typeof language !== "string" ||
      !isLanguage(language) || typeof template !== "string" || !isTemplate(template)) {
    return NextResponse.json({ error: "Complete the required fields and choose a supported language and template." }, { status: 400 });
  }

  const photoValue = formData.get("profilePhoto");
  if (photoValue !== null && (typeof photoValue === "string" ||
      (photoValue.size > 0 && (photoValue.size > maximumImageSize ||
        !await acceptedProfilePhoto(photoValue))))) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP profile photo up to 5 MB." }, { status: 400 });
  }
  const summaryValue = formData.get("profileSummary");
  if (summaryValue !== null && (typeof summaryValue === "string" ||
      (summaryValue.size > 0 && (summaryValue.size > maximumSummaryFileSize || !acceptedSummaryFile(summaryValue))))) {
    return NextResponse.json({ error: "Attach a non-empty PDF, DOC, DOCX, or TXT file up to 10 MB." }, { status: 400 });
  }

  let profileSummaryText: string | undefined;
  if (summaryValue instanceof File && summaryValue.size > 0) {
    try {
      profileSummaryText = await extractProfileSummaryText(summaryValue);
    } catch (error) {
      console.error("Unable to extract text from the uploaded profile summary.", {
        fileType: summaryValue.name.slice(summaryValue.name.lastIndexOf(".")).toLowerCase(),
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return NextResponse.json({
        error: "We couldn't extract text from that file. Use a valid text-based PDF, DOC, DOCX, or UTF-8 TXT file.",
        code: "profile_summary_extraction_failed",
      }, { status: 400 });
    }
  }

  try {
    const user = await findUserById(userId);
    if (!user) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
    values.fullName = user.name;
    values.email = user.email;
    const { url: webhookUrl, secret: webhookSecret } = await getWebhookConfiguration();
    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json({ error: "The n8n webhook URL and secret must be configured before submitting." }, { status: 503 });
    }
    const result = await addResumeRequest({
      userId,
      name: values.fullName,
      email: values.email,
      phone: values.phone,
      targetRole: values.targetJobTitle,
      experience: values.workExperienceEducation,
      education: "",
      skills: values.skillsProjects,
      summary: values.professionalSummary,
      links: "",
      additionalInfo: "",
      jobDescription: values.jobDescription,
      resumeLanguage: language,
      resumeTemplate: template,
    });
    if (!result.request) {
      return NextResponse.json({
        error: result.limit < 0
          ? "Unable to reserve a resume request for your account."
          : `Your ${user.plan} plan allows ${result.limit} resume request${result.limit === 1 ? "" : "s"}. Choose another plan to continue.`,
        code: "plan_limit_reached",
        plan: user.plan,
        limit: result.limit,
      }, { status: 403 });
    }

    const webhookForm = new FormData();
    for (const [field, value] of Object.entries(values)) webhookForm.set(field, value);
    webhookForm.set("resumeLanguage", language);
    webhookForm.set("resumeTemplate", template);
    webhookForm.set("requestId", result.request.id);
    webhookForm.set("userId", userId);
    if (photoValue instanceof File && photoValue.size > 0) webhookForm.append("profilePhoto", photoValue, safeFilename(photoValue.name));
    if (summaryValue instanceof File && summaryValue.size > 0) {
      webhookForm.append("profileSummary", summaryValue, safeFilename(summaryValue.name));
      webhookForm.set("profileSummaryText", profileSummaryText ?? "");
    }
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "X-Webhook-Secret": webhookSecret },
        body: webhookForm,
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Workflow returned HTTP ${response.status}.`);
    } catch (error) {
      console.error("Unable to deliver a resume request to the configured n8n workflow.", error);
      let rolledBack = false;
      try {
        rolledBack = await deleteResumeRequest(result.request.id);
      } catch (rollbackError) {
        console.error("Unable to roll back a resume request after workflow delivery failed.", rollbackError);
      }
      if (!rolledBack) {
        return NextResponse.json({
          error: "We couldn't confirm delivery. Your request may have been saved; contact support before submitting again.",
        }, { status: 502 });
      }
      return NextResponse.json({
        error: "We couldn't deliver your request, so it was not saved. Please try again later.",
      }, { status: 502 });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to store a resume request.", error);
    return NextResponse.json({ error: "We couldn't submit your information right now. Please try again later." }, { status: 500 });
  }
}
