import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use Draft",
  description: "Draft terms placeholder for ResumeCraft AI. This document is not legally reviewed or ready for production use.",
};

export default function TermsPage() {
  return <>
    <header className="page-hero container"><span className="eyebrow">Draft placeholder</span><h1 className="heading">Terms of use</h1><p className="subheading">This draft is for planning purposes only. It has not been legally reviewed and is not ready to govern a production service.</p></header>
    <article className="container legal-copy">
      <div className="pricing-note"><strong>Important:</strong> This placeholder is not a contract or legal advice. Complete and review terms for the actual service before launch.</div>
      <h2>About this demonstration</h2><p>ResumeCraft AI is a frontend-only product demonstration. Resume creation, account registration, file export, payment, and account services are not currently available.</p>
      <h2>Proposed plans and features</h2><p>Plan names, prices, and features shown on the website are illustrative proposals. No subscription, purchase, or payment agreement can be made through this site.</p>
      <h2>Intellectual property and permitted use</h2><p>Terms covering the website, templates, user materials, licenses, acceptable use, and third-party rights must be drafted to match the final product and its intended operation.</p>
      <h2>Disclaimers and liability</h2><p>Any warranty disclaimers, service availability terms, limitations of liability, and consumer protections require qualified legal review appropriate to applicable law.</p>
      <h2>Governing terms and contact</h2><p>The responsible legal entity, effective date, governing law, dispute process, and valid contact details have not been established for this draft.</p>
      <h2>Review required</h2><p>Replace this page with complete terms reviewed by qualified counsel before offering the service to users.</p>
    </article>
  </>;
}
