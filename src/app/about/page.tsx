import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/button-link";
import { getSiteContent } from "@/lib/resume-store";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading about page" />}>
    <AboutContent />
  </Suspense>;
}

async function AboutContent() {
  await connection();
  const { about } = await getSiteContent();
  return <>
    <header className="page-hero container"><span className="eyebrow">{about.eyebrow}</span><h1 className="heading">{about.title}</h1><p className="subheading">{about.description}</p></header>
    <section className="section" style={{ paddingTop: 30 }}>
      <div className="container story-grid">
        <div className="story-art"><div className="story-card"><span className="feature-icon">✦</span><blockquote>“{about.quote}”</blockquote></div></div>
        <div><span className="eyebrow">{about.storyEyebrow}</span><h2 className="heading">{about.storyTitle}</h2><p className="subheading">{about.story}</p><ButtonLink href="/build" variant="secondary" className="mt-6">Build Resume</ButtonLink></div>
      </div>
    </section>
  </>;
}
