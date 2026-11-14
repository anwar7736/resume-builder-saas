import { backendApiRequest, BackendApiError } from "@/lib/backend-api.server";
import type { SiteContent } from "@/lib/site-content";

export type ResumeRequestStatus = "new" | "in-progress" | "completed";
export type AccountPlan = "Free" | "Premium" | "Platinum";

export type ResumeRequest = {
  id: string;
  userId: string;
  createdAt: string;
  status: ResumeRequestStatus;
  name: string;
  email: string;
  phone: string;
  targetRole: string;
  experience: string;
  education: string;
  skills: string;
  summary: string;
  links: string;
  additionalInfo: string;
  jobDescription: string;
  resumeLanguage: "English" | "Bangla";
  resumeTemplate: "Minimal" | "Modern" | "Professional";
};

export type GeneratedResume = {
  id: string;
  requestId: string;
  fileName: string;
  contentType: string;
  createdAt: string;
};

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  plan: AccountPlan;
  createdAt: string;
  resumeCount: number;
};

export type ContactMessage = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type AdminSessionStatus = {
  configured: boolean;
  authenticated: boolean;
};

export type AdminSettings = {
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  content: SiteContent;
};

export async function getSiteContent() {
  const result = await backendApiRequest<{ content: SiteContent }>("/site-content/full");
  return result.content;
}

export async function getResumeRequests(userId?: string) {
  const endpoint = userId ? "/resume-requests" : "/admin/submissions";
  const result = await backendApiRequest<{ requests: ResumeRequest[] }>(endpoint, { forwardCookies: true });
  return result.requests;
}

export async function getResumeRequestById(id: string) {
  try {
    const result = await backendApiRequest<{ request: ResumeRequest }>(
      `/resume-requests?id=${encodeURIComponent(id)}`,
      { forwardCookies: true },
    );
    return result.request;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getGeneratedResumes() {
  const result = await backendApiRequest<{ resumes: GeneratedResume[] }>("/resumes", {
    forwardCookies: true,
  });
  return result.resumes;
}

export async function getUsers() {
  const result = await backendApiRequest<{ users: UserAccount[] }>("/admin/users", {
    forwardCookies: true,
  });
  return result.users;
}

export async function getContactMessages() {
  const result = await backendApiRequest<{ messages: ContactMessage[] }>("/admin/messages", {
    forwardCookies: true,
  });
  return result.messages;
}

export async function getWebhookUrl() {
  return (await getAdminSettings()).webhookUrl;
}

export async function hasWebhookSecret() {
  return (await getAdminSettings()).webhookSecretConfigured;
}

export function getAdminSettings() {
  return backendApiRequest<AdminSettings>("/admin/settings", { forwardCookies: true });
}

export function getAdminSessionStatus() {
  return backendApiRequest<AdminSessionStatus>("/admin/session", { forwardCookies: true });
}
