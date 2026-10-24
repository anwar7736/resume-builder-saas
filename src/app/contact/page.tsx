import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Clock3, MessageCircle, MapPin } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { getSiteContent } from "@/lib/resume-store";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the ResumeCraft AI team.",
};

export default function ContactPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  return <Suspense fallback={<main className="content-loading" aria-label="Loading contact information" />}>
    <ContactContent searchParams={searchParams} />
  </Suspense>;
}

async function ContactContent({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  await connection();
  const { contact } = await getSiteContent();
  const { plan } = await searchParams;
  const defaultSubject = plan === "Premium" || plan === "Platinum" ? `Plan upgrade request: ${plan}` : "";
  return <>
    <header className="page-hero container"><span className="eyebrow">{contact.eyebrow}</span><h1 className="heading">{contact.title}</h1><p className="subheading">{contact.description}</p></header>
    <section className="container" style={{ paddingBottom: 105 }}><div className="contact-grid">
      <div className="contact-details">
        <div className="contact-detail"><MessageCircle size={18} /><span><strong style={{ color: "var(--foreground)" }}>{contact.inquiriesTitle}</strong><br />{contact.inquiriesText}</span></div>
        {contact.phone && <div className="contact-detail"><Clock3 size={18} /><span><strong style={{ color: "var(--foreground)" }}>Phone</strong><br /><a href={`tel:${contact.phone}`}>{contact.phone}</a></span></div>}
        {contact.email && <div className="contact-detail"><MessageCircle size={18} /><span><strong style={{ color: "var(--foreground)" }}>Email</strong><br /><a href={`mailto:${contact.email}`}>{contact.email}</a></span></div>}
        <div className="contact-detail"><Clock3 size={18} /><span><strong style={{ color: "var(--foreground)" }}>{contact.responseTitle}</strong><br />{contact.responseText}</span></div>
        <div className="contact-detail"><MapPin size={18} /><span><strong style={{ color: "var(--foreground)" }}>{contact.locationTitle}</strong><br />{contact.locationText}</span></div>
        <div className="pricing-note">For a resume request, please use <a href="/build">Build Resume</a>.</div>
      </div>
      <ContactForm title={contact.formTitle} description={contact.formDescription} submitLabel={contact.formSubmit} successMessage={contact.formSuccess} defaultSubject={defaultSubject} />
    </div></section>
  </>;
}
