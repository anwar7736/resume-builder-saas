import type { Metadata } from "next";
import { Clock3, MessageCircle, MapPin } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the ResumeCraft AI team. The contact form is a frontend demonstration and does not deliver messages yet.",
};

export default function ContactPage() {
  return <>
    <header className="page-hero container"><span className="eyebrow">We’d love to hear from you</span><h1 className="heading">Let’s start a conversation.</h1><p className="subheading">Have a question or an idea? Use the form to draft a message. Message delivery is not available until a backend is integrated.</p></header>
    <section className="container" style={{ paddingBottom: 105 }}><div className="contact-grid">
      <div className="contact-details">
        <div className="contact-detail"><MessageCircle size={18} /><span><strong style={{ color: "var(--foreground)" }}>General inquiries</strong><br />Please use the form on this page. No support email is available yet.</span></div>
        <div className="contact-detail"><Clock3 size={18} /><span><strong style={{ color: "var(--foreground)" }}>Response times</strong><br />A response workflow has not been set up yet.</span></div>
        <div className="contact-detail"><MapPin size={18} /><span><strong style={{ color: "var(--foreground)" }}>Where we are</strong><br />Location details have not been published.</span></div>
        <div className="pricing-note">This form runs only in your browser. Submitting it does not send, store, or transmit your information.</div>
      </div>
      <ContactForm />
    </div></section>
  </>;
}
