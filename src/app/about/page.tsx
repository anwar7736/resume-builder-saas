import type { Metadata } from "next";
import { Heart, Lightbulb, Target } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about ResumeCraft AI's mission to make professional resume creation more accessible and approachable.",
};

export default function AboutPage() {
  return <>
    <header className="page-hero container"><span className="eyebrow">Our purpose</span><h1 className="heading">Your experience is worth a clear introduction.</h1><p className="subheading">We believe that creating a professional resume should feel accessible, thoughtful, and focused on what makes your story yours.</p></header>
    <section className="section" style={{ paddingTop: 30 }}>
      <div className="container story-grid">
        <div className="story-art"><div className="story-card"><Heart size={22} /><blockquote>“A resume is more than a list of roles. It’s the beginning of your next possibility.”</blockquote></div></div>
        <div><span className="eyebrow">The idea behind ResumeCraft AI</span><h2 className="heading">Make the process feel a little more human.</h2><p className="subheading">Job seekers bring a wealth of skills and experience to every opportunity. Yet turning that history into a clear, confident resume can be harder than it should be.</p><p className="subheading" style={{ marginTop: 15 }}>ResumeCraft AI aims to make professional resume creation more approachable with considered templates and, in the future, optional writing assistance. We’re building toward that mission one useful step at a time.</p><ButtonLink href="/templates" variant="secondary" className="mt-6">Explore our templates</ButtonLink></div>
      </div>
    </section>
    <section className="section soft-section"><div className="container"><div className="grid-3">
      <article className="card feature-card"><span className="feature-icon"><Target size={20} /></span><h3>Clarity first</h3><p>Layouts and guidance should help people communicate their value without adding clutter.</p></article>
      <article className="card feature-card"><span className="feature-icon"><Lightbulb size={20} /></span><h3>Accessible by design</h3><p>Everyone deserves a welcoming starting point for presenting their professional story.</p></article>
      <article className="card feature-card"><span className="feature-icon"><Heart size={20} /></span><h3>Honest progress</h3><p>We’ll be clear about what is available now and what is still being planned.</p></article>
    </div></div></section>
  </>;
}
