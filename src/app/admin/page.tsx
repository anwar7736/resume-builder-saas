import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminPanel } from "@/components/admin/admin-panel";
import { adminCookieName, adminIsConfigured, isValidAdminSession } from "@/lib/admin-session";
import { getContactMessages, getResumeRequests, getSiteContent, getUsers, getWebhookUrl, hasWebhookSecret, type ContactMessage, type ResumeRequest, type UserAccount } from "@/lib/resume-store";
import { defaultSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const isConfigured = adminIsConfigured();
  const cookieStore = await cookies();
  const authenticated = isValidAdminSession(cookieStore.get(adminCookieName)?.value);
  let requests: ResumeRequest[] = [];
  let users: UserAccount[] = [];
  let messages: ContactMessage[] = [];
  let webhookUrl = "";
  let webhookSecretConfigured = false;
  let content = defaultSiteContent;
  if (authenticated) {
    [requests, users, messages, webhookUrl, webhookSecretConfigured, content] = await Promise.all([
      getResumeRequests(),
      getUsers(),
      getContactMessages(),
      getWebhookUrl(),
      hasWebhookSecret(),
      getSiteContent(),
    ]);
  }
  return <section className="container admin-page">
    <header className="admin-page-heading"><span className="eyebrow">ResumeCraft AI</span><h1 className="heading">Admin panel</h1><p className="subheading">Manage incoming resume information and configuration.</p></header>
    <AdminPanel isConfigured={isConfigured} initialAuthenticated={authenticated} initialRequests={requests} initialMessages={messages} initialWebhookUrl={webhookUrl} initialWebhookSecretConfigured={webhookSecretConfigured} initialContent={content} initialUsers={users} />
  </section>;
}
