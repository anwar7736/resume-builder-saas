import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";
import {
  getAdminSessionStatus,
  getAdminSettings,
  getContactMessages,
  getResumeRequests,
  getUsers,
  type ContactMessage,
  type ResumeRequest,
  type UserAccount,
} from "@/lib/resume-store";
import { defaultSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getAdminSessionStatus();
  const isConfigured = session.configured;
  const authenticated = session.authenticated;
  let requests: ResumeRequest[] = [];
  let users: UserAccount[] = [];
  let messages: ContactMessage[] = [];
  let webhookUrl = "";
  let webhookSecretConfigured = false;
  let content = defaultSiteContent;
  if (authenticated) {
    const [submissionResponse, userResponse, messageResponse, settings] = await Promise.all([
      getResumeRequests(),
      getUsers(),
      getContactMessages(),
      getAdminSettings(),
    ]);
    requests = submissionResponse;
    users = userResponse;
    messages = messageResponse;
    webhookUrl = settings.webhookUrl;
    webhookSecretConfigured = settings.webhookSecretConfigured;
    content = settings.content;
  }
  return <section className="container admin-page">
    <header className="admin-page-heading"><span className="eyebrow">ResumeCraft AI</span><h1 className="heading">Admin panel</h1><p className="subheading">Manage incoming resume information and configuration.</p></header>
    <AdminPanel isConfigured={isConfigured} initialAuthenticated={authenticated} initialRequests={requests} initialMessages={messages} initialWebhookUrl={webhookUrl} initialWebhookSecretConfigured={webhookSecretConfigured} initialContent={content} initialUsers={users} />
  </section>;
}
