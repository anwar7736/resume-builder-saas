"use client";

import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";

const navLinks = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav-wrap">
      <div className="container nav">
        <Link className="brand" href="/" aria-label="ResumeCraft AI home" onClick={() => setOpen(false)}>
          <span className="brand-mark"><FileText size={18} strokeWidth={2.2} /></span>
          <span>ResumeCraft <span style={{ color: "var(--purple)" }}>AI</span></span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {navLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="nav-actions">
          <ButtonLink href="/login" variant="secondary" small>Sign in</ButtonLink>
          <ButtonLink href="/templates" small>Build my resume</ButtonLink>
        </div>
        <button className="mobile-toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && <nav className="mobile-menu" aria-label="Mobile navigation">
        {navLinks.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
        <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
        <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
        <ButtonLink href="/templates" onClick={() => setOpen(false)}>Build my resume</ButtonLink>
      </nav>}
    </header>
  );
}
