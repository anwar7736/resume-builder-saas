"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MessageCircle, MessagesSquare, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ContactOptions = {
  phone: string;
  whatsapp: string;
  facebook: string;
  messenger: string;
  email: string;
  supportAvatar: string;
};

function isContactOptions(value: unknown): value is ContactOptions {
  return typeof value === "object" && value !== null &&
    ["phone", "whatsapp", "facebook", "messenger", "email", "supportAvatar"].every((key) =>
      key in value && typeof (value as Record<string, unknown>)[key] === "string");
}

function externalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<ContactOptions | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    fetch("/api/site-content").then(async (response) => {
      if (!response.ok) throw new Error("Unable to load support contacts.");
      const data: unknown = await response.json();
      if (typeof data === "object" && data !== null && "contact" in data && isContactOptions(data.contact)) {
        setContact(data.contact);
      }
    }).catch((error: unknown) => console.error("Unable to load support contacts.", error));
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onMouseDown = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    widgetRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);
  const phone = contact?.phone.trim() ?? "";
  const whatsapp = contact?.whatsapp.trim() ?? "";
  const facebook = externalUrl(contact?.facebook.trim() ?? "");
  const messengerValue = contact?.messenger.trim() ?? "";
  const messenger = externalUrl(messengerValue) || (messengerValue && !messengerValue.includes("/") ? `https://m.me/${encodeURIComponent(messengerValue)}` : "");
  const email = contact?.email.trim() ?? "";
  const avatar = contact?.supportAvatar || "/support-avatar.jpg";
  const whatsappHref = externalUrl(whatsapp) || (whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : "");
  const options = [
    ...(phone ? [{ label: "Call me", description: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}`, icon: <Phone size={20} />, className: "support-option-phone" }] : []),
    ...(whatsappHref ? [{ label: "WhatsApp", description: "Chat on WhatsApp", href: whatsappHref, icon: <MessageCircle size={20} />, className: "support-option-whatsapp" }] : []),
    ...(messenger ? [{ label: "Messenger", description: "Message on Facebook", href: messenger, icon: <MessagesSquare size={20} />, className: "support-option-messenger" }] : []),
    ...(facebook ? [{ label: "Facebook", description: "Visit us on Facebook", href: facebook, icon: <span className="support-facebook-glyph" aria-hidden="true">f</span>, className: "support-option-facebook" }] : []),
    ...(email ? [{ label: "Email us", description: email, href: `mailto:${email}`, icon: <Mail size={20} />, className: "support-option-email" }] : []),
  ];

  return <div className="support-widget" ref={widgetRef}>
    <section className={`support-panel${open ? " is-open" : ""}`} id="support-contact-panel" aria-labelledby="support-contact-title" aria-hidden={!open}>
      <header className="support-panel-header">
        <h2 id="support-contact-title">Get in touch</h2>
        <button className="support-close" type="button" aria-label="Close contact options" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}><X size={17} /></button>
      </header>
      <div className="support-contact-list">
        {options.map((item) => <a className={`support-contact-link ${item.className}`} href={item.href} key={item.label} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
          <span className="support-contact-icon" aria-hidden="true">{item.icon}</span>
          <span className="support-contact-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
        </a>)}
        <Link className="support-contact-link support-option-chat" href="/contact" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
          <span className="support-contact-icon" aria-hidden="true"><MessagesSquare size={20} /></span>
          <span className="support-contact-copy"><strong>Contact form</strong><small>Send us a message</small></span>
        </Link>
      </div>
    </section>
    <button className="support-button" ref={triggerRef} type="button" aria-label={open ? "Close contact options" : "Open contact options"} aria-expanded={open} aria-controls="support-contact-panel" onClick={() => setOpen((value) => !value)}>
      <span className="support-avatar"><Image src={avatar} alt="" width={64} height={64} loading="eager" unoptimized /></span>
      <span className="support-online-indicator" aria-label="Available" />
    </button>
  </div>;
}
