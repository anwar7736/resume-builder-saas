import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy Draft",
  description: "Draft privacy placeholder for ResumeCraft AI. This document is not legally reviewed or ready for production use.",
};

export default function PrivacyPage() {
  return <>
    <header className="page-hero container"><span className="eyebrow">Draft placeholder</span><h1 className="heading">Privacy policy</h1><p className="subheading">This draft is provided for planning only. It is not legal advice, has not been reviewed by counsel, and is not ready for production use.</p></header>
    <article className="container legal-copy">
      <div className="pricing-note"><strong>Important:</strong> This page must be replaced with a complete, jurisdiction-appropriate privacy policy before collecting personal information.</div>
      <h2>Information and this prototype</h2><p>ResumeCraft AI is currently a frontend demonstration. This website does not provide user accounts, resume storage, analytics, or a message-delivery backend. The contact form does not transmit or save submitted information.</p>
      <h2>Future product services</h2><p>Before any services that collect, use, or store personal information are introduced, the operator should explain what information is collected, the purposes and legal bases for processing, retention periods, service providers, international transfers, and applicable user rights.</p>
      <h2>Cookies and similar technologies</h2><p>This draft makes no claims about future cookie or tracking practices. Any such technologies and user choices must be documented before they are enabled.</p>
      <h2>Children and contact</h2><p>Age-related practices and a verified contact channel should be established and accurately documented before launch. No support email or data controller contact is published here.</p>
      <h2>Review required</h2><p>Have qualified counsel review and tailor this page to the actual product, operations, applicable jurisdictions, and implemented data practices before publication.</p>
    </article>
  </>;
}
