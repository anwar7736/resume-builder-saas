import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, Check, FileText, Mail, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { getCheckoutPlans, getSiteContent } from "@/lib/resume-store";
import { getCurrentUser } from "@/lib/user-auth";
import { PricingCards } from "@/components/ui/pricing-cards";

export default function Home() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading site content" />}>
    <HomeContent />
  </Suspense>;
}

async function HomeContent() {
  await connection();
  const [content, checkoutPlans, user] = await Promise.all([
    getSiteContent(),
    getCheckoutPlans(),
    getCurrentUser(),
  ]);
  const icons = { FileText, Sparkles, ShieldCheck };
  return <>
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">{content.home.eyebrow}</span>
          <h1>{content.home.title}</h1>
          <p>{content.home.description}</p>
          <div className="hero-actions">
            <ButtonLink href="/build">{content.home.primaryButton} <ArrowRight size={16} /></ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">{content.home.secondaryButton}</ButtonLink>
          </div>
          <div className="hero-note"><Check size={15} /> {content.home.heroNote}</div>
        </div>
        <div className="request-illustration" aria-hidden="true">
          <div className="request-illustration-glow" />
          <div className="request-document"><span className="document-icon"><FileText size={21} /></span><strong>Your career story</strong><span>Experience, skills, and goals</span><i /><i /><i /><div><Sparkles size={17} /> Ready for your next step</div></div>
          <div className="request-badge"><Mail size={17} /><span><strong>Your next opportunity</strong><small>Starts with your story</small></span></div>
        </div>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <div className="section-heading"><span className="eyebrow">{content.features.eyebrow}</span><h2 className="heading">{content.features.title}</h2><p className="subheading">{content.features.description}</p></div>
        <div className="grid-3">{content.features.items.map((feature) => {
          const Icon = icons[feature.icon as keyof typeof icons] || FileText;
          return <article className="card feature-card" key={feature.title}><span className="feature-icon"><Icon size={20} /></span><h3>{feature.title}</h3><p>{feature.description}</p></article>;
        })}</div>
      </div>
    </section>
    <section className="section soft-section">
      <div className="container">
        <div className="section-heading"><span className="eyebrow">{content.home.processEyebrow}</span><h2 className="heading">{content.home.processTitle}</h2><p className="subheading">{content.home.processDescription}</p></div>
        <div className="steps">{content.home.steps.map((step, index) => <article className="step" key={step.title}><span className="step-number">0{index + 1} — STEP</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <div className="section-heading"><span className="eyebrow">{content.home.plansEyebrow}</span><h2 className="heading">{content.home.plansTitle}</h2><p className="subheading">{content.home.plansDescription}</p></div>
        <PricingCards plans={content.plans} currentPlan={user?.plan} currentPlanExpiresAt={user?.planExpiresAt} authenticated={Boolean(user)} checkoutPlans={checkoutPlans} />
      </div>
    </section>
    {content.faqs.length > 0 && <section className="section soft-section">
      <div className="container">
        <div className="section-heading"><span className="eyebrow">Good to know</span><h2 className="heading">{content.home.faqTitle}</h2></div>
        <div className="faq-list">{content.faqs.map((faq) => <details className="faq-item" key={faq.question}><summary className="faq-question">{faq.question}<span aria-hidden="true">+</span></summary><p className="faq-answer">{faq.answer}</p></details>)}</div>
      </div>
    </section>}
    <section className="section">
      <div className="container"><div className="cta-band">
        <span className="eyebrow" style={{ color: "#c9c0ff" }}>{content.home.ctaEyebrow}</span>
        <h2 className="heading">{content.home.ctaTitle}</h2>
        <p>{content.home.ctaDescription}</p>
        <ButtonLink href="/build" variant="secondary">{content.home.primaryButton} <WandSparkles size={16} /></ButtonLink>
      </div></div>
    </section>
  </>;
}
