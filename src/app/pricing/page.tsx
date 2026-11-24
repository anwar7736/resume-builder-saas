import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { PricingCards } from "@/components/ui/pricing-cards";
import { PaymentStatusNotice } from "@/components/ui/payment-status-notice";
import { getCurrentUser } from "@/lib/user-auth";
import { getCheckoutPlans, getSiteContent } from "@/lib/resume-store";

export const metadata: Metadata = { title: "Plans" };

export default function PricingPage() {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading plans" />}>
    <PricingContent />
  </Suspense>;
}

async function PricingContent() {
  await connection();
  const [content, user, checkoutPlans] = await Promise.all([
    getSiteContent(),
    getCurrentUser(),
    getCheckoutPlans(),
  ]);
  return <>
    <PaymentStatusNotice />
    <header className="page-hero container"><span className="eyebrow">{content.home.plansEyebrow}</span><h1 className="heading">{content.home.plansTitle}</h1><p className="subheading">{content.home.plansDescription}</p></header>
    <section className="container" style={{ paddingBottom: 105 }}><PricingCards plans={content.plans} currentPlan={user?.plan} currentPlanExpiresAt={user?.planExpiresAt} authenticated={Boolean(user)} checkoutPlans={checkoutPlans} /><p className="pricing-disclaimer">{content.home.plansDisclaimer}</p></section>
  </>;
}
