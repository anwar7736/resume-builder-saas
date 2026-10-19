import type { Metadata } from "next";
import { PricingOptions } from "@/components/pricing/pricing-options";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Explore proposed ResumeCraft AI plans. Pricing and plan features are illustrative and are not yet enforced by a backend.",
};

export default function PricingPage() {
  return <>
    <header className="page-hero container"><span className="eyebrow">Simple, transparent options</span><h1 className="heading">A plan for wherever you are.</h1><p className="subheading">These are proposed plan features to help you understand the product direction. Nothing is currently billed or enforced.</p></header>
    <section className="container" style={{ paddingBottom: 44 }}><div className="pricing-note"><strong>Important:</strong> Plans and pricing shown here are proposals only. There is no account system, billing, checkout, or subscription enforcement at this stage.</div></section>
    <section className="container" style={{ paddingBottom: 105 }}><PricingOptions /><p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 26 }}>No payment information is requested. Plan enrollment is not available yet.</p></section>
  </>;
}
