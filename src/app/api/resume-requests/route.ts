import { addResumeRequest, deleteResumeRequest, findUserById, getWebhookUrl } from "@/lib/resume-store";
import { getUserIdFromSession, userCookieName } from "@/lib/admin-session";
import { NextRequest } from "next/server";

const limits = {
  name: 100,
  email: 254,
  phone: 40,
  targetRole: 120,
  experience: 5000,
  education: 3000,
  skills: 2000,
  summary: 3000,
  links: 1000,
  additionalInfo: 3000,
} as const;

function acceptedAttachment(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const acceptedTypes: Record<string, string[]> = {
    ".pdf": ["application/pdf", "application/octet-stream", ""],
    ".doc": ["application/msword", "application/octet-stream", ""],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", ""],
    ".txt": ["text/plain", "application/octet-stream", ""],
  };
  return acceptedTypes[extension]?.includes(file.type) ?? false;
}

function safeFilename(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? "attachment";
  return basename.replace(/[^\w.-]/g, "_").slice(-150) || "attachment";
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromSession(request.cookies.get(userCookieName)?.value);
  if (!userId) return Response.json({ error: "Sign in to build your resume.", code: "authentication_required" }, { status: 401 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return Response.json({ error: "Please submit the form using the supported format." }, { status: 400 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 11 * 1024 * 1024) {
    return Response.json({ error: "The attachment must be 10 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Please submit valid form information." }, { status: 400 });
  }

  const values = {} as Record<keyof typeof limits, string>;
  for (const [field, maximum] of Object.entries(limits) as [keyof typeof limits, number][]) {
    const value = formData.get(field);
    if (typeof value !== "string" || value.trim().length > maximum) {
      return Response.json({ error: `Please check the ${field} field and try again.` }, { status: 400 });
    }
    values[field] = value.trim();
  }
  if (!values.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || !values.targetRole || !values.experience) {
    return Response.json({ error: "Name, a valid email, target role, and experience are required." }, { status: 400 });
  }

  const attachmentValue = formData.get("attachment");
  if (attachmentValue !== null && (typeof attachmentValue === "string" || attachmentValue.size > 10 * 1024 * 1024 || attachmentValue.size === 0 || !acceptedAttachment(attachmentValue))) {
    return Response.json({ error: "Attach one non-empty PDF, DOC, DOCX, or TXT file up to 10 MB." }, { status: 400 });
  }

  try {
    const user = await findUserById(userId);
    if (!user) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
    const webhookUrl = attachmentValue ? await getWebhookUrl() : "";
    if (attachmentValue && !webhookUrl) {
      return Response.json({ error: "File delivery is not configured yet. Please contact the site team." }, { status: 503 });
    }
    const result = await addResumeRequest({ ...values, userId, name: user.name, email: user.email });
    if (!result.request) {
      return Response.json({
        error: result.limit < 0
          ? "Unable to reserve a resume request for your account."
          : `Your ${user.plan} plan allows ${result.limit} resume request${result.limit === 1 ? "" : "s"}. Choose another plan to continue.`,
        code: "plan_limit_reached",
        plan: user.plan,
        limit: result.limit,
      }, { status: 403 });
    }

    if (attachmentValue) {
      const webhookForm = new FormData();
      for (const [field, value] of Object.entries(values)) webhookForm.set(field, value);
      webhookForm.set("name", result.request.name);
      webhookForm.set("email", result.request.email);
      webhookForm.set("requestId", result.request.id);
      webhookForm.set("userId", userId);
      webhookForm.append("attachment", attachmentValue, safeFilename(attachmentValue.name));
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          body: webhookForm,
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`Workflow returned HTTP ${response.status}.`);
      } catch (error) {
        console.error("Unable to deliver resume request attachment to the configured workflow.", error);
        let rolledBack = false;
        try {
          rolledBack = await deleteResumeRequest(result.request.id);
        } catch (rollbackError) {
          console.error("Unable to roll back a resume request after workflow delivery failed.", rollbackError);
        }
        if (!rolledBack) {
          return Response.json({
            error: "We couldn't confirm file delivery. Your request may have been saved; contact support before submitting again.",
          }, { status: 502 });
        }
        return Response.json({
          error: "We couldn't deliver your file, so your request was not saved. Please try again later.",
        }, { status: 502 });
      }
    }
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to store a resume request.", error);
    return Response.json({ error: "We couldn't submit your information right now. Please try again later." }, { status: 500 });
  }
}
