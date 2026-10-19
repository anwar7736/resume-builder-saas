import { ArrowRight, Check, Clock3, FileCheck2, LayoutTemplate, PenLine, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { FAQAccordion } from "@/components/home/faq-accordion";
import { HeroResume } from "@/components/home/resume-preview";
import { PricingCard } from "@/components/home/pricing-card";
import { TemplateCard } from "@/components/home/template-card";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { plans, templates } from "@/lib/site-data";

const features = [
  { icon: FileCheck2, title: "ATS-friendly layouts", text: "Clear, structured templates designed to keep your experience easy to read." },
  { icon: Sparkles, title: "AI-assisted writing", text: "Writing guidance is on our roadmap to help you find the right words for your strengths." },
  { icon: LayoutTemplate, title: "Professional templates", text: "Choose a considered design that suits your industry and personal style." },
  { icon: PenLine, title: "Easy to customize", text: "Make each section your own, from your opening summary to the details that set you apart." },
  { icon: FileCheck2, title: "PDF export, planned", text: "Downloadable resume exports are a planned feature; they are not available yet." },
  { icon: Clock3, title: "A simpler workflow", text: "Bring the important pieces together in one focused place, without starting from a blank page." },
];

const testimonials = [
  { quote: "I finally have a resume layout that feels organized without feeling like everyone else's.", name: "Jordan Lee", role: "Sample product designer", initials: "JL" },
  { quote: "The template ideas made it easier to see how I could tell my career story more clearly.", name: "Sam Rivera", role: "Sample career changer", initials: "SR" },
  { quote: "Clean, thoughtful, and refreshingly focused on what matters: the experience I bring.", name: "Taylor Kim", role: "Sample software engineer", initials: "TK" },
];

export default function Home() {
  return <>
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Your next chapter starts here</span>
          <h1>Build a Resume That <span>Gets You Hired.</span></h1>
          <p>Turn your experience into a clear, professional resume with thoughtful templates designed to help you stand out and get noticed.</p>
          <div className="hero-actions"><ButtonLink href="/templates">Build My Resume <ArrowRight size={16} /></ButtonLink><ButtonLink href="/templates" variant="secondary">Explore Templates</ButtonLink></div>
          <div className="hero-note"><Check size={15} /> Designed for clarity. Made for your next move.</div>
        </div>
        <HeroResume />
      </div>
    </section>
    <section className="trust">
      <div className="container trust-row">
        <div className="trust-label">A few ideas behind the experience — illustrative, not customer or company metrics.</div>
        <div className="trust-stat">6<small>distinct template directions</small></div>
        <div className="trust-stat">3<small>steps to shape your story</small></div>
        <div className="trust-stat">Your story<small>always at the center</small></div>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <SectionHeading eyebrow="A better way to begin" title="The essentials for a more confident application" description="Every detail is designed to make resume building feel a little more clear, considered, and approachable." />
        <div className="grid-3">{features.map((feature) => <article className="card feature-card" key={feature.title}><span className="feature-icon"><feature.icon size={20} /></span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
      </div>
    </section>
    <section className="section soft-section">
      <div className="container">
        <SectionHeading eyebrow="How it works" title="A few simple steps to a stronger story" description="Start with the essentials. Shape the details. Make it yours." />
        <div className="steps">
          <article className="step"><span className="step-number">01 — CHOOSE</span><h3>Choose a template</h3><p>Find a layout that suits your field, your experience, and the way you want to show up.</p></article>
          <article className="step"><span className="step-number">02 — PERSONALIZE</span><h3>Add your experience</h3><p>Bring together your roles, projects, education, and the strengths behind your work.</p></article>
          <article className="step"><span className="step-number">03 — GET READY</span><h3>Prepare your resume</h3><p>Review your story and get ready for the opportunities ahead. Editing and export tools are coming soon.</p></article>
        </div>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, flexWrap: "wrap" }}>
          <SectionHeading eyebrow="Made to make an impression" title="A template for every next step" description="Start with one of our distinct, carefully composed resume styles." />
          <Link href="/templates" style={{ display: "inline-flex", gap: 7, alignItems: "center", color: "var(--purple)", fontSize: 13, fontWeight: 650, marginBottom: 48 }}>View all templates <ArrowRight size={15} /></Link>
        </div>
        <div className="grid-3">{templates.slice(0, 3).map((template) => <TemplateCard key={template.name} template={template} />)}</div>
      </div>
    </section>
    <section className="section soft-section">
      <div className="container">
        <SectionHeading eyebrow="Straightforward options" title="Start free. Grow when you’re ready." description="An early look at the plans we're considering. Features and pricing are proposed and are not yet enforced." />
        <div className="grid-3">{plans.map((plan) => <PricingCard key={plan.name} plan={plan} />)}</div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, marginTop: 20 }}>Proposed plans only — no checkout or subscriptions are currently available.</p>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <SectionHeading eyebrow="A little inspiration" title="Stories we hope to help you tell" description="These fictional examples illustrate the kind of feedback we aspire to earn. They are not real customer reviews." centered />
        <div className="grid-3">{testimonials.map((item) => <article className="card testimonial" key={item.name}><span className="sample-label">Fictional sample</span><p>“{item.quote}”</p><div className="person"><span className="avatar">{item.initials}</span><span><strong>{item.name}</strong><small>{item.role}</small></span></div></article>)}</div>
      </div>
    </section>
    <section className="section soft-section">
      <div className="container">
        <SectionHeading eyebrow="Good to know" title="A few questions, answered" description="What to expect from ResumeCraft AI as we build the next steps." />
        <FAQAccordion />
      </div>
    </section>
    <section className="section">
      <div className="container"><div className="cta-band">
        <span className="eyebrow" style={{ color: "#b7afff" }}>Your experience deserves a great introduction</span>
        <h2 className="heading">Ready for your next chapter?</h2>
        <p>Explore the templates and imagine what your story could look like. Resume creation tools are coming soon.</p>
        <ButtonLink href="/templates" variant="secondary">Explore templates <WandSparkles size={16} /></ButtonLink>
      </div></div>
    </section>
  </>;
}
