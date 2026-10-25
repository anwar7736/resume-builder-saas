"use client";

import { useState, type FormEvent } from "react";
import { FieldError, useFieldValidation } from "@/components/ui/field-validation";
import type { ContactMessage, ResumeRequest, ResumeRequestStatus, UserAccount, AccountPlan } from "@/lib/resume-store";
import { isSiteContent, type SiteContent } from "@/lib/site-content";
import { confirmWithSweetAlert } from "@/lib/confirmation-alert";
import { useToast } from "@/components/ui/toast-provider";
import { SiteContentEditor } from "@/components/admin/site-content-editor";

type AdminPanelProps = {
  isConfigured: boolean;
  initialAuthenticated: boolean;
  initialRequests: ResumeRequest[];
  initialMessages: ContactMessage[];
  initialWebhookUrl: string;
  initialContent: SiteContent;
  initialUsers: UserAccount[];
};

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : "Request failed.";
    throw new Error(message);
  }
  return body;
}

function isResumeRequest(value: unknown): value is ResumeRequest {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "createdAt" in value && typeof value.createdAt === "string" &&
    "status" in value && isResumeRequestStatus(value.status) &&
    "name" in value && typeof value.name === "string" &&
    "email" in value && typeof value.email === "string" &&
    "phone" in value && typeof value.phone === "string" &&
    "targetRole" in value && typeof value.targetRole === "string" &&
    "experience" in value && typeof value.experience === "string" &&
    "education" in value && typeof value.education === "string" &&
    "skills" in value && typeof value.skills === "string" &&
    "summary" in value && typeof value.summary === "string" &&
    "links" in value && typeof value.links === "string" &&
    "additionalInfo" in value && typeof value.additionalInfo === "string";
}

function isResumeRequestStatus(value: unknown): value is ResumeRequestStatus {
  return value === "new" || value === "in-progress" || value === "completed";
}

function isUserAccount(value: unknown): value is UserAccount {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string" &&
    "email" in value && typeof value.email === "string" &&
    "createdAt" in value && typeof value.createdAt === "string" &&
    "resumeCount" in value && typeof value.resumeCount === "number" &&
    "plan" in value && isAccountPlan(value.plan);
}

function isAccountPlan(value: unknown): value is AccountPlan {
  return value === "Free" || value === "Premium" || value === "Platinum";
}

function isContactMessage(value: unknown): value is ContactMessage {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "createdAt" in value && typeof value.createdAt === "string" &&
    "name" in value && typeof value.name === "string" &&
    "email" in value && typeof value.email === "string" &&
    "subject" in value && typeof value.subject === "string" &&
    "message" in value && typeof value.message === "string";
}

export function AdminPanel({
  isConfigured,
  initialAuthenticated,
  initialRequests,
  initialMessages,
  initialWebhookUrl,
  initialContent,
  initialUsers,
}: AdminPanelProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requests, setRequests] = useState(initialRequests);
  const [messages, setMessages] = useState(initialMessages);
  const [users, setUsers] = useState(initialUsers);
  const [content, setContent] = useState(initialContent);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [tab, setTab] = useState<"requests" | "messages" | "users" | "content" | "settings">("requests");
  const [busy, setBusy] = useState(false);
  const { errors, handleInvalid, handleInput, setFieldError } = useFieldValidation();
  const toast = useToast();

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/admin/session", { method: "POST", body: JSON.stringify({ email: adminEmail, password }) });
      const [requestData, userData, messageData, settingsData] = await Promise.all([
        requestJson("/api/admin/submissions"),
        requestJson("/api/admin/users"),
        requestJson("/api/admin/messages"),
        requestJson("/api/admin/settings"),
      ]);
      if (typeof requestData !== "object" || requestData === null || !("requests" in requestData) ||
          !Array.isArray(requestData.requests) || !requestData.requests.every(isResumeRequest) ||
          typeof userData !== "object" || userData === null || !("users" in userData) ||
          !Array.isArray(userData.users) || !userData.users.every(isUserAccount) ||
          typeof messageData !== "object" || messageData === null || !("messages" in messageData) ||
          !Array.isArray(messageData.messages) || !messageData.messages.every(isContactMessage) ||
          typeof settingsData !== "object" || settingsData === null || !("content" in settingsData) ||
          !("webhookUrl" in settingsData) || typeof settingsData.webhookUrl !== "string" ||
          !("content" in settingsData) || !isSiteContent(settingsData.content)) {
        throw new Error("The server returned invalid dashboard data.");
      }
      setRequests(requestData.requests);
      setUsers(userData.users);
      setMessages(messageData.messages);
      setWebhookUrl(settingsData.webhookUrl);
      setContent(settingsData.content);
      setAuthenticated(true);
      setAdminEmail("");
      setPassword("");
      toast.success("Signed in to the admin panel.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to sign in.";
      if (message === "The email or password is incorrect.") setFieldError("adminPassword", message);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: ResumeRequestStatus) {
    try {
      await requestJson("/api/admin/submissions", { method: "PATCH", body: JSON.stringify({ id, status }) });
      setRequests((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      toast.success("Submission status updated.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update status.");
    }
  }

  async function removeRequest(id: string) {
    let confirmed: boolean;
    try {
      confirmed = await confirmWithSweetAlert({
        title: "Delete submission?",
        text: "This permanently deletes the resume request and cannot be undone.",
        confirmButtonText: "Delete submission",
      });
    } catch (error) {
      console.error("Could not display the submission deletion confirmation.", error);
      toast.error("Could not open the confirmation dialog. No changes were made.");
      return;
    }
    if (!confirmed) return;
    try {
      await requestJson(`/api/admin/submissions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setRequests((current) => current.filter((item) => item.id !== id));
      toast.success("Submission deleted.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to delete submission.");
    }
  }

  async function removeMessage(id: string) {
    let confirmed: boolean;
    try {
      confirmed = await confirmWithSweetAlert({
        title: "Delete contact message?",
        text: "This permanently deletes the message and cannot be undone.",
        confirmButtonText: "Delete message",
      });
    } catch (error) {
      console.error("Could not display the message deletion confirmation.", error);
      toast.error("Could not open the confirmation dialog. No changes were made.");
      return;
    }
    if (!confirmed) return;
    try {
      await requestJson(`/api/admin/messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessages((current) => current.filter((item) => item.id !== id));
      toast.success("Contact message deleted.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to delete message.");
    }
  }

  async function updatePlan(id: string, plan: AccountPlan) {
    try {
      await requestJson("/api/admin/users", { method: "PATCH", body: JSON.stringify({ id, plan }) });
      setUsers((current) => current.map((item) => item.id === id ? { ...item, plan } : item));
      toast.success("Account plan updated.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update plan.");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ webhookUrl }) });
      toast.success("Webhook URL saved.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to save settings.";
      if (message.includes("webhook URL") || message.includes("Webhook URL")) setFieldError("webhookUrl", message);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveContent(nextContent: SiteContent) {
    setBusy(true);
    try {
      if (!isSiteContent(nextContent)) throw new Error("Site content is incomplete or has invalid values.");
      await requestJson("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ content: nextContent }) });
      setContent(nextContent);
      toast.success("Website content saved.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Check the content fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await requestJson("/api/admin/session", { method: "DELETE" });
      setAuthenticated(false);
      setUsers([]);
      setRequests([]);
      setMessages([]);
      toast.success("Signed out of the admin panel.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to sign out.");
    }
  }

  if (!isConfigured) {
    return <section className="card admin-login"><h2>Admin login is not configured</h2><p>Set <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD</code>, MongoDB Atlas URI, and a session secret in the server environment.</p></section>;
  }
  if (!authenticated) {
    return <section className="card admin-login">
      <span className="eyebrow">Private workspace</span><h2>Admin sign in</h2><p>Sign in to review requests, users, and site content.</p>
      <form className="admin-login-form" onSubmit={login} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
        <label htmlFor="admin-email">Admin email</label>
        <input className="form-field" id="admin-email" name="adminEmail" type="email" autoComplete="username" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required maxLength={254} aria-invalid={Boolean(errors.adminEmail)} aria-describedby={errors.adminEmail ? "admin-email-error" : undefined} />
        <FieldError id="admin-email-error" error={errors.adminEmail} />
        <label htmlFor="admin-password">Admin password</label>
        <input className="form-field" id="admin-password" name="adminPassword" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required aria-invalid={Boolean(errors.adminPassword)} aria-describedby={errors.adminPassword ? "admin-password-error" : undefined} />
        <FieldError id="admin-password-error" error={errors.adminPassword} />
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>;
  }

  return <div className="admin-dashboard">
    <div className="admin-toolbar"><div><span className="eyebrow">Admin dashboard</span><h2>Manage your website</h2></div><button className="button button-secondary" type="button" onClick={logout}>Sign out</button></div>
    <nav className="admin-tabs" aria-label="Admin sections">
      {([["requests", `Requests (${requests.length})`], ["messages", `Messages (${messages.length})`], ["users", `Users (${users.length})`], ["content", "Site content"], ["settings", "Settings"]] as const).map(([key, label]) =>
        <button className={`admin-tab${tab === key ? " active" : ""}`} type="button" key={key} onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}>{label}</button>)}
    </nav>
    {tab === "requests" && (!requests.length ? <div className="card admin-empty"><h3>No submissions yet</h3><p>New requests from registered users will appear here.</p></div> :
      <div className="admin-request-list">{requests.map((item) => <article className="card admin-request" key={item.id}>
        <div className="admin-request-header">
          <div><h3>{item.name} · {item.targetRole}</h3><a href={`mailto:${item.email}`}>{item.email}</a><span>{new Date(item.createdAt).toLocaleString()}</span></div>
          <div className="admin-request-actions">
            <label className="sr-only" htmlFor={`status-${item.id}`}>Status for {item.name}</label>
            <select id={`status-${item.id}`} className="form-field admin-status" value={item.status} onChange={(event) => {
              const status = event.target.value;
              if (isResumeRequestStatus(status)) void updateStatus(item.id, status);
            }}><option value="new">New</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select>
            <button className="button button-secondary" type="button" onClick={() => removeRequest(item.id)}>Delete</button>
          </div>
        </div>
        <dl className="admin-request-details">{([
          ["Experience", item.experience], ["Education", item.education], ["Skills", item.skills],
          ["Summary", item.summary], ["Links", item.links], ["Additional information", item.additionalInfo],
        ] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </article>)}</div>)}
    {tab === "messages" && (!messages.length ? <div className="card admin-empty"><h3>No contact messages</h3><p>New messages from the contact form will appear here.</p></div> :
      <div className="admin-request-list">{messages.map((message) => <article className="card admin-request" key={message.id}>
        <div className="admin-request-header"><div><h3>{message.subject}</h3><a href={`mailto:${message.email}`}>{message.name} · {message.email}</a><span>{new Date(message.createdAt).toLocaleString()}</span></div><button className="button button-secondary" type="button" onClick={() => removeMessage(message.id)}>Delete</button></div>
        <p className="contact-message-body">{message.message}</p>
      </article>)}</div>)}
    {tab === "users" && <section className="card admin-table-wrap"><h3>User accounts</h3>
      {!users.length ? <p className="muted">No accounts have registered yet.</p> : <div className="admin-user-list">{users.map((user) => <article className="admin-user-row" key={user.id}>
        <div><strong>{user.name}</strong><a href={`mailto:${user.email}`}>{user.email}</a><small>{user.resumeCount} resume requests · joined {new Date(user.createdAt).toLocaleDateString()}</small></div>
        <label><span className="sr-only">Plan for {user.name}</span><select className="form-field admin-status" value={user.plan} onChange={(event) => {
          if (isAccountPlan(event.target.value)) void updatePlan(user.id, event.target.value);
        }}>{content.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
      </article>)}</div>}
      <p className="field-hint">Plan changes are manual; online payment and checkout are not enabled.</p>
    </section>}
    {tab === "content" && <SiteContentEditor initialContent={content} onSave={saveContent} />}
    {tab === "settings" && <section className="card admin-settings">
      <div><h3>n8n webhook URL</h3><p>Saved in settings only. The website does not send information to this URL.</p></div>
      <form className="admin-webhook-form" onSubmit={saveSettings} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
        <label className="sr-only" htmlFor="admin-webhook">Webhook URL</label>
        <div className="form-group admin-webhook-field">
          <input className="form-field" id="admin-webhook" name="webhookUrl" type="url" placeholder="https://example.com/webhook/..." value={webhookUrl} maxLength={2048} onChange={(event) => setWebhookUrl(event.target.value)} aria-invalid={Boolean(errors.webhookUrl)} aria-describedby={errors.webhookUrl ? "admin-webhook-error" : undefined} />
          <FieldError id="admin-webhook-error" error={errors.webhookUrl} />
        </div>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save URL"}</button>
      </form>
    </section>}
  </div>;
}
