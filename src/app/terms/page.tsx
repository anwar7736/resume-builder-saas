import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/resume-store";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading terms" />}>
    <TermsContent />
  </Suspense>;
}

async function TermsContent() {
  await connection();
  const { legal } = await getSiteContent();
  return <>
    <header className="page-hero container"><span className="eyebrow">Terms</span><h1 className="heading">{legal.termsTitle}</h1><p className="subheading">{legal.termsDescription}</p></header>
    <article className="container legal-copy">{legal.termsSections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}<p className="pricing-note">Have qualified counsel review and tailor these terms before offering the service to users.</p></article>
  </>;
}
