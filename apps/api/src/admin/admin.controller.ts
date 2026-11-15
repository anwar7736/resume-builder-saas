import { Body, Controller, Delete, Get, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ConflictException } from "@nestjs/common";
import { hashPassword } from "../common/auth-crypto";
import { isDocumentId, isRecord, normalizeEmail, validEmail } from "../common/identity";
import { AdminSessionGuard } from "../common/session.guards";
import { AuthService } from "../auth/auth.service";
import { ResumeService } from "../resumes/resume.service";
import { ResumeRequestEntity } from "../database/entities";
import { isSiteContent, SiteContent } from "../site-content/site-content";
import { SettingsService } from "../settings/settings.service";

type AccountPlan = "Free" | "Premium" | "Platinum";
type RequestStatus = ResumeRequestEntity["status"];

function isResumeLanguage(value: string): value is "English" | "Bangla" {
  return value === "English" || value === "Bangla";
}

function isResumeTemplate(value: string): value is "Minimal" | "Modern" | "Professional" {
  return value === "Minimal" || value === "Modern" || value === "Professional";
}

function isAccountPlan(value: unknown): value is AccountPlan {
  return value === "Free" || value === "Premium" || value === "Platinum";
}

function isRequestStatus(value: unknown): value is RequestStatus {
  return value === "new" || value === "in-progress" || value === "completed";
}

function isUniqueViolation(error: unknown) {
  return error instanceof ConflictException ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "23505");
}

function validNameAndEmail(name: string, email: string) {
  return name.length >= 2 && name.length <= 100 && validEmail(email);
}

@Controller("admin")
@UseGuards(AdminSessionGuard)
export class AdminController {
  constructor(
    private readonly auth: AuthService,
    private readonly resumes: ResumeService,
    private readonly settings: SettingsService,
  ) {}

  @Get("users")
  async getUsers(@Res() response: Response) {
    try {
      return response.setHeader("Cache-Control", "no-store").status(200).json({
        users: await this.auth.getUsers(),
      });
    } catch (error) {
      console.error("Unable to load user accounts.", error);
      return response.status(500).json({ error: "Unable to load user accounts." });
    }
  }

  @Post("users")
  async createUser(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.name !== "string" ||
        typeof payload.email !== "string" || typeof payload.password !== "string") {
      return response.status(400).json({ error: "Enter the user's name, email, and password." });
    }
    const name = payload.name.trim();
    const email = normalizeEmail(payload.email);
    const plan = payload.plan === undefined ? "Free" : payload.plan;
    if (!validNameAndEmail(name, email) || payload.password.length < 8 ||
        payload.password.length > 128 || !isAccountPlan(plan)) {
      return response.status(400).json({ error: "Enter a valid name, email, password, and plan." });
    }
    try {
      const credentials = await hashPassword(payload.password);
      const user = await this.auth.createUser({ name, email, plan, ...credentials });
      return response.status(201).json({ success: true, user });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return response.status(409).json({ error: "An account with this email already exists." });
      }
      console.error("Unable to create user account from admin panel.", error);
      return response.status(500).json({ error: "Unable to create this account." });
    }
  }

  @Patch("users")
  async updateUser(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.id !== "string" || !isDocumentId(payload.id)) {
      return response.status(400).json({ error: "Choose a valid account." });
    }
    try {
      const existing = await this.auth.findUserById(payload.id);
      if (!existing) return response.status(404).json({ error: "Account not found." });
      const name = typeof payload.name === "string" ? payload.name.trim() : existing.name;
      const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : existing.email;
      const plan = payload.plan === undefined ? existing.plan : payload.plan;
      if (!isAccountPlan(plan) || !validNameAndEmail(name, email)) {
        return response.status(400).json({ error: "Enter a valid name, email, and plan." });
      }
      const updated = await this.auth.updateUser(payload.id, { name, email, plan });
      return updated
        ? response.status(200).json({ success: true, user: updated })
        : response.status(404).json({ error: "Account not found." });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return response.status(409).json({ error: "An account with this email already exists." });
      }
      console.error("Unable to update user account.", error);
      return response.status(500).json({ error: "Unable to update this account." });
    }
  }

  @Delete("users")
  async deleteUser(@Query("id") id: string | undefined, @Res() response: Response) {
    if (!id) return response.status(400).json({ error: "A user ID is required." });
    try {
      return await this.auth.deleteUser(id)
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Account not found." });
    } catch (error) {
      console.error("Unable to delete user account.", error);
      return response.status(500).json({ error: "Unable to delete this account." });
    }
  }

  @Get("submissions")
  async getSubmissions(@Res() response: Response) {
    try {
      return response.setHeader("Cache-Control", "no-store").status(200).json({
        requests: await this.resumes.getResumeRequests(),
      });
    } catch (error) {
      console.error("Unable to read resume requests.", error);
      return response.status(500).json({ error: "Unable to load submissions." });
    }
  }

  @Patch("submissions")
  async updateSubmission(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.id !== "string") {
      return response.status(400).json({ error: "Choose a valid submission." });
    }
    try {
      if ("status" in payload) {
        if (!isRequestStatus(payload.status)) {
          return response.status(400).json({ error: "Choose a valid submission status." });
        }
        return await this.resumes.updateResumeRequestStatus(payload.id, payload.status)
          ? response.status(200).json({ success: true })
          : response.status(404).json({ error: "Submission not found." });
      }
      const fields = [
        "name", "email", "phone", "targetRole", "experience", "education", "skills", "summary", "links",
        "additionalInfo", "jobDescription", "resumeLanguage", "resumeTemplate",
      ] as const;
      if (fields.some((field) => typeof payload[field] !== "string")) {
        return response.status(400).json({ error: "Complete every resume request field." });
      }
      const values = Object.fromEntries(fields.map((field) => [
        field,
        (payload[field] as string).trim(),
      ])) as Record<(typeof fields)[number], string>;
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
      if (fields.some((field) => values[field].length > maximums[field]) ||
          values.name.length < 2 || !validEmail(values.email) || !values.phone ||
          !values.targetRole || !values.experience ||
          !isResumeLanguage(values.resumeLanguage) || !isResumeTemplate(values.resumeTemplate)) {
        return response.status(400).json({ error: "Check the request fields and try again." });
      }
      const requestValues = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        targetRole: values.targetRole,
        experience: values.experience,
        education: values.education,
        skills: values.skills,
        summary: values.summary,
        links: values.links,
        additionalInfo: values.additionalInfo,
        jobDescription: values.jobDescription,
        resumeLanguage: values.resumeLanguage,
        resumeTemplate: values.resumeTemplate,
      };
      const updated = await this.resumes.updateResumeRequest(payload.id, requestValues);
      return updated
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Submission not found." });
    } catch (error) {
      console.error("Unable to update a resume request.", error);
      return response.status(500).json({ error: "Unable to update this submission." });
    }
  }

  @Delete("submissions")
  async deleteSubmission(@Query("id") id: string | undefined, @Res() response: Response) {
    if (!id) return response.status(400).json({ error: "A submission ID is required." });
    try {
      return await this.resumes.deleteResumeRequest(id)
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Submission not found." });
    } catch (error) {
      console.error("Unable to delete a resume request.", error);
      return response.status(500).json({ error: "Unable to delete this submission." });
    }
  }

  @Get("settings")
  async getSettings(@Res() response: Response) {
    try {
      const [webhookUrl, webhookSecretConfigured, content] = await Promise.all([
        this.settings.getWebhookUrl(),
        this.settings.hasWebhookSecret(),
        this.settings.getSiteContent(),
      ]);
      return response.setHeader("Cache-Control", "no-store").status(200).json({
        webhookUrl,
        webhookSecretConfigured,
        content,
      });
    } catch (error) {
      console.error("Unable to read admin settings.", error);
      return response.status(500).json({ error: "Unable to load settings." });
    }
  }

  @Patch("settings")
  async updateSettings(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload)) return response.status(400).json({ error: "Invalid settings." });
    let webhookUrl: string | undefined;
    if ("webhookUrl" in payload) {
      if (typeof payload.webhookUrl !== "string" || payload.webhookUrl.length > 2048) {
        return response.status(400).json({ error: "Enter a valid webhook URL." });
      }
      webhookUrl = payload.webhookUrl.trim();
      if (!webhookUrl) {
        return response.status(400).json({ error: "Enter the n8n webhook URL before saving." });
      }
      try {
        const parsed = new URL(webhookUrl);
        const localDevelopmentUrl = process.env.NODE_ENV !== "production" &&
          parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
        if (parsed.protocol !== "https:" && !localDevelopmentUrl) throw new Error("HTTPS is required");
      } catch {
        return response.status(400).json({
          error: "Use an HTTPS webhook URL (HTTP localhost is allowed during development).",
        });
      }
    }
    let webhookSecret: string | undefined;
    if ("webhookSecret" in payload) {
      if (typeof payload.webhookSecret !== "string" || payload.webhookSecret.length > 512) {
        return response.status(400).json({ error: "Enter a valid webhook secret." });
      }
      webhookSecret = payload.webhookSecret.trim();
      if (webhookSecret && webhookSecret.length < 32) {
        return response.status(400).json({ error: "The webhook secret must be at least 32 characters." });
      }
    }
    let content: SiteContent | undefined;
    if ("content" in payload) {
      if (!isSiteContent(payload.content)) {
        return response.status(400).json({ error: "Site content is incomplete or has invalid types." });
      }
      content = payload.content;
    }
    try {
      if (webhookUrl !== undefined) await this.settings.setWebhookUrl(webhookUrl);
      if (webhookSecret !== undefined) await this.settings.setWebhookSecret(webhookSecret);
      if (content !== undefined) await this.settings.setSiteContent(content);
      return response.status(200).json({ success: true });
    } catch (error) {
      console.error("Unable to save admin settings.", error);
      return response.status(500).json({ error: "Unable to save settings." });
    }
  }
}
