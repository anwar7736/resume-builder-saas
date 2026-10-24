"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/toast-provider";

export function ContactForm({ title, description, submitLabel, successMessage, defaultSubject = "" }: { title: string; description: string; submitLabel: string; successMessage: string; defaultSubject?: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to send your message.";
        toast.error(message);
        return;
      }
      form.reset();
      if (typeof result === "object" && result !== null && "emailSent" in result && result.emailSent === false &&
          "message" in result && typeof result.message === "string") {
        toast.info(result.message);
      } else {
        toast.success(successMessage);
      }
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <form className="card form-card" onSubmit={handleSubmit}>
    <h2 style={{ margin: "0 0 8px", fontSize: 19 }}>{title}</h2><p className="contact-form-description">{description}</p>
    <div className="form-grid">
      <div className="form-group"><label htmlFor="name">Name</label><input className="form-field" id="name" name="name" autoComplete="name" required maxLength={100} /></div>
      <div className="form-group"><label htmlFor="email">Email</label><input className="form-field" id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
      <div className="form-group full"><label htmlFor="subject">Subject</label><input className="form-field" id="subject" name="subject" defaultValue={defaultSubject} required maxLength={150} /></div>
      <div className="form-group full"><label htmlFor="message">Message</label><textarea className="form-field" id="message" name="message" required minLength={10} maxLength={3000} /></div>
      <div className="form-group full"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Sending..." : submitLabel}</button></div>
    </div>
  </form>;
}
