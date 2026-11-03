"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FieldError, useFieldValidation } from "@/components/ui/field-validation";
import type { ContactMessage, ResumeRequest, ResumeRequestStatus, UserAccount, AccountPlan } from "@/lib/resume-store";
import { isSiteContent, type SiteContent } from "@/lib/site-content";
import { confirmWithSweetAlert } from "@/lib/confirmation-alert";
import { useToast } from "@/components/ui/toast-provider";
import { SiteContentEditor } from "@/components/admin/site-content-editor";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";

type AdminPanelProps = {
  isConfigured: boolean;
  initialAuthenticated: boolean;
  initialRequests: ResumeRequest[];
  initialMessages: ContactMessage[];
  initialWebhookUrl: string;
  initialWebhookSecretConfigured: boolean;
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
    "additionalInfo" in value && typeof value.additionalInfo === "string" &&
    "jobDescription" in value && typeof value.jobDescription === "string" &&
    "resumeLanguage" in value && (value.resumeLanguage === "English" || value.resumeLanguage === "Bangla") &&
    "resumeTemplate" in value && (value.resumeTemplate === "Minimal" || value.resumeTemplate === "Modern" || value.resumeTemplate === "Professional");
}

function isResumeRequestStatus(value: unknown): value is ResumeRequestStatus {
  return value === "new" || value === "in-progress" || value === "completed";
}

function isResumeLanguage(value: string): value is ResumeRequest["resumeLanguage"] {
  return value === "English" || value === "Bangla";
}

function isResumeTemplate(value: string): value is ResumeRequest["resumeTemplate"] {
  return value === "Minimal" || value === "Modern" || value === "Professional";
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
  initialWebhookSecretConfigured,
  initialContent,
  initialUsers,
}: AdminPanelProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [adminTotpCode, setAdminTotpCode] = useState("");
  const [requests, setRequests] = useState(initialRequests);
  const [messages, setMessages] = useState(initialMessages);
  const [users, setUsers] = useState(initialUsers);
  const [content, setContent] = useState(initialContent);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(initialWebhookSecretConfigured);
  const [tab, setTab] = useState<"requests" | "messages" | "users" | "content" | "settings">("requests");
  const [busy, setBusy] = useState(false);
  const { errors, handleInvalid, handleInput, setFieldError } = useFieldValidation();
  const toast = useToast();
  const loginFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!twoFactorRequired || adminTotpCode.length !== 6 || busy) return;
    const timeout = window.setTimeout(() => loginFormRef.current?.requestSubmit(), 0);
    return () => window.clearTimeout(timeout);
  }, [adminTotpCode, busy, twoFactorRequired]);

  function validationProps(key: string) {
    return {
      id: `admin-${key}`,
      "data-validation-key": key,
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby": errors[key] ? `admin-${key}-error` : undefined,
    };
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const loginResult = await requestJson("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({
          email: adminEmail,
          password,
          ...(twoFactorRequired ? { totpCode: adminTotpCode } : {}),
        }),
      });
      if (typeof loginResult === "object" && loginResult !== null &&
          "requiresTwoFactor" in loginResult && loginResult.requiresTwoFactor === true) {
        setTwoFactorRequired(true);
        setAdminTotpCode("");
        return;
      }
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
          !isSiteContent(settingsData.content) || !("webhookSecretConfigured" in settingsData) ||
          typeof settingsData.webhookSecretConfigured !== "boolean") {
        throw new Error("The server returned invalid dashboard data.");
      }
      setRequests(requestData.requests);
      setUsers(userData.users);
      setMessages(messageData.messages);
      setWebhookUrl(settingsData.webhookUrl);
      setWebhookSecretConfigured(settingsData.webhookSecretConfigured);
      setContent(settingsData.content);
      setAuthenticated(true);
      setTwoFactorRequired(false);
      setAdminTotpCode("");
      setAdminEmail("");
      setPassword("");
      toast.success("Signed in to the admin panel.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to sign in.";
      if (twoFactorRequired) setAdminTotpCode("");
      if (message.includes("authenticator")) setFieldError("adminTotpCode", message);
      else if (message === "The email or password is incorrect.") setFieldError("adminPassword", message);
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

  async function saveRequest(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const resumeLanguage = String(data.get("resumeLanguage") ?? "");
    const resumeTemplate = String(data.get("resumeTemplate") ?? "");
    if (!isResumeLanguage(resumeLanguage) || !isResumeTemplate(resumeTemplate)) {
      toast.error("Choose a supported resume language and template.");
      return;
    }
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      targetRole: String(data.get("targetRole") ?? "").trim(),
      experience: String(data.get("experience") ?? "").trim(),
      education: String(data.get("education") ?? "").trim(),
      skills: String(data.get("skills") ?? "").trim(),
      summary: String(data.get("summary") ?? "").trim(),
      links: String(data.get("links") ?? "").trim(),
      additionalInfo: String(data.get("additionalInfo") ?? "").trim(),
      jobDescription: String(data.get("jobDescription") ?? "").trim(),
      resumeLanguage,
      resumeTemplate,
    };
    try {
      await requestJson("/api/admin/submissions", { method: "PATCH", body: JSON.stringify({ id, ...values }) });
      setRequests((current) => current.map((item) => item.id === id ? { ...item, ...values } : item));
      toast.success("Resume request updated.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update this request.");
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

  async function saveMessage(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim().toLowerCase(),
      subject: String(data.get("subject") ?? "").replace(/[\r\n]+/g, " ").trim(),
      message: String(data.get("message") ?? "").trim(),
    };
    try {
      await requestJson("/api/admin/messages", { method: "PATCH", body: JSON.stringify({ id, ...values }) });
      setMessages((current) => current.map((item) => item.id === id ? { ...item, ...values } : item));
      toast.success("Contact message updated.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update this message.");
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

  async function saveUser(event: FormEvent<HTMLFormElement>, user: UserAccount) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim().toLowerCase(),
    };
    try {
      await requestJson("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id: user.id, ...values }),
      });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...values } : item));
      toast.success("User account updated.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update this user.");
    }
  }

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const result = await requestJson("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          plan: data.get("plan"),
        }),
      });
      if (typeof result !== "object" || result === null || !("user" in result)) {
        throw new Error("The server returned invalid account data.");
      }
      const createdUser: unknown = result.user;
      if (!isUserAccount(createdUser)) throw new Error("The server returned invalid account data.");
      setUsers((current) => [createdUser, ...current]);
      form.reset();
      toast.success("User account created.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to create this user.");
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(user: UserAccount) {
    let confirmed: boolean;
    try {
      confirmed = await confirmWithSweetAlert({
        title: "Delete user account?",
        text: "This permanently deletes the account, its resume requests, and generated resumes.",
        confirmButtonText: "Delete account",
      });
    } catch (error) {
      console.error("Could not display the account deletion confirmation.", error);
      toast.error("Could not open the confirmation dialog. No changes were made.");
      return;
    }
    if (!confirmed) return;
    try {
      await requestJson(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setRequests((current) => current.filter((item) => item.userId !== user.id));
      toast.success("User account deleted.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to delete this user.");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ webhookUrl, ...(webhookSecret ? { webhookSecret } : {}) }),
      });
      if (webhookSecret) {
        setWebhookSecretConfigured(true);
        setWebhookSecret("");
      }
      toast.success("n8n webhook settings saved.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to save settings.";
      if (message.includes("webhook URL") || message.includes("Webhook URL")) setFieldError("webhookUrl", message);
      else if (message.includes("webhook secret") || message.includes("Webhook secret")) setFieldError("webhookSecret", message);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function clearWebhookSecret() {
    setBusy(true);
    try {
      await requestJson("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ webhookSecret: "" }) });
      setWebhookSecretConfigured(false);
      toast.success("Webhook secret removed.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to remove the webhook secret.");
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
      <form ref={loginFormRef} className="admin-login-form" onSubmit={login} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
        <label htmlFor="admin-email">Admin email</label>
        <input className="form-field" id="admin-email" name="adminEmail" type="email" autoComplete="username" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required maxLength={254} aria-invalid={Boolean(errors.adminEmail)} aria-describedby={errors.adminEmail ? "admin-email-error" : undefined} />
        <FieldError id="admin-email-error" error={errors.adminEmail} />
        <label htmlFor="admin-password">Admin password</label>
        <input className="form-field" id="admin-password" name="adminPassword" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required aria-invalid={Boolean(errors.adminPassword)} aria-describedby={errors.adminPassword ? "admin-password-error" : undefined} />
        <FieldError id="admin-password-error" error={errors.adminPassword} />
        {twoFactorRequired && <>
          <label htmlFor="admin-totp-code">Authenticator code</label>
          <input className="form-field" id="admin-totp-code" name="adminTotpCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={adminTotpCode} onChange={(event) => setAdminTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-invalid={Boolean(errors.adminTotpCode)} aria-describedby={errors.adminTotpCode ? "admin-totp-code-error" : undefined} />
          <FieldError id="admin-totp-code-error" error={errors.adminTotpCode} />
        </>}
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
          ["Job description", item.jobDescription], ["Resume language", item.resumeLanguage], ["Template", item.resumeTemplate],
        ] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <details className="admin-edit-details">
          <summary>Edit request</summary>
          <form className="form-grid" onSubmit={(event) => void saveRequest(event, item.id)} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
            <label className="form-group">Full name<input className="form-field" name="name" defaultValue={item.name} required minLength={2} maxLength={100} {...validationProps(`request-${item.id}-name`)} /><FieldError id={`admin-request-${item.id}-name-error`} error={errors[`request-${item.id}-name`]} /></label>
            <label className="form-group">Email<input className="form-field" name="email" type="email" defaultValue={item.email} required maxLength={254} {...validationProps(`request-${item.id}-email`)} /><FieldError id={`admin-request-${item.id}-email-error`} error={errors[`request-${item.id}-email`]} /></label>
            <label className="form-group">Phone<input className="form-field" name="phone" defaultValue={item.phone} required maxLength={40} {...validationProps(`request-${item.id}-phone`)} /><FieldError id={`admin-request-${item.id}-phone-error`} error={errors[`request-${item.id}-phone`]} /></label>
            <label className="form-group">Target job title<input className="form-field" name="targetRole" defaultValue={item.targetRole} required maxLength={120} {...validationProps(`request-${item.id}-targetRole`)} /><FieldError id={`admin-request-${item.id}-targetRole-error`} error={errors[`request-${item.id}-targetRole`]} /></label>
            <label className="form-group full">Work experience and education<textarea className="form-field" name="experience" defaultValue={item.experience} required maxLength={8000} {...validationProps(`request-${item.id}-experience`)} /><FieldError id={`admin-request-${item.id}-experience-error`} error={errors[`request-${item.id}-experience`]} /></label>
            <label className="form-group full">Skills and projects<textarea className="form-field" name="skills" defaultValue={item.skills} maxLength={4000} {...validationProps(`request-${item.id}-skills`)} /><FieldError id={`admin-request-${item.id}-skills-error`} error={errors[`request-${item.id}-skills`]} /></label>
            <label className="form-group full">Job description<textarea className="form-field" name="jobDescription" defaultValue={item.jobDescription} maxLength={5000} {...validationProps(`request-${item.id}-jobDescription`)} /><FieldError id={`admin-request-${item.id}-jobDescription-error`} error={errors[`request-${item.id}-jobDescription`]} /></label>
            <label className="form-group full">Professional summary<textarea className="form-field" name="summary" defaultValue={item.summary} maxLength={3000} {...validationProps(`request-${item.id}-summary`)} /><FieldError id={`admin-request-${item.id}-summary-error`} error={errors[`request-${item.id}-summary`]} /></label>
            <label className="form-group">Education<textarea className="form-field" name="education" defaultValue={item.education} maxLength={3000} {...validationProps(`request-${item.id}-education`)} /><FieldError id={`admin-request-${item.id}-education-error`} error={errors[`request-${item.id}-education`]} /></label>
            <label className="form-group">Links<input className="form-field" name="links" defaultValue={item.links} maxLength={1000} {...validationProps(`request-${item.id}-links`)} /><FieldError id={`admin-request-${item.id}-links-error`} error={errors[`request-${item.id}-links`]} /></label>
            <label className="form-group full">Additional information<textarea className="form-field" name="additionalInfo" defaultValue={item.additionalInfo} maxLength={3000} {...validationProps(`request-${item.id}-additionalInfo`)} /><FieldError id={`admin-request-${item.id}-additionalInfo-error`} error={errors[`request-${item.id}-additionalInfo`]} /></label>
            <label className="form-group">Resume language<select className="form-field" name="resumeLanguage" defaultValue={item.resumeLanguage} {...validationProps(`request-${item.id}-resumeLanguage`)}><option>English</option><option>Bangla</option></select><FieldError id={`admin-request-${item.id}-resumeLanguage-error`} error={errors[`request-${item.id}-resumeLanguage`]} /></label>
            <label className="form-group">Resume template<select className="form-field" name="resumeTemplate" defaultValue={item.resumeTemplate} {...validationProps(`request-${item.id}-resumeTemplate`)}><option>Minimal</option><option>Modern</option><option>Professional</option></select><FieldError id={`admin-request-${item.id}-resumeTemplate-error`} error={errors[`request-${item.id}-resumeTemplate`]} /></label>
            <div className="form-group full"><button className="button button-primary" type="submit">Save request</button></div>
          </form>
        </details>
      </article>)}</div>)}
    {tab === "messages" && (!messages.length ? <div className="card admin-empty"><h3>No contact messages</h3><p>New messages from the contact form will appear here.</p></div> :
      <div className="admin-request-list">{messages.map((message) => <article className="card admin-request" key={message.id}>
        <div className="admin-request-header"><div><h3>{message.subject}</h3><a href={`mailto:${message.email}`}>{message.name} · {message.email}</a><span>{new Date(message.createdAt).toLocaleString()}</span></div><button className="button button-secondary" type="button" onClick={() => removeMessage(message.id)}>Delete</button></div>
        <p className="contact-message-body">{message.message}</p>
        <details className="admin-edit-details">
          <summary>Edit message</summary>
          <form className="form-grid" onSubmit={(event) => void saveMessage(event, message.id)} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
            <label className="form-group">Name<input className="form-field" name="name" defaultValue={message.name} required minLength={2} maxLength={100} {...validationProps(`message-${message.id}-name`)} /><FieldError id={`admin-message-${message.id}-name-error`} error={errors[`message-${message.id}-name`]} /></label>
            <label className="form-group">Email<input className="form-field" name="email" type="email" defaultValue={message.email} required maxLength={254} {...validationProps(`message-${message.id}-email`)} /><FieldError id={`admin-message-${message.id}-email-error`} error={errors[`message-${message.id}-email`]} /></label>
            <label className="form-group full">Subject<input className="form-field" name="subject" defaultValue={message.subject} required minLength={2} maxLength={150} {...validationProps(`message-${message.id}-subject`)} /><FieldError id={`admin-message-${message.id}-subject-error`} error={errors[`message-${message.id}-subject`]} /></label>
            <label className="form-group full">Message<textarea className="form-field" name="message" defaultValue={message.message} required minLength={10} maxLength={3000} {...validationProps(`message-${message.id}-body`)} /><FieldError id={`admin-message-${message.id}-body-error`} error={errors[`message-${message.id}-body`]} /></label>
            <div className="form-group full"><button className="button button-primary" type="submit">Save message</button></div>
          </form>
        </details>
      </article>)}</div>)}
    {tab === "users" && <section className="card admin-table-wrap"><h3>User accounts</h3>
      <details className="admin-edit-details">
        <summary>Add user account</summary>
        <form className="form-grid" onSubmit={(event) => void addUser(event)} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
          <label className="form-group">Name<input className="form-field" name="name" required minLength={2} maxLength={100} {...validationProps("new-user-name")} /><FieldError id="admin-new-user-name-error" error={errors["new-user-name"]} /></label>
          <label className="form-group">Email<input className="form-field" name="email" type="email" required maxLength={254} {...validationProps("new-user-email")} /><FieldError id="admin-new-user-email-error" error={errors["new-user-email"]} /></label>
          <label className="form-group">Temporary password<input className="form-field" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" {...validationProps("new-user-password")} /><FieldError id="admin-new-user-password-error" error={errors["new-user-password"]} /></label>
          <label className="form-group">Plan<select className="form-field" name="plan" defaultValue="Free">{content.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
          <div className="form-group full"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creating..." : "Create account"}</button></div>
        </form>
      </details>
      {!users.length ? <p className="muted">No accounts have registered yet.</p> : <div className="admin-user-list">{users.map((user) => <article className="admin-user-row" key={user.id}>
        <div><strong>{user.name}</strong><a href={`mailto:${user.email}`}>{user.email}</a><small>{user.resumeCount} resume requests · joined {new Date(user.createdAt).toLocaleDateString()}</small></div>
        <div className="admin-user-actions">
          <label><span className="sr-only">Plan for {user.name}</span><select className="form-field admin-status" value={user.plan} onChange={(event) => {
            if (isAccountPlan(event.target.value)) void updatePlan(user.id, event.target.value);
          }}>{content.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
          <button className="button button-secondary button-small" type="button" onClick={() => void removeUser(user)}>Delete</button>
          <details className="admin-edit-details">
            <summary>Edit</summary>
            <form className="form-grid" onSubmit={(event) => void saveUser(event, user)} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
              <label className="form-group">Name<input className="form-field" name="name" defaultValue={user.name} required minLength={2} maxLength={100} {...validationProps(`user-${user.id}-name`)} /><FieldError id={`admin-user-${user.id}-name-error`} error={errors[`user-${user.id}-name`]} /></label>
              <label className="form-group">Email<input className="form-field" name="email" type="email" defaultValue={user.email} required maxLength={254} {...validationProps(`user-${user.id}-email`)} /><FieldError id={`admin-user-${user.id}-email-error`} error={errors[`user-${user.id}-email`]} /></label>
              <div className="form-group full"><button className="button button-primary" type="submit">Save account</button></div>
            </form>
          </details>
        </div>
      </article>)}</div>}
      <p className="field-hint">Plan changes are manual; online payment and checkout are not enabled.</p>
    </section>}
    {tab === "content" && <SiteContentEditor initialContent={content} onSave={saveContent} />}
    {tab === "settings" && <>
      <TwoFactorSettings scope="admin" />
      <section className="card admin-settings">
      <div><h3>n8n webhook</h3><p>Resume requests and attached files are sent to this URL using POST multipart form data. The shared secret is sent in the <code>X-Webhook-Secret</code> header. The secret is never returned to the browser.</p></div>
      <form className="admin-webhook-form" onSubmit={saveSettings} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
        <label className="sr-only" htmlFor="admin-webhook">Webhook URL</label>
        <div className="form-group admin-webhook-field">
          <input className="form-field" id="admin-webhook" name="webhookUrl" type="url" placeholder="https://example.com/webhook/..." value={webhookUrl} required maxLength={2048} onChange={(event) => setWebhookUrl(event.target.value)} aria-invalid={Boolean(errors.webhookUrl)} aria-describedby={errors.webhookUrl ? "admin-webhook-error" : undefined} />
          <FieldError id="admin-webhook-error" error={errors.webhookUrl} />
        </div>
        <label className="sr-only" htmlFor="admin-webhook-secret">Webhook secret</label>
        <div className="form-group admin-webhook-field">
          <input className="form-field" id="admin-webhook-secret" name="webhookSecret" type="password" autoComplete="new-password" placeholder={webhookSecretConfigured ? "Saved — enter a new secret to rotate" : "At least 32 characters"} value={webhookSecret} required={!webhookSecretConfigured} minLength={32} maxLength={512} onChange={(event) => setWebhookSecret(event.target.value)} aria-invalid={Boolean(errors.webhookSecret)} aria-describedby={errors.webhookSecret ? "admin-webhook-secret-error" : undefined} />
          <FieldError id="admin-webhook-secret-error" error={errors.webhookSecret} />
        </div>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save settings"}</button>
      </form>
      <p className="field-hint">{webhookSecretConfigured ? "A webhook secret is configured." : "A 32-character minimum secret is required before users can submit."} Set the same secret in n8n as the X-Webhook-Secret header.</p>
      {webhookSecretConfigured && <button className="button button-secondary button-small" type="button" onClick={() => void clearWebhookSecret()} disabled={busy}>Remove webhook secret</button>}
      </section>
    </>}
  </div>;
}
