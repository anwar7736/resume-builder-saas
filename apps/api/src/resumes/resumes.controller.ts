import { timingSafeEqual } from "node:crypto";
import {
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { getUserIdFromSession } from "../common/auth-crypto";
import { AuthenticatedRequest } from "../common/authenticated-request";
import { isRecord, safeFilename } from "../common/identity";
import { USER_COOKIE_NAME, UserSessionGuard } from "../common/session.guards";
import { AuthService } from "../auth/auth.service";
import { ResumeService } from "./resume.service";
import { extractProfileSummaryText } from "./profile-summary";

const maximumImageSize = 5 * 1024 * 1024;
const maximumSummaryFileSize = 10 * 1024 * 1024;
const maximumRequestSize = 16 * 1024 * 1024;
const maximumGeneratedResumeSize = 10 * 1024 * 1024;
const generatedResumeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};
const uploadInterceptor = FileFieldsInterceptor([
  { name: "profilePhoto", maxCount: 1 },
  { name: "profileSummary", maxCount: 1 },
], {
  limits: {
    fileSize: maximumSummaryFileSize,
    files: 2,
    fields: 20,
    fieldSize: 64 * 1024,
  },
});
const generatedResumeInterceptor = FileFieldsInterceptor([
  { name: "resume", maxCount: 1 },
], {
  limits: { fileSize: maximumGeneratedResumeSize, files: 1, fields: 2, fieldSize: 1024 },
});

function isLanguage(value: string): value is "English" | "Bangla" {
  return value === "English" || value === "Bangla";
}

function isTemplate(value: string): value is "Minimal" | "Modern" | "Professional" {
  return value === "Minimal" || value === "Modern" || value === "Professional";
}

function isResumePhoto(file: UploadedFile) {
  const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") {
    return file.mimetype === "image/jpeg" && file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  }
  if (extension === ".png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return file.mimetype === "image/png" && signature.every((byte, index) => file.buffer[index] === byte);
  }
  if (extension === ".webp") {
    return file.mimetype === "image/webp" &&
      file.buffer.toString("ascii", 0, 4) === "RIFF" &&
      file.buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function acceptedSummaryFile(file: UploadedFile) {
  const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
  const acceptedTypes: Record<string, string[]> = {
    ".pdf": ["application/pdf", "application/octet-stream", ""],
    ".doc": ["application/msword", "application/octet-stream", ""],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", ""],
    ".txt": ["text/plain", "application/octet-stream", ""],
  };
  return acceptedTypes[extension]?.includes(file.mimetype) ?? false;
}

function matchesWebhookSecret(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function setNoStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

@Controller()
export class ResumeController {
  constructor(
    private readonly resumes: ResumeService,
    private readonly auth: AuthService,
  ) {}

  @Get("resume-requests")
  @UseGuards(UserSessionGuard)
  async getResumeRequest(
    @Req() request: AuthenticatedRequest,
    @Query("id") id: string | undefined,
    @Res() response: Response,
  ) {
    try {
      setNoStore(response);
      if (!id) {
        return response.status(200).json({ requests: await this.resumes.getResumeRequests(request.userId) });
      }
      const resumeRequest = await this.resumes.getResumeRequestById(id, request.userId);
      return resumeRequest
        ? response.status(200).json({ request: resumeRequest })
        : response.status(404).json({ error: "Resume request not found." });
    } catch (error) {
      console.error("Unable to load resume requests.", error);
      return response.status(500).json({ error: "Unable to load this resume request." });
    }
  }

  @Post("resume-requests")
  @UseGuards(UserSessionGuard)
  @UseInterceptors(uploadInterceptor)
  async createResumeRequest(
    @Req() request: AuthenticatedRequest,
    @UploadedFiles() uploaded: {
      profilePhoto?: UploadedFile[];
      profileSummary?: UploadedFile[];
    },
    @Res() response: Response,
  ) {
    const contentLength = Number(request.headers["content-length"] ?? 0);
    if (contentLength > maximumRequestSize) {
      return response.status(413).json({ error: "The uploaded files are too large." });
    }
    const body: unknown = request.body;
    if (!isRecord(body)) {
      return response.status(400).json({ error: "Please submit valid form information." });
    }
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
    const values: Record<keyof typeof limits, string> = {} as Record<keyof typeof limits, string>;
    for (const [field, maximum] of Object.entries(limits) as [keyof typeof limits, number][]) {
      const value = body[field];
      if (typeof value !== "string" || value.trim().length > maximum) {
        return response.status(400).json({ error: `Please check the ${field} field and try again.` });
      }
      values[field] = value.trim();
    }
    const language = body.resumeLanguage;
    const template = body.resumeTemplate;
    if (!values.fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ||
        !values.phone || !values.targetJobTitle || !values.workExperienceEducation ||
        typeof language !== "string" || !isLanguage(language) ||
        typeof template !== "string" || !isTemplate(template)) {
      return response.status(400).json({
        error: "Complete the required fields and choose a supported language and template.",
      });
    }

    const photo = uploaded.profilePhoto?.[0];
    if (photo && (photo.size > maximumImageSize || !isResumePhoto(photo))) {
      return response.status(400).json({ error: "Choose a JPG, PNG, or WebP profile photo up to 5 MB." });
    }
    const summary = uploaded.profileSummary?.[0];
    if (summary && (summary.size > maximumSummaryFileSize || !acceptedSummaryFile(summary))) {
      return response.status(400).json({ error: "Attach a non-empty PDF, DOC, DOCX, or TXT file up to 10 MB." });
    }

    let profileSummaryText: string | undefined;
    if (summary) {
      try {
        profileSummaryText = await extractProfileSummaryText(summary.originalname, summary.buffer);
      } catch (error) {
        console.error("Unable to extract uploaded profile summary.", {
          fileType: summary.originalname.slice(summary.originalname.lastIndexOf(".")).toLowerCase(),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown extraction error.",
        });
        return response.status(400).json({
          error: "We couldn't extract text from that file. Use a valid text-based PDF, DOC, DOCX, or UTF-8 TXT file.",
          code: "profile_summary_extraction_failed",
        });
      }
    }

    try {
      const user = await this.auth.findUserById(request.userId ?? "");
      if (!user) return response.status(401).json({ error: "Your session expired. Please sign in again." });
      values.fullName = user.name;
      values.email = user.email;

      const { url: webhookUrl, secret: webhookSecret } = await this.resumes.getWebhookConfiguration();
      if (!webhookUrl || !webhookSecret) {
        return response.status(503).json({
          error: "The n8n webhook URL and secret must be configured before submitting.",
        });
      }
      const result = await this.resumes.addResumeRequest({
        userId: user.id,
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
        return response.status(403).json({
          error: result.limit < 0
            ? "Unable to reserve a resume request for your account."
            : `Your ${user.plan} plan allows ${result.limit} resume request${result.limit === 1 ? "" : "s"}. Choose another plan to continue.`,
          code: "plan_limit_reached",
          plan: user.plan,
          limit: result.limit,
        });
      }

      const webhookForm = new FormData();
      for (const [field, value] of Object.entries(values)) webhookForm.set(field, value);
      webhookForm.set("resumeLanguage", language);
      webhookForm.set("resumeTemplate", template);
      webhookForm.set("requestId", result.request.id);
      webhookForm.set("userId", user.id);
      if (photo) {
        webhookForm.append("profilePhoto", new Blob([new Uint8Array(photo.buffer)], { type: photo.mimetype }), safeFilename(photo.originalname));
      }
      if (summary) {
        webhookForm.append("profileSummary", new Blob([new Uint8Array(summary.buffer)], { type: summary.mimetype }), safeFilename(summary.originalname));
        webhookForm.set("profileSummaryText", profileSummaryText ?? "");
      }
      try {
        const workflowResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "X-Webhook-Secret": webhookSecret },
          body: webhookForm,
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        });
        if (!workflowResponse.ok) throw new Error(`Workflow returned HTTP ${workflowResponse.status}.`);
      } catch (error) {
        console.error("Unable to deliver resume request to n8n.", error);
        const rolledBack = await this.resumes.deleteResumeRequest(result.request.id).catch((rollbackError: unknown) => {
          console.error("Unable to roll back a failed resume request.", rollbackError);
          return false;
        });
        return rolledBack
          ? response.status(502).json({ error: "We couldn't deliver your request, so it was not saved. Please try again later." })
          : response.status(502).json({
              error: "We couldn't confirm delivery. Your request may have been saved; contact support before submitting again.",
            });
      }
      return response.status(201).json({ success: true });
    } catch (error) {
      console.error("Unable to store a resume request.", error);
      return response.status(500).json({
        error: "We couldn't submit your information right now. Please try again later.",
      });
    }
  }

  @Get("resumes")
  @UseGuards(UserSessionGuard)
  async getGeneratedResumes(
    @Req() request: AuthenticatedRequest,
    @Query("id") id: string | undefined,
    @Res() response: Response,
  ) {
    try {
      setNoStore(response);
      if (!id) return response.status(200).json({ resumes: await this.resumes.getGeneratedResumes(request.userId ?? "") });
      const resume = await this.resumes.getGeneratedResumeById(id, request.userId ?? "");
      if (!resume) return response.status(404).json({ error: "Resume not found." });
      const filename = safeFilename(resume.fileName, "resume");
      const contentType = Object.values(generatedResumeTypes).includes(resume.contentType)
        ? resume.contentType
        : "application/octet-stream";
      const disposition = contentType === "application/pdf" ? "inline" : "attachment";
      return response.status(200).set({
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": String(resume.fileData.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      }).send(resume.fileData);
    } catch (error) {
      console.error("Unable to load generated resumes.", error);
      return response.status(500).json({ error: "Unable to load this resume." });
    }
  }

  @Post("resumes")
  @UseInterceptors(generatedResumeInterceptor)
  async saveGeneratedResume(
    @Headers("x-webhook-secret") providedSecret: string | undefined,
    @Req() request: Request,
    @UploadedFiles() uploaded: { resume?: UploadedFile[] },
    @Res() response: Response,
  ) {
    let configuration: { url: string; secret: string };
    try {
      configuration = await this.resumes.getWebhookConfiguration();
    } catch (error) {
      console.error("Unable to read the n8n callback secret.", error);
      return response.status(500).json({ error: "Unable to verify the upload source." });
    }
    if (!configuration.secret || !providedSecret || !matchesWebhookSecret(providedSecret, configuration.secret)) {
      return response.status(401).json({ error: "Unauthorized." });
    }
    const contentLength = Number(request.headers["content-length"] ?? 0);
    if (contentLength > maximumGeneratedResumeSize + 256 * 1024) {
      return response.status(413).json({ error: "The generated resume must be 10 MB or smaller." });
    }
    const requestId = typeof request.body?.requestId === "string" ? request.body.requestId : "";
    const file = uploaded.resume?.[0];
    if (!requestId || !file?.size || file.size > maximumGeneratedResumeSize) {
      return response.status(400).json({
        error: "A request ID and a non-empty resume file up to 10 MB are required.",
      });
    }
    const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    const contentType = generatedResumeTypes[extension];
    if (!contentType) return response.status(400).json({ error: "Upload a PDF, DOC, or DOCX resume." });

    try {
      const resumeRequest = await this.resumes.getResumeRequestById(requestId);
      if (!resumeRequest) return response.status(404).json({ error: "Resume request not found." });
      const savedResume = await this.resumes.addGeneratedResume({
        userId: resumeRequest.userId,
        requestId,
        fileName: safeFilename(file.originalname, "resume"),
        contentType,
        fileData: file.buffer,
      });
      return response.status(201).json({ success: true, resume: savedResume });
    } catch (error) {
      console.error("Unable to save a generated resume from n8n.", error);
      return response.status(500).json({ error: "Unable to save the generated resume." });
    }
  }

  @Delete("resumes")
  @UseGuards(UserSessionGuard)
  async deleteGeneratedResume(
    @Req() request: AuthenticatedRequest,
    @Query("id") id: string | undefined,
    @Res() response: Response,
  ) {
    if (!id) return response.status(400).json({ error: "A resume ID is required." });
    try {
      return await this.resumes.deleteGeneratedResume(id, request.userId ?? "")
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Resume not found." });
    } catch (error) {
      console.error("Unable to delete a generated resume.", error);
      return response.status(500).json({ error: "Unable to delete this resume." });
    }
  }
}
