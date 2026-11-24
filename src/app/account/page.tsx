import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountActions } from "@/components/account/account-actions";
import { ProfileSettings } from "@/components/account/profile-settings";
import { ResumeActions } from "@/components/account/resume-actions";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import { getGeneratedResumes, getResumeRequests, getSiteContent } from "@/lib/resume-store";
import { getCurrentUser } from "@/lib/user-auth";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading account" />}>
    <AccountPageContent />
  </Suspense>;
}

async function AccountPageContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const [requests, resumes, content] = await Promise.all([
    getResumeRequests(user.id),
    getGeneratedResumes(),
    getSiteContent(),
  ]);
  const planName = content.plans.find((plan) => plan.id === user.plan)?.name ?? user.plan;
  return <section className="container account-page">
    <header className="account-heading">
      <div><span className="eyebrow">Your workspace</span><h1 className="heading">Welcome back, {user.name}.</h1><p className="subheading">{user.email}</p></div>
      <AccountActions />
    </header>
    <div className="account-summary">
      <article className="card account-stat"><span>Current plan</span><strong>{planName}</strong>{user.planExpiresAt && <small>Active until {new Date(user.planExpiresAt).toLocaleDateString()} · renew manually</small>}<Link href="/pricing">View plans</Link></article>
      <article className="card account-stat"><span>Resume requests</span><strong>{user.resumeCount}</strong><small>Used so far</small></article>
      <Link className="card account-build-card" href="/build"><span className="feature-icon">+</span><strong>Build a resume</strong><small>Share your career information</small></Link>
    </div>
    <ProfileSettings name={user.name} email={user.email} />
    <TwoFactorSettings scope="user" />
    <div className="account-requests-heading"><h2>Your resumes</h2><span>{resumes.length} total</span></div>
    {!resumes.length ? <div className="card admin-empty account-empty"><h3>No completed resumes yet</h3><p>Your generated resumes will appear here after the resume workflow uploads them.</p></div> :
      <div className="admin-request-list account-resume-list">{resumes.map((resume) => <article className="card account-request" key={resume.id}>
        <div><span className="request-status status-completed">Ready</span><h3>{resume.fileName}</h3><p>Created {new Date(resume.createdAt).toLocaleDateString()}</p></div>
        <ResumeActions id={resume.id} requestId={resume.requestId} contentType={resume.contentType} />
      </article>)}</div>}
    <div className="account-requests-heading"><h2>Your resume requests</h2><span>{requests.length} total</span></div>
    {!requests.length ? <div className="card admin-empty"><h3>No resume requests yet</h3><p>Start by sharing your career experience.</p><Link className="button button-primary" href="/build">Build Resume</Link></div> :
      <div className="admin-request-list">{requests.map((item) => <article className="card account-request" key={item.id}>
        <div><span className={`request-status status-${item.status}`}>{item.status.replace("-", " ")}</span><h3>{item.targetRole}</h3><p>Submitted {new Date(item.createdAt).toLocaleDateString()}</p></div>
        <span className="account-request-name">{item.name}</span>
      </article>)}</div>}
  </section>;
}
