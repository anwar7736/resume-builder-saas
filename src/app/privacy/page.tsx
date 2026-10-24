import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getSiteContent } from "@/lib/resume-store";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading privacy policy" />}>
    <PrivacyContent />
  </Suspense>;
}

async function PrivacyContent() {
  await connection();
  const { legal } = await getSiteContent();
  return <>
    <header className="page-hero container"><span className="eyebrow">Privacy</span><h1 className="heading">{legal.privacyTitle}</h1><p className="subheading">{legal.privacyDescription}</p></header>
    <article className="container legal-copy">{legal.privacySections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}<p className="pricing-note">Have qualified counsel review this policy for your service and jurisdiction before production.</p></article>
  </>;
}
