import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ResumeRequestForm } from "@/components/resume/resume-request-form";
import { getSiteContent } from "@/lib/resume-store";
import { getCurrentUser } from "@/lib/user-auth";

export const metadata: Metadata = { title: "Build Resume" };

export default function BuildPage() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading resume builder" />}>
    <BuildPageContent />
  </Suspense>;
}

async function BuildPageContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/build");
  const content = await getSiteContent();
  const plan = content.plans.find((item) => item.id === user.plan);
  const limit = plan?.resumeLimit ?? null;
  if (limit !== null && user.resumeCount >= limit) {
    return <section className="container build-page"><div className="card plan-limit-card">
      <span className="eyebrow">{plan?.name ?? user.plan} plan</span><h1 className="heading">You’ve reached your resume limit.</h1>
      <p className="subheading">Your plan includes {limit} resume {limit === 1 ? "request" : "requests"}. Contact our team to request a plan change.</p>
      <a className="button button-primary" href="/pricing">View plans</a>
    </div></section>;
  }
  return <>
    <header className="page-hero container"><span className="eyebrow">{plan?.name ?? user.plan} plan · {limit === null ? "Unlimited requests" : `${Math.max(0, limit - user.resumeCount)} request${limit - user.resumeCount === 1 ? "" : "s"} remaining`}</span><h1 className="heading">Build your resume.</h1><p className="subheading">Share your experience and the role you’re aiming for. You can track your request from your account.</p></header>
    <section className="container resume-form-section"><ResumeRequestForm name={user.name} email={user.email} /></section>
  </>;
}
